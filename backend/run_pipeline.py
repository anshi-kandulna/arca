import sys
import os
import re
import json
import threading
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

# Add backend directory to path so we can import routing_agent package
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from routing_agent.routing_agent import RoutingAgent

BACKEND_DIR   = os.path.abspath(os.path.dirname(__file__))
MAP_AGENT_DIR = os.path.join(BACKEND_DIR, "map_agent")
OUTPUTS_DIR   = os.path.join(BACKEND_DIR, "outputs")

os.makedirs(OUTPUTS_DIR, exist_ok=True)


def _circular_id_to_filename(circular_id: str) -> str:
    """Converts 'RBI/2015-16/418' -> 'RBI_2015-16_418' for use as a filename."""
    safe = re.sub(r"[/\\:*?\"<>|]", "_", circular_id).strip("_")
    return safe or "unknown_circular"


def _resolve_output_path(data: dict, explicit_output: str = None) -> str:
    """
    Returns the routed output path.
    - If caller passed an explicit path, use it.
    - Otherwise derive from circular_id in the JSON -> outputs/{id}_routed.json
    """
    if explicit_output:
        return explicit_output
    circular_id = data.get("circular_id", "")
    fname = _circular_id_to_filename(circular_id) if circular_id else "arca_output"
    return os.path.join(OUTPUTS_DIR, f"{fname}_routed.json")


# -- Routing phase -------------------------------------------------------------

def run_routing_phase(
    input_json_path,
    output_json_path=None,      # None = auto-derive from circular_id
    ollama_model="qwen2.5:7b",
    max_workers=4,
):
    print(f"\n--- Starting Downstream Routing Agent Phase ---")
    print(f"Input : {input_json_path}")

    if not os.path.exists(input_json_path):
        print(f"Error: '{input_json_path}' not found. Run extraction first.")
        return False

    with open(input_json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    output_json_path = _resolve_output_path(data, output_json_path)
    print(f"Output: {output_json_path}")

    maps           = data.get("maps", [])
    circular_id    = data.get("circular_id", "")
    circular_title = data.get("circular_title", "")
    circular_context = [x for x in [circular_id, circular_title] if x]

    print(f"Circular : {circular_id} -- {circular_title}")
    print(f"Actions  : {len(maps)}  |  Model: {ollama_model}  |  Workers: {max_workers}\n")

    # RoutingAgent init pre-computes all scope embeddings (~20s, done once)
    agent = RoutingAgent(ollama_model=ollama_model, circular_context=circular_context)

    results    = {}
    completed  = 0
    print_lock = threading.Lock()

    def route_one(idx, m):
        res = agent.route_map(m)
        m["department"]          = res["assigned_department"]
        m["sub_vertical"]        = res.get("sub_vertical")
        m["sub_vertical_scope"]  = res.get("sub_vertical_scope")
        m["routing_confidence"]  = res["confidence"]
        m["routing_reasoning"]   = res["reasoning"]
        m["routing_source"]      = res["routing_source"]
        m["routing_flagged"]     = res.get("routing_flagged", False)
        m["proposed_candidates"] = res.get("proposed_candidates", [])
        m["routing_trace"]       = res.get("routing_trace", {})
        return idx, m, res

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(route_one, i, m): i for i, m in enumerate(maps)}
        for future in as_completed(futures):
            idx, m, res = future.result()
            results[idx] = m
            with print_lock:
                completed += 1
                src  = res.get("routing_source", "")[:14]
                conf = res.get("confidence", 0)
                dept = res.get("assigned_department", "?")[:26]
                print(f"  [{completed:>3}/{len(maps)}] {dept:<26} conf={conf:>3}%  [{src}]  '{m['action'][:48]}'")

    routed_maps = [results[i] for i in range(len(maps))]

    dept_summary = defaultdict(int)
    sv_summary   = defaultdict(int)
    for m in routed_maps:
        dept_summary[m["department"]] += 1
        if m.get("sub_vertical"):
            sv_summary[m["sub_vertical"]] += 1

    data["maps"]                = routed_maps
    data["department_summary"]  = dict(dept_summary)
    data["sub_vertical_summary"]= dict(sv_summary)

    print("\n--- Routing Summary ---")
    for dept, count in sorted(dept_summary.items(), key=lambda x: -x[1]):
        print(f"  {dept}: {count}")

    with open(output_json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\nSaved -> {output_json_path}")
    return True


# -- Full pipeline (extraction + routing) -------------------------------------

def run_full_pipeline(pdf_path, output_json_path=None, ollama_model="qwen2.5:7b"):
    import subprocess, shutil

    print(f"--- Starting Full ARCA Pipeline ---")
    print(f"PDF: {pdf_path}\n")

    extract_script = os.path.join(MAP_AGENT_DIR, "extract.py")
    target_pdf     = os.path.join(MAP_AGENT_DIR, "circular.pdf")

    # Copy PDF into map_agent if it is not already there
    if os.path.abspath(pdf_path) != os.path.abspath(target_pdf):
        shutil.copy(pdf_path, target_pdf)
        print(f"Copied PDF -> {target_pdf}")

    print("Step 1: MAP extraction (Docling + Ollama)...")
    result = subprocess.run(
        [sys.executable, extract_script],
        cwd=MAP_AGENT_DIR,
        capture_output=False,
        text=True,
    )
    if result.returncode != 0:
        print("Error: extraction failed.")
        return

    intermediate_json = os.path.join(MAP_AGENT_DIR, "arca_output.json")

    # Save a per-circular copy of the extracted JSON before routing
    with open(intermediate_json, "r", encoding="utf-8") as f:
        extracted_data = json.load(f)
    circular_id = extracted_data.get("circular_id", "")
    extracted_fname = _circular_id_to_filename(circular_id) if circular_id else "arca_output"
    extracted_copy  = os.path.join(OUTPUTS_DIR, f"{extracted_fname}_extracted.json")
    shutil.copy(intermediate_json, extracted_copy)
    print(f"Extraction saved -> {extracted_copy}")

    print("\nStep 2: Routing...")
    run_routing_phase(intermediate_json, output_json_path, ollama_model=ollama_model)


# -- CLI -----------------------------------------------------------------------

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="ARCA Pipeline Runner")
    parser.add_argument(
        "--mode", choices=["full", "route_only"], default="route_only",
        help="'full' = extraction + routing; 'route_only' = routing on existing JSON",
    )
    parser.add_argument(
        "--pdf", default=os.path.join(MAP_AGENT_DIR, "circular.pdf"),
        help="Path to circular PDF (full mode only)",
    )
    parser.add_argument(
        "--input_json", default=os.path.join(MAP_AGENT_DIR, "arca_output.json"),
        help="Path to extracted JSON (route_only mode)",
    )
    parser.add_argument(
        "--output_json", default=None,
        help="Override output path (default: outputs/{circular_id}_routed.json)",
    )
    parser.add_argument(
        "--model", default="qwen2.5:7b",
        help="Ollama model for routing (default: qwen2.5:7b)",
    )
    parser.add_argument(
        "--workers", type=int, default=4,
        help="Parallel routing workers (default: 4)",
    )

    args = parser.parse_args()

    if args.mode == "full":
        run_full_pipeline(args.pdf, args.output_json, ollama_model=args.model)
    else:
        run_routing_phase(
            args.input_json,
            args.output_json,
            ollama_model=args.model,
            max_workers=args.workers,
        )
