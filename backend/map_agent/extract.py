import ollama
import json
import re
from docling.datamodel.pipeline_options import PdfPipelineOptions
from collections import defaultdict
import time
from docling.datamodel.base_models import InputFormat
from docling.document_converter import DocumentConverter, PdfFormatOption
from sentence_transformers import SentenceTransformer, util


def doclingSetup():
    print("\nLoading PDF with Docling...")

    pipeline_options = PdfPipelineOptions()
    pipeline_options.do_ocr = False

    start = time.time()
    converter = DocumentConverter(
        format_options={
            InputFormat.PDF: PdfFormatOption(
                pipeline_options=pipeline_options
            )
        }
    )
    print("Converter init:", time.time() - start)

    import os
    pdf_file = "circular2.pdf" if os.path.exists("circular2.pdf") else "circular.pdf"
    doc = converter.convert(pdf_file).document
    print("Convert:", time.time() - start)

    print(type(doc))
    return doc
    

def buildingPages(doc):
    SKIP_LABELS = {"page_footer"}
    SKIP_PATTERNS = [
        r'^_+$',                          # separator lines
        r'www\.rbi\.org\.in',
        r'Tele:',
        r'भारतीय ररज़र्व बैंक',
        r'RESERVE BANK OF INDIA',
        r'बैंक\s+िं ग पर्यवेक्षण',
        r'Department of Banking Supervision',
        r'World Trade Centre',
        r'टेलीफोन',
    ]

    print("\nGrouping text by page (storing bounding boxes)...")
    pages = defaultdict(list)
    for element in doc.texts:
        if not element.prov:
            continue
        if element.label in SKIP_LABELS:  # ← only change
            continue
        if any(re.search(p, element.text.strip()) for p in SKIP_PATTERNS):
            continue
        page_no = element.prov[0].page_no
        bbox = element.prov[0].bbox
        pages[page_no].append({
            "text": element.text.strip(),
            "label": element.label,        # ← useful to keep for debugging
            "bbox": {
                "x0": round(bbox.l, 2),
                "y0": round(bbox.t, 2),
                "x1": round(bbox.r, 2),
                "y1": round(bbox.b, 2),
            }
        })
    print(f"     Found {len(pages)} pages with content")
    return pages


def extractMetadata(pages):
    circular_id = None
    
    for item in pages[1]:
        text = item["text"].strip()

        if re.match(r'^RBI/', text):
            circular_id = text
            break

    page1_text = " ".join(item["text"] for item in pages[1])
    response = ollama.chat(
            model="gemma4:e4b",
            messages=[
                {"role": "system", "content": "Return only valid JSON, no markdown."},
                {"role": "user", "content": f"""Extract from this RBI circular header:
    Return exact JSON:
    {{"circular_date": "date in YYYY-MM-DD", "circular_title": "title of circular"}},
                 
    Text: {page1_text}"""}
            ],
            options={"temperature": 0}
        )
    
    raw = response["message"]["content"].strip()

    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        result = {
            "circular_date": None,
            "circular_title": None
        }

    result["circular_id"]=circular_id

    return result


def extractDeadlineContext(pages, max_entries=15):
    DATE_PATTERNS = [
        r'\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b',
        r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b',
        r'with effect from',
        r'not later than',
        r'within \d+ days',
        r'by (?:the end of|close of business|March|April|May|June|July|August|September|October|November|December)',
    ]
    
    raw_entries = []
    for page_no in sorted(pages.keys()):
        items = pages[page_no]
        for idx, item in enumerate(items):
            text = item["text"]
            if any(re.search(p, text, re.IGNORECASE) for p in DATE_PATTERNS):
                before = items[idx-1]["text"] if idx > 0 else ""
                after = items[idx+1]["text"] if idx < len(items)-1 else ""
                entry = f"[p{page_no}] {before} | {text} | {after}".strip()
                raw_entries.append((page_no, text, entry))  # keep core text for dedup

    # deduplicate by core sentence similarity before capping
    embedder = get_embedder()
    seen_embeddings = []
    unique_entries = []
    for page_no, core_text, full_entry in raw_entries:
        emb = embedder.encode(core_text, convert_to_tensor=True)
        is_dup = any(
            util.cos_sim(emb, seen).item() > 0.88
            for seen in seen_embeddings
        )
        if not is_dup:
            seen_embeddings.append(emb)
            unique_entries.append(full_entry)

    if len(unique_entries) > max_entries:
        print(f"  Deadline context capped: {len(unique_entries)} → {max_entries}")
        # sample evenly across doc so you don't lose late-page deadlines
        step = len(unique_entries) / max_entries
        unique_entries = [unique_entries[int(i * step)] for i in range(max_entries)]

    print(f"  Deadline context: {len(unique_entries)} sentences")
    return "\n".join(unique_entries)


