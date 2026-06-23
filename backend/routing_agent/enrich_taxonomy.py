"""
enrich_taxonomy.py  —  Offline scope enrichment utility
========================================================
Rewrites each sub-vertical scope in routing_rules.json to be more
discriminative.  Adds a mandatory "Excludes:" clause so the LLM and
embedding router stop conflating Compliance with Cybersecurity/IT.

Run ONCE before your first production pipeline run:
    python backend/routing_agent/enrich_taxonomy.py [--model gemma:4b] [--dry-run]

Rules:
  • Output ≤ 25 words total
  • Must contain the word "Excludes:"
  • Must not introduce department or sub-vertical names not in the taxonomy
  • 3 failed attempts → keep original scope (logged)
  • Backs up routing_rules.json before any writes
"""

import os
import sys
import json
import shutil
import argparse
import re

import ollama

# ── Path setup ────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH    = os.path.join(SCRIPT_DIR, "routing_rules.json")
BACKUP_PATH = DB_PATH + ".pre_enrichment_backup"

MAX_WORDS   = 25
MAX_RETRIES = 3

# ── Enrichment prompt ─────────────────────────────────────────────────────────
SYSTEM_PROMPT = (
    "You are a bank org-chart expert. Your output must be a single plain-text sentence. "
    "No JSON, no bullet points, no markdown, no explanations."
)

def build_user_prompt(department: str, sub_vertical: str, current_scope: str,
                      all_sv_names: list) -> str:
    sv_list = ", ".join(all_sv_names)
    return (
        f"Department: {department}\n"
        f"Sub-vertical: {sub_vertical}\n"
        f"Current scope: {current_scope}\n\n"
        f"Rewrite this scope description in at most {MAX_WORDS} words.\n"
        f"Format (follow exactly):\n"
        f"  [What this sub-vertical owns]. Excludes: [one thing it does NOT own].\n\n"
        f"Rules:\n"
        f"  - Total output must be {MAX_WORDS} words or fewer.\n"
        f"  - Must contain the word 'Excludes:' exactly once.\n"
        f"  - Do not mention any sub-vertical name other than '{sub_vertical}'.\n"
        f"  - Do not use bullet points, JSON, or markdown.\n"
        f"  - Other sub-verticals in this bank (for context only): {sv_list}."
    )

# ── Validation ────────────────────────────────────────────────────────────────
def validate(text: str, sub_vertical: str, all_sv_names: list) -> tuple[bool, str]:
    """Returns (is_valid, reason_if_invalid)."""
    stripped = text.strip()

    if not stripped:
        return False, "empty output"

    word_count = len(stripped.split())
    if word_count > MAX_WORDS:
        return False, f"too long ({word_count} words, max {MAX_WORDS})"

    if "excludes:" not in stripped.lower():
        return False, "missing 'Excludes:' clause"

    # Must not mention other sub-vertical names verbatim (hallucination guard)
    lower = stripped.lower()
    for sv in all_sv_names:
        if sv.lower() != sub_vertical.lower() and sv.lower() in lower:
            return False, f"mentions another sub-vertical: '{sv}'"

    # Must not contain JSON, markdown, or multi-sentence padding
    if stripped.startswith("{") or stripped.startswith("[") or "```" in stripped:
        return False, "contains JSON or markdown"

    return True, ""

def clean(text: str) -> str:
    """Strip quotes, extra whitespace, trailing periods duplication."""
    text = text.strip().strip('"').strip("'")
    # Normalise whitespace
    text = re.sub(r'\s+', ' ', text)
    return text

# ── Core enrichment ───────────────────────────────────────────────────────────
def enrich_scope(department: str, sub_vertical: str, current_scope: str,
                 all_sv_names: list, model: str) -> tuple[str, bool]:
    """
    Returns (new_scope, was_changed).
    Falls back to original scope after MAX_RETRIES failures.
    """
    prompt = build_user_prompt(department, sub_vertical, current_scope, all_sv_names)

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = ollama.chat(
                model=model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user",   "content": prompt},
                ],
                options={"temperature": 0, "num_predict": 60},
            )
            raw = clean(response["message"]["content"])
            ok, reason = validate(raw, sub_vertical, all_sv_names)
            if ok:
                return raw, True
            else:
                print(f"    [attempt {attempt}] rejected — {reason}. Raw: {raw!r}")
        except Exception as e:
            print(f"    [attempt {attempt}] LLM error: {e}")

    print(f"    → keeping original after {MAX_RETRIES} failed attempts.")
    return current_scope, False

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Enrich routing_rules.json taxonomy scopes.")
    parser.add_argument("--model",   default="qwen2.5:7b",   help="Ollama model name")
    parser.add_argument("--dry-run", action="store_true",  help="Print enriched scopes without saving")
    parser.add_argument("--db",      default=DB_PATH,      help="Path to routing_rules.json")
    args = parser.parse_args()

    if not os.path.exists(args.db):
        print(f"Error: DB not found at {args.db}")
        sys.exit(1)

    # Backup
    if not args.dry_run:
        shutil.copy2(args.db, BACKUP_PATH)
        print(f"Backup saved to: {BACKUP_PATH}")

    with open(args.db, "r", encoding="utf-8") as f:
        data = json.load(f)

    taxonomy = data.get("taxonomy", {})
    if not taxonomy:
        print("Error: taxonomy is empty in DB.")
        sys.exit(1)

    # Collect all sub-vertical names for hallucination guard
    all_sv_names = [
        sv for dept_svs in taxonomy.values() for sv in dept_svs.keys()
    ]

    changed_count = 0
    kept_count    = 0

    print(f"\nEnriching {sum(len(svs) for svs in taxonomy.values())} sub-verticals "
          f"using model '{args.model}'...\n")

    enriched_taxonomy = {}
    for dept, sub_verticals in taxonomy.items():
        enriched_taxonomy[dept] = {}
        for sv_name, current_scope in sub_verticals.items():
            print(f"  {dept} / {sv_name}")
            print(f"    Before: {current_scope}")

            new_scope, changed = enrich_scope(
                department    = dept,
                sub_vertical  = sv_name,
                current_scope = current_scope,
                all_sv_names  = all_sv_names,
                model         = args.model,
            )

            print(f"    After:  {new_scope}")
            enriched_taxonomy[dept][sv_name] = new_scope

            if changed:
                changed_count += 1
            else:
                kept_count += 1

    print(f"\nSummary: {changed_count} enriched, {kept_count} kept (fallback to original).")

    if args.dry_run:
        print("\n[DRY RUN] No changes written.")
        print(json.dumps(enriched_taxonomy, indent=2))
        return

    data["taxonomy"] = enriched_taxonomy
    # Atomic write (mirrors RulesStore pattern)
    import tempfile
    dir_name = os.path.dirname(args.db)
    with tempfile.NamedTemporaryFile("w", dir=dir_name, delete=False,
                                    encoding="utf-8", suffix=".tmp") as tmp:
        json.dump(data, tmp, ensure_ascii=False, indent=2)
        tmp_path = tmp.name
    os.replace(tmp_path, args.db)

    print(f"\nDone. Enriched taxonomy written to: {args.db}")
    print("Note: EmbeddingRouter will re-embed the new scopes automatically on next pipeline run.")


if __name__ == "__main__":
    main()
