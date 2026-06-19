import ollama
import json
import re
from docling.datamodel.pipeline_options import PdfPipelineOptions
from collections import defaultdict
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import time
from docling.datamodel.base_models import InputFormat
from docling.document_converter import DocumentConverter, PdfFormatOption


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

    start = time.time()
    doc = converter.convert("circular.pdf").document
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


def overlapAndExtraction(pages):

    SYSTEM_PROMPT = """You are a regulatory compliance expert. Extract obligations from RBI circular text.
    Return ONLY valid JSON, nothing else. No explanation, no markdown, no backticks."""

    EXTRACT_PROMPT = """Extract all regulatory obligations from this RBI circular text.
    Look for keywords: shall, must, are required to, with effect from, not later than, within X days.

    Return this exact JSON structure:
    {{
    "maps": [
        {{
        "action": "what the bank must do",
        "department_raw": "IT or Operations or Legal or Risk or Treasury or Board",
        "deadline_raw": "exact deadline or null",
        "clause_ref": "paragraph reference or clause reference or null",
        "priority": "HIGH or MEDIUM or LOW"
        }}
    ]
    }}

    If no obligations found, return {{"maps": []}}

    Text:
    {text}"""

    all_maps=[]
    failed_pages = []

    sorted_pages = sorted(pages.keys()) 

    overall_start=time.time()
    for i, page_no in enumerate(sorted_pages):
        page_text = " ".join(item["text"] for item in pages[page_no])
        if i>0:
            prev_text = " ".join(item["text"] for item in pages[sorted_pages[i-1]])
            context = prev_text[-400:] + " " + page_text
        else:
            context = page_text
        print(f"  Processing page {page_no}...")

        start = time.time()
        response = ollama.chat(
            model="gemma4:e4b",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": EXTRACT_PROMPT.format(text=context)}
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

    print("total time for extraction : ",time.time()-overall_start)
    return all_maps, failed_pages


def reconstructingbbox(all_maps, pages):
    # Group maps by page
    maps_by_page = defaultdict(list)
    for m in all_maps:
        maps_by_page[m["page_no"]].append(m)
    
    c=0
    for page_no, page_maps in maps_by_page.items():
        items = pages[page_no]
        page_texts = [item["text"] for item in items]

        if not page_texts:
            continue

        # Fit once for this page
        vectorizer = TfidfVectorizer()
        page_vecs = vectorizer.fit_transform(page_texts).toarray()

        for m in page_maps:
            action_vec = vectorizer.transform([m["action"]]).toarray()[0]
            scores = cosine_similarity([action_vec], page_vecs)[0]

            if len(scores) == 0:
                c+=1
                continue

            best_idx = scores.argmax()
            m["bbox"] = items[best_idx]["bbox"]
            m["matched_text"] = items[best_idx]["text"]
    
    print("no bbox found : ",c)
    return all_maps


def addMetadata(metadata, all_maps, pages, failed_pages):
    # add map_id to each map
    for i, m in enumerate(all_maps):
        m["map_id"] = f"{metadata['circular_id']}_MAP_{i+1:03d}"

    department_summary=defaultdict(int)
    priority_summary=defaultdict(int)
    page_summary=defaultdict(int)

    for m in all_maps:
        department_summary[m["department_raw"]]+=1
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
    doc=doclingSetup()
    pages=buildingPages(doc)
    metadata = extractMetadata(pages)
    all_maps, failed_pages=overlapAndExtraction(pages)
    all_maps=reconstructingbbox(all_maps, pages)
    final_json=addMetadata(metadata, all_maps, pages, failed_pages)

    with open("arca_output.json", "w", encoding="utf-8") as f:
        json.dump(final_json, f, ensure_ascii=False, indent=2)

    print("json saved as arca_output.json ...")

    

if __name__ == "__main__":
    main()