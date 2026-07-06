"""
run_pipeline_streaming.py — ARCA Streaming Pipeline
=====================================================
Routing starts as soon as the first page is extracted instead of waiting
for all pages to finish.

Thread layout:
  Producer  — Docling PDF load → page-by-page LLM extraction →
               bbox + deadline resolution → puts maps on a Queue
  Consumer  — RoutingAgent initialises while Producer loads the PDF,
               then routes each map the moment it arrives

Time saved: (n_pages - 1) × per_page_routing_time  (routing overlaps extraction)

Usage:
  python backend/run_pipeline_streaming.py --pdf backend/circulars/circular.pdf
  python backend/run_pipeline_streaming.py --pdf backend/circulars/circular.pdf --model qwen2.5:7b --workers 4
"""

import sys, os, re, json, time, queue, shutil, threading
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

BACKEND_DIR   = os.path.abspath(os.path.dirname(__file__))
MAP_AGENT_DIR = os.path.join(BACKEND_DIR, "map_agent")
OUTPUTS_DIR   = os.path.join(BACKEND_DIR, "outputs")
os.makedirs(OUTPUTS_DIR, exist_ok=True)

sys.path.insert(0, BACKEND_DIR)
sys.path.insert(0, MAP_AGENT_DIR)

from extract import (
    buildingPages, extractMetadata, extractDeadlineContext,
    reconstructingbbox, resolveDeadlines,
)
import ollama as _ollama
from routing_agent.routing_agent import RoutingAgent

# ── Extraction helpers ────────────────────────────────────────────────────────

_SYSTEM = ("You are a regulatory compliance expert. Extract obligations from RBI "
           "circular text. Return ONLY valid JSON, nothing else.")

_PROMPT = """Extract the most important regulatory obligations from this RBI circular text.
Only extract MAJOR obligations — directives that require banks to implement a new process,
submit a report, or make a structural change. Consolidate related sub-bullets into one MAP.

Key dates/deadlines:
{deadline_context}

Return ONLY:
{{"maps":[{{"action":"...","deadline_raw":"...or null","clause_ref":"...or null","priority":"HIGH|MEDIUM|LOW"}}]}}

Text:
{text}"""


def _extract_one_page(page_no, pages, sorted_pages, deadline_context):
    i = sorted_pages.index(page_no)
    page_text = " ".join(x["text"] for x in pages[page_no])
    context   = ((" ".join(x["text"] for x in pages[sorted_pages[i-1]])[-200:] + " ")
                 if i > 0 else "") + page_text
    t0 = time.time()
    resp = _ollama.chat(
        model="gemma4:e4b",
        messages=[{"role": "system", "content": _SYSTEM},
                  {"role": "user",   "content": _PROMPT.format(
                      text=context, deadline_context=deadline_context)}],
        options={"temperature": 0},
    )
    raw = resp["message"]["content"].strip()
    try:
        from extract import _safe_parse_json
        result = _safe_parse_json(raw)
        maps = result.get("maps", []) if isinstance(result, dict) else []
    except (json.JSONDecodeError, Exception) as e:
        print(f"  [extract] page {page_no}: JSON parse failed: {e}. Raw: {raw[:200]}")
        maps = []
    for m in maps:
        m["page_no"] = page_no
    print(f"  [extract] page {page_no}: {time.time()-t0:.1f}s → {len(maps)} maps")
    return maps


def _circular_id_to_filename(cid):
    return re.sub(r'[/\\:*?"<>|]', "_", cid).strip("_") or "unknown_circular"


# ── Main streaming pipeline ───────────────────────────────────────────────────