def overlapAndExtraction(pages, deadline_context):

    SYSTEM_PROMPT = """You are a regulatory compliance expert. Extract obligations from RBI circular text.
    Return ONLY valid JSON, nothing else. No explanation, no markdown, no backticks."""

    EXTRACT_PROMPT = """Extract the most important regulatory obligations from this RBI circular text.
    Only extract MAJOR obligations — directives that require banks to implement a new process, submit a report, or make a structural change.

    DO NOT extract:
    - Sub-bullets or examples of a larger obligation
    - Definitions or explanations
    - Obligations already covered by a previous point
    - Minor administrative details

    CONSOLIDATION RULE: If 3 bullet points all say "banks shall maintain records of X, Y, Z" — that is ONE MAP, not three.

    Key dates and deadlines found across this circular:
    {deadline_context}

    Return this exact JSON:
    {{
    "maps": [
        {{
        "action": "what the bank must do (one sentence, specific)",
        "deadline_raw": "exact deadline text or null",
        "clause_ref": "paragraph or clause reference or null",
        "priority": "HIGH or MEDIUM or LOW"
        }}
    ]
    }}

    If no major obligations found, return {{"maps": []}}

    Text:
    {text}"""

    all_maps = []
    failed_pages = []
    sorted_pages = sorted(pages.keys())

    overall_start = time.time()
    for i, page_no in enumerate(sorted_pages):
        page_text = " ".join(item["text"] for item in pages[page_no])
        if i > 0:
            prev_text = " ".join(item["text"] for item in pages[sorted_pages[i-1]])
            context = prev_text[-200:] + " " + page_text
        else:
            context = page_text
        print(f"  Processing page {page_no}...")

        start = time.time()
        response = ollama.chat(
            model="gemma4:e4b",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": EXTRACT_PROMPT.format(
                    text=context,
                    deadline_context=deadline_context
                )}
            ],
            options={"temperature": 0}
        )

        raw = response["message"]["content"].strip()

        try:
            result = json.loads(raw)
            maps = result.get("maps", [])
            for m in maps:
                m["page_no"] = page_no
            all_maps.extend(maps)
            print(f"  page {page_no}: {time.time()-start:.2f}s | maps found: {len(maps)}")
        except json.JSONDecodeError:
            failed_pages.append(page_no)
            print(f"  page {page_no}: {time.time()-start:.2f}s | invalid JSON, skipping")

    print("total time for extraction:", time.time()-overall_start)
    return all_maps, failed_pages


from sentence_transformers import SentenceTransformer, util

_embedder = None

def get_embedder():
    global _embedder
    if _embedder is None:
        _embedder = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedder


def reconstructingbbox(all_maps, pages):
    maps_by_page = defaultdict(list)
    for m in all_maps:
        maps_by_page[m["page_no"]].append(m)

    embedder = get_embedder()
    c = 0

    for page_no, page_maps in maps_by_page.items():
        items = pages[page_no]
        page_texts = [item["text"] for item in items]

        if not page_texts:
            continue

        block_embeddings = embedder.encode(page_texts, convert_to_tensor=True, show_progress_bar=False)

        for m in page_maps:
            action_embedding = embedder.encode(m["action"], convert_to_tensor=True)
            scores = util.cos_sim(action_embedding, block_embeddings)[0]

            if scores.numel() == 0:
                c += 1
                continue

            best_idx = scores.argmax().item()
            m["bbox"] = items[best_idx]["bbox"]
            m["matched_text"] = items[best_idx]["text"]

    print("no bbox found:", c)
    return all_maps


