#!/usr/bin/env python3
"""
Generate ground truth routing annotations for all MAPs in arca_output.json
using Claude via the Anthropic Batch API.

Usage:
    export ANTHROPIC_API_KEY=sk-ant-...
    python generate_ground_truth.py

Output: ground_truth.json in the same directory as arca_output.json
"""

import json
import os
import sys
import time
from pathlib import Path
import anthropic

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
INPUT_PATH  = ROOT / "arca" / "arca_output.json"
OUTPUT_PATH = ROOT / "arca" / "ground_truth.json"

# ── Model ─────────────────────────────────────────────────────────────────────
MODEL = "claude-sonnet-4-6"

# ── Taxonomy (departments + sub-verticals + scope descriptions) ───────────────
TAXONOMY = {
    "Digital Banking Services": {
        "Internet Banking (IB)":    "Retail and corporate internet banking portals",
        "Mobile Banking (MB)":      "Mobile banking apps and services",
        "Digital Lending":          "Digital loan origination and servicing",
        "API Banking / Open Banking": "Open APIs and fintech integrations"
    },
    "Cybersecurity Wing": {
        "Security Operations Center (SOC)": "Threat monitoring and incident response",
        "Vulnerability Management":         "Scanning and remediation",
        "Identity & Access Management":     "Authentication and privileged access",
        "Security Architecture":            "Secure design and enterprise controls"
    },
    "IT Vertical": {
        "Infrastructure Management":               "Servers, storage and network services",
        "Cloud Operations":                        "Cloud services and hosting",
        "Application Management":                  "Core banking and enterprise applications",
        "Business Continuity & Disaster Recovery": "Resilience and recovery operations"
    },
    "Procurement & Vendor Management": {
        "IT Procurement":             "Technology sourcing and contracts",
        "Third-Party Risk Management": "Vendor due diligence and oversight",
        "Cloud Vendor Management":    "Cloud provider governance"
    },
    "Credit Card Vertical": {
        "Card Issuance":                 "Card onboarding and activation",
        "Card Operations":               "Transaction processing and billing",
        "Dispute & Chargeback Management": "Disputes and reversals"
    },
    "Payments Vertical": {
        "UPI":               "UPI transactions and merchant payments",
        "NEFT":              "Electronic fund transfers",
        "RTGS":              "Real-time gross settlement",
        "Merchant Acquiring": "Merchant onboarding and acceptance"
    },
    "Compliance Department": {
        "Regulatory Compliance": "Compliance monitoring and reporting",
        "AML/CFT":               "Anti-money laundering and sanctions"
    },
    "Legal Department": {
        "Contract Management":      "Vendor and customer contracts",
        "Privacy & Data Protection": "Data privacy and consent management"
    },
    "Risk Management": {
        "Operational Risk": "Operational risk assessment",
        "Technology Risk":  "Technology and cyber risk"
    },
    "Internal Audit": {
        "Information Systems Audit": "IT and cybersecurity audits",
        "Regulatory Audit":          "Compliance assurance and testing"
    }
}

DEPT_NAMES = list(TAXONOMY.keys())
ALL_SUB_VERTICALS = [sv for svs in TAXONOMY.values() for sv in svs]


def build_taxonomy_block() -> str:
    lines = []
    for dept, sub_verticals in TAXONOMY.items():
        lines.append(dept)
        for sv_name, sv_scope in sub_verticals.items():
            lines.append(f"    • {sv_name}: {sv_scope}")
    return "\n".join(lines)


def build_prompt(map_data: dict, taxonomy_block: str) -> str:
    return f"""You are a regulatory compliance expert for an Indian commercial bank.
Assign the following RBI circular obligation to the single most appropriate department and sub-vertical.
Use the scope description of each sub-vertical — not just its name — to make the best match.

Obligation:
  Action    : {map_data['action']}
  Clause Ref: {map_data.get('clause_ref') or 'N/A'}
  Priority  : {map_data.get('priority') or 'N/A'}

Available Departments and Sub-Verticals (name: scope):
──────────────────────────────────────────────────────
{taxonomy_block}
──────────────────────────────────────────────────────

Return ONLY this JSON, no markdown, no extra keys:
{{
  "department":   "exact department name from the list above",
  "sub_vertical": "exact sub-vertical name from the list above",
  "confidence":   "very_high | high | medium | low",
  "reasoning":    "one sentence explaining why this sub-vertical's scope best matches the obligation"
}}

Confidence definitions:
  very_high – obligation language maps directly to one sub-vertical's scope
  high      – best fit but touches adjacent areas
  medium    – reasonable; another sub-vertical could also own it
  low       – significant scope overlap across multiple sub-verticals"""