def run_streaming_pipeline(pdf_path, ollama_model="qwen2.5:7b",
                           max_workers=4, output_json_path=None,
                           on_metadata_extracted=None, on_map_routed=None):
    t_total = time.time()

    map_q        = queue.Queue()   # producer → consumer
    agent_ready  = threading.Event()
    shared       = {}              # cross-thread state: "agent", "meta", "routed"
    errors       = {}

    # ── Producer thread ───────────────────────────────────────────────────────
    def producer():
        try:
            # Copy PDF so extract functions can find it
            target = os.path.join(MAP_AGENT_DIR, "circular.pdf")
            if os.path.abspath(pdf_path) != os.path.abspath(target):
                shutil.copy(pdf_path, target)

            # Docling setup (slow — runs concurrently with agent init)
            print("\n[extract] Loading PDF with Docling…")
            from extract import doclingSetup
            orig = os.getcwd()
            os.chdir(MAP_AGENT_DIR)
            try:
                doc = doclingSetup()
            finally:
                os.chdir(orig)

            pages  = buildingPages(doc)
            meta   = extractMetadata(pages)
            shared["meta"] = meta
            print(f"[extract] {meta.get('circular_id')} — {meta.get('circular_title')}")
            if on_metadata_extracted:
                on_metadata_extracted(meta)

            deadline_ctx  = extractDeadlineContext(pages)
            sorted_pages  = sorted(pages.keys())
            map_counter   = [0]
            all_maps      = []

            # Wait for routing agent before pushing maps (agent init is fast ~20s)
            agent_ready.wait()
            print("[extract] Agent ready — starting page extraction\n")

            for page_no in sorted_pages:
                page_maps = _extract_one_page(page_no, pages, sorted_pages, deadline_ctx)
                if not page_maps:
                    continue

                # bbox reconstruction (CPU, no LLM)
                page_maps = reconstructingbbox(page_maps, pages)

                # deadline resolution for this page's batch
                page_maps = resolveDeadlines(page_maps, meta, deadline_ctx, batch_size=5)

                # assign map IDs and default department
                for m in page_maps:
                    map_counter[0] += 1
                    m["map_id"]     = f"{meta['circular_id']}_MAP_{map_counter[0]:03d}"
                    m["department"] = "Unassigned"

                all_maps.extend(page_maps)

                # push to routing queue
                for m in page_maps:
                    map_q.put(m)

            shared["all_maps"] = all_maps
            map_q.put(None)   # sentinel
            print(f"\n[extract] Done — {len(all_maps)} maps sent to routing queue.")

        except Exception as e:
            errors["producer"] = e
            map_q.put(None)

    # ── Consumer thread ───────────────────────────────────────────────────────
    def consumer():
        try:
            print("[route ] Initialising RoutingAgent…")
            agent = RoutingAgent(ollama_model=ollama_model, circular_context=[])
            shared["agent"] = agent
            agent_ready.set()
            print("[route ] Ready — waiting for maps…\n")

            routed     = {}
            count      = [0]
            lock       = threading.Lock()
            in_flight  = {}

            def route_one(m):
                # inject circular context once metadata is available
                meta = shared.get("meta", {})
                if meta and not agent.llm.circular_context:
                    agent.llm.circular_context = [
                        x for x in [meta.get("circular_id",""),
                                     meta.get("circular_title","")] if x]
                res = agent.route_map(m)
                m.update({
                    "department":          res["assigned_department"],
                    "sub_vertical":        res.get("sub_vertical"),
                    "sub_vertical_scope":  res.get("sub_vertical_scope"),
                    "routing_confidence":  res["confidence"],
                    "routing_reasoning":   res["reasoning"],
                    "routing_source":      res["routing_source"],
                    "routing_flagged":     res.get("routing_flagged", False),
                    "proposed_candidates": res.get("proposed_candidates", []),
                    "routing_trace":       res.get("routing_trace", {}),
                })
                return m

            with ThreadPoolExecutor(max_workers=max_workers) as ex:
                while True:
                    item = map_q.get()

                    if item is None:
                        # sentinel — drain remaining futures
                        for f in as_completed(in_flight):
                            m = f.result()
                            routed[m["map_id"]] = m
                            with lock:
                                count[0] += 1
                                _log_routed(count[0], m)
                                if on_map_routed:
                                    on_map_routed(m)
                        break

                    # submit to thread pool
                    f = ex.submit(route_one, item)
                    in_flight[f] = item["map_id"]

                    # collect any already-done futures (non-blocking)
                    done = [f for f in list(in_flight) if f.done()]
                    for f in done:
                        m = f.result()
                        routed[m["map_id"]] = m
                        del in_flight[f]
                        with lock:
                            count[0] += 1
                            _log_routed(count[0], m)
                            if on_map_routed:
                                on_map_routed(m)

            shared["routed"] = routed
            print(f"\n[route ] Done — {len(routed)} maps routed.")

        except Exception as e:
            errors["consumer"] = e

    def _log_routed(n, m):
        print(f"  [route ] [{n:>3}] {m['department'][:26]:<26} "
              f"conf={m['routing_confidence']:>3}%  '{m['action'][:45]}'")

    # ── Launch ────────────────────────────────────────────────────────────────
    # Consumer first — agent init overlaps with Docling PDF loading
    tc = threading.Thread(target=consumer, name="Routing",    daemon=True)
    tp = threading.Thread(target=producer, name="Extraction", daemon=True)
    tc.start()
    tp.start()
    tp.join()
    tc.join()

    if errors:
        for who, err in errors.items():
            print(f"[ERROR] {who}: {err}")
        raise RuntimeError("Pipeline failed — see errors above.")

    # ── Assemble output ───────────────────────────────────────────────────────
    meta      = shared.get("meta", {})
    all_maps  = shared.get("all_maps", [])
    routed    = shared.get("routed", {})

    # Merge routing results back into ordered map list
    for m in all_maps:
        if m["map_id"] in routed:
            m.update(routed[m["map_id"]])

    dept_summary = defaultdict(int)
    sv_summary   = defaultdict(int)
    for m in all_maps:
        dept_summary[m["department"]] += 1
        if m.get("sub_vertical"):
            sv_summary[m["sub_vertical"]] += 1

    cid       = meta.get("circular_id", "")
    cid_fname = _circular_id_to_filename(cid) if cid else "arca_output"

    final = {
        "circular_id":          cid,
        "circular_date":        meta.get("circular_date"),
        "circular_title":       meta.get("circular_title"),
        "total_pages":          len(set(m["page_no"] for m in all_maps)),
        "total_maps":           len(all_maps),
        "department_summary":   dict(dept_summary),
        "sub_vertical_summary": dict(sv_summary),
        "maps":                 all_maps,
    }

    # Save extracted snapshot
    extracted_path = os.path.join(OUTPUTS_DIR, f"{cid_fname}_extracted.json")
    with open(extracted_path, "w", encoding="utf-8") as f:
        json.dump(final, f, ensure_ascii=False, indent=2)
    print(f"[pipeline] Extracted → {extracted_path}")

    # Save routed output
    if output_json_path is None:
        output_json_path = os.path.join(OUTPUTS_DIR, f"{cid_fname}_routed.json")
    with open(output_json_path, "w", encoding="utf-8") as f:
        json.dump(final, f, ensure_ascii=False, indent=2)
    print(f"[pipeline] Routed    → {output_json_path}")

    elapsed = time.time() - t_total
    print(f"\n[pipeline] Total wall time: {elapsed/60:.1f} min")
    return final


# ── CLI ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser(description="ARCA Streaming Pipeline")
    p.add_argument("--pdf",         required=True,          help="Path to circular PDF")
    p.add_argument("--model",       default="qwen2.5:7b",   help="Ollama routing model")
    p.add_argument("--workers",     type=int, default=4,    help="Parallel routing workers")
    p.add_argument("--output_json", default=None,           help="Override output path")
    args = p.parse_args()

    run_streaming_pipeline(
        pdf_path=args.pdf,
        ollama_model=args.model,
        max_workers=args.workers,
        output_json_path=args.output_json,
    )