def resolveDeadlines(all_maps, metadata, deadline_context, batch_size=5):
    circular_date = metadata.get("circular_date")

    RESOLVE_PROMPT = """You are given:
1. RBI circular date: {circular_date}
2. All deadline-related sentences from the circular (with page numbers):
{deadline_context}

3. List of compliance obligations (as JSON):
{maps_batch}

Task: For each obligation, determine its deadline.
- If deadline_raw is already a specific date like "March 31 2025", convert to YYYY-MM-DD.
- If deadline_raw is relative like "within 30 days", compute from circular_date.
- If deadline_raw is null, scan the deadline sentences for any umbrella deadline on a nearby or earlier page that covers this obligation.
- If truly unknown, return null.

Return ONLY a JSON array, one entry per obligation, in the same order:
[
  {{"temp_id": 0, "deadline_resolved": "YYYY-MM-DD or null", "deadline_reasoning": "one line"}},
  ...
]"""

    overall_start = time.time()
    resolved = 0

    for m in all_maps:
        if m.get("deadline_raw") and re.match(r'\d{4}-\d{2}-\d{2}', str(m["deadline_raw"])):
            m["deadline_resolved"] = m["deadline_raw"]
            m["deadline_reasoning"] = "already resolved"
            resolved += 1

    unresolved = [m for m in all_maps if "deadline_resolved" not in m]
    print(f"  Resolving {len(unresolved)} maps in batches of {batch_size}...")

    for i in range(0, len(unresolved), batch_size):
        batch = unresolved[i:i+batch_size]
        batch_input = [
            {
                "temp_id": idx,
                "action": m["action"],
                "deadline_raw": m.get("deadline_raw"),
                "page_no": m["page_no"]
            }
            for idx, m in enumerate(batch)
        ]

        print(f"  Batch {i//batch_size + 1}/{(len(unresolved)-1)//batch_size + 1}...")
        response = ollama.chat(
            model="gemma4:e4b",
            messages=[
                {"role": "system", "content": "Return only valid JSON array, no markdown."},
                {"role": "user", "content": RESOLVE_PROMPT.format(
                    circular_date=circular_date,
                    deadline_context=deadline_context,
                    maps_batch=json.dumps(batch_input, indent=2)
                )}
            ],
            options={"temperature": 0}
        )

        raw = response["message"]["content"].strip()
        try:
            results = json.loads(raw)
            for r in results:
                m = batch[r["temp_id"]]
                m["deadline_resolved"] = r.get("deadline_resolved")
                m["deadline_reasoning"] = r.get("deadline_reasoning")
                if m["deadline_resolved"]:
                    resolved += 1
        except json.JSONDecodeError:
            print(f"  Batch {i//batch_size + 1}: JSON parse failed, marking all null")
            for m in batch:
                m["deadline_resolved"] = None
                m["deadline_reasoning"] = "parse failed"

        time.sleep(1)

    print(f"Deadline resolution: {resolved}/{len(all_maps)} resolved in {time.time()-overall_start:.2f}s")
    return all_maps


def addMetadata(metadata, all_maps, pages, failed_pages):
    # add map_id to each map
    for i, m in enumerate(all_maps):
        m["map_id"] = f"{metadata['circular_id']}_MAP_{i+1:03d}"

    department_summary=defaultdict(int)
    priority_summary=defaultdict(int)
    page_summary=defaultdict(int)

    for m in all_maps:
        # Default department to Unassigned; the routing agent will run later to assign it
        m["department"] = "Unassigned"
        department_summary[m["department"]]+=1
        priority_summary[m["priority"]]+=1
        page_summary[m["page_no"]]+=1

    final = {
        "circular_id": metadata["circular_id"],
        "circular_date": metadata["circular_date"],
        "circular_title": metadata["circular_title"],
        "total_pages": len(pages),
        "total_maps": len(all_maps),
        "page_summary": dict(page_summary),
        "department_summary": dict(department_summary),
        "priority_summary": dict(priority_summary),
        "failed_pages": failed_pages,          
        "failed_page_count": len(failed_pages),
        "maps": all_maps
    }

    return final


def main():
    print("Starting ARCA extraction pipeline...")
    doc = doclingSetup()
    pages = buildingPages(doc)
    metadata = extractMetadata(pages)

    deadline_context = extractDeadlineContext(pages)

    all_maps, failed_pages = overlapAndExtraction(pages, deadline_context)
    all_maps = reconstructingbbox(all_maps, pages)
    all_maps = resolveDeadlines(all_maps, metadata, deadline_context)
    final_json = addMetadata(metadata, all_maps, pages, failed_pages)

    with open("arca_output2.json", "w", encoding="utf-8") as f:
        json.dump(final_json, f, ensure_ascii=False, indent=2)

    print("json saved as arca_output2.json ...")


if __name__ == "__main__":
    main()