def parse_result(raw: str) -> dict:
    """Strip markdown fences if present and parse JSON."""
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines).strip()
    return json.loads(text)


def validate_annotation(ann: dict) -> dict:
    """Ensure department and sub_vertical are valid names; fall back gracefully."""
    dept = ann.get("department", "")
    sv   = ann.get("sub_vertical", "")

    if dept not in DEPT_NAMES:
        # case-insensitive fallback
        match = next((d for d in DEPT_NAMES if d.lower() == dept.lower()), None)
        ann["department"] = match or "Unassigned"

    if sv not in ALL_SUB_VERTICALS:
        match = next((s for s in ALL_SUB_VERTICALS if s.lower() == sv.lower()), None)
        ann["sub_vertical"] = match or "Unknown"

    return ann


def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY environment variable not set.")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)

    # ── Load MAPs ─────────────────────────────────────────────────────────────
    data = json.loads(INPUT_PATH.read_text())
    maps = data["maps"]
    print(f"Loaded {len(maps)} MAPs from {INPUT_PATH}")

    taxonomy_block = build_taxonomy_block()

    # ── Build batch requests ──────────────────────────────────────────────────
    batch_requests = [
        {
            "custom_id": m["map_id"],
            "params": {
                "model": MODEL,
                "max_tokens": 300,
                "messages": [
                    {"role": "user", "content": build_prompt(m, taxonomy_block)}
                ]
            }
        }
        for m in maps
    ]

    # ── Submit batch ──────────────────────────────────────────────────────────
    print(f"Submitting batch of {len(batch_requests)} requests to {MODEL}...")
    batch = client.messages.batches.create(requests=batch_requests)
    print(f"Batch ID: {batch.id}  |  Status: {batch.processing_status}")

    # ── Poll until complete ───────────────────────────────────────────────────
    poll_interval = 15  # seconds
    while batch.processing_status == "in_progress":
        time.sleep(poll_interval)
        batch = client.messages.batches.retrieve(batch.id)
        counts = batch.request_counts
        print(
            f"  [{batch.processing_status}]  "
            f"processing={counts.processing}  succeeded={counts.succeeded}  "
            f"errored={counts.errored}"
        )

    print(f"Batch complete. Final status: {batch.processing_status}")

    # ── Collect results ───────────────────────────────────────────────────────
    # Build a lookup: map_id → map_data
    map_lookup = {m["map_id"]: m for m in maps}

    annotations = []
    errors = []

    for result in client.messages.batches.results(batch.id):
        map_id = result.custom_id
        map_data = map_lookup.get(map_id, {})

        if result.result.type == "succeeded":
            raw_text = result.result.message.content[0].text
            try:
                ann = parse_result(raw_text)
                ann = validate_annotation(ann)
                annotations.append({
                    "map_id":       map_id,
                    "action":       map_data.get("action", ""),
                    "clause_ref":   map_data.get("clause_ref", ""),
                    "priority":     map_data.get("priority", ""),
                    "department":   ann["department"],
                    "sub_vertical": ann["sub_vertical"],
                    "confidence":   ann.get("confidence", ""),
                    "reasoning":    ann.get("reasoning", "")
                })
            except Exception as e:
                errors.append({"map_id": map_id, "error": f"parse error: {e}", "raw": raw_text})
        else:
            error_detail = getattr(result.result, "error", {})
            errors.append({"map_id": map_id, "error": str(error_detail)})

    # Sort by map_id to match original order
    annotations.sort(key=lambda x: x["map_id"])

    # ── Write output ──────────────────────────────────────────────────────────
    output = {
        "generated_by":  MODEL,
        "batch_id":      batch.id,
        "total_maps":    len(maps),
        "annotated":     len(annotations),
        "errors":        len(errors),
        "annotations":   annotations,
    }
    if errors:
        output["error_details"] = errors

    OUTPUT_PATH.write_text(json.dumps(output, indent=2))
    print(f"\nGround truth saved to {OUTPUT_PATH}")
    print(f"  Annotated : {len(annotations)}")
    if errors:
        print(f"  Errors    : {len(errors)}")
        for e in errors:
            print(f"    {e['map_id']}: {e['error']}")


if __name__ == "__main__":
    main()
