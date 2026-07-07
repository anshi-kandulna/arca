# Downstream Routing Agent (Stage 2 & 3)

The **Downstream Routing Agent** is an intelligent, two-stage semantic routing pipeline designed to assign regulatory compliance obligations (extracted from RBI circulars) to the most appropriate business department and sub-vertical within a commercial bank. 

It replaces standard, brittle keyword/regex matching with context-aware semantic reasoning, dynamic rule injection, deterministic guardrail overrides, self-correcting logic, a closed-loop human feedback system, and a secure JSON database store.

---

## 1. Core Pipeline Architecture

The routing pipeline uses a hybrid, multi-stage architecture to maximize classification accuracy while keeping latency low. The feedback loop (§2) closes the diagram — every human correction feeds back into the same rule search and candidate pool that the next routing call reads from:

```mermaid
graph TD
    A[Action Text / Obligation] --> B{Deterministic Guardrails?}
    B -->|Match Pattern| B2{Pair Valid in Live Taxonomy?}
    B2 -->|Yes| C[Immediate 100% Assignment]
    B2 -->|No - stale/misconfigured guardrail| D
    B -->|No Match| D[Embedding Pre-Filter]
    D -->|Rank Sub-Verticals| E[Select Top 6 Candidates]
    E --> F[Semantic Rule Search]
    F -->|Similarity >= 0.65| G[Retrieve Top 2-3 Few-Shots]
    G --> H[Focused LLM Router]
    H -->|Validate Choice| I{Sub-Vertical Belongs to Chosen Dept?}
    I -->|No| J[Generative Self-Correction Loop]
    J -->|Retry Corrects| K[Unified Hybrid Calibration]
    I -->|Yes| K
    K --> L{Hybrid Score >= 70%?}
    L -->|Yes| M[Confident Assignment]
    L -->|No| N[Flagged Assignment]
    M --> O[Human Review]
    N --> O
    O -->|Approve or Correct| P[resolve_ambiguous_case]
    P --> Q[(routing_rules.json)]
    Q -.->|New/refreshed few-shot rule| F
    Q -.->|New sub-vertical, if any| E
```

### Stage 1: Pre-LLM Pre-Filtering & Dynamic Rule Injection
1. **Deterministic Guardrails Override**: Prior to running embeddings or LLM logic, the input text is matched against keyword patterns defined in [routing_rules.json](file:///Users/nidhimithiya/Desktop/Arca/backend/routing_agent/routing_rules.json). If a pattern is found (e.g. `"FEMA compliance"`), the agent first checks that the guardrail's `(department, sub_vertical)` pair still exists in the **live** taxonomy — guarding against stale or hand-edited guardrail entries pointing at a pair that no longer exists. Only then is it assigned with 100% confidence, bypassing the downstream AI pipeline completely. If the pair is invalid, the guardrail is ignored and the action falls through to the embedding/LLM pipeline instead.
2. **Sub-Vertical Semantic Filtering**: The obligation is embedded using `mxbai-embed-large` and compared against all active sub-vertical scope definitions. The pipeline slices the taxonomy to keep only the **top 6 candidate sub-verticals**.
3. **Dynamic Few-Shot Retrieval**: The agent queries the database for past resolved cases matching this action using cosine similarity. The top 2-3 matched rules (with similarity $\ge 0.65$) are fetched and injected directly into the LLM prompt under a `Similar Past Decisions` section.
4. **Focused LLM Assignment**: A prompt containing *only* the top 6 candidate scopes and few-shot rules is sent to the `llama3.2:latest` model. This drops latency significantly and prevents hallucinations.

### Stage 2: Generative Self-Correction & Embedding Fallback
1. **Self-Correction Retry**: The LLM's chosen sub-vertical must belong to its *own* chosen department's candidate list — not merely appear somewhere in the top-6 candidate set under a different department. This prevents the LLM from mixing a department from one candidate row with a sub-vertical from another and producing a structurally invalid pair (e.g. `"Risk Management" + "Third-Party Risk Management"`, which the taxonomy never actually pairs). If validation fails, the agent executes a self-healing retry, re-prompting the LLM with the invalid output, the validation error, and the list of allowed candidate sub-verticals.
2. **Embedding Fallback**: If the LLM is under-confident (confidence score < 52 / `medium`) or fails self-correction, the system falls back to the absolute best match found in the vector embedding space.

---

## 2. Human-in-the-Loop Feedback System

The agent is not a static classifier — every human correction permanently improves future routing for similar obligations, via [RoutingAgent.resolve_ambiguous_case](file:///Users/nidhimithiya/Desktop/Arca/backend/routing_agent/routing_agent.py#L256). This is what closes the loop drawn in the §1 diagram: a `Flagged Assignment` (or a confident one a reviewer overrides) doesn't just get corrected once — it teaches the pipeline.

### Trigger
A compliance officer reviews a routed obligation in the UI (typically one with `routing_flagged: true`, or one where they disagree with a confident assignment) and submits the correct `(department, sub_vertical)` pair, optionally with a new scope description if the pair doesn't exist yet.

```python
agent.resolve_ambiguous_case(
    action="Monitor digital asset transactions for unusual wallet addresses",
    assigned_dept="Compliance Department",
    assigned_sub_vertical="AML/CFT",
    scope="Monitoring transaction addresses and tracking wallets",  # optional — only needed for a new sub-vertical
    reasoning="Manual override by Senior Compliance Officer"
)
```

### What happens under the hood
1. **Dynamic taxonomy growth**: if `assigned_sub_vertical` doesn't exist yet under `assigned_dept`, it's added to the `taxonomy` section of `routing_rules.json` via [TaxonomyStore.add_sub_vertical](file:///Users/nidhimithiya/Desktop/Arca/backend/routing_agent/taxonomy_store.py#L93), and [EmbeddingRouter.reload()](file:///Users/nidhimithiya/Desktop/Arca/backend/routing_agent/embedding_router.py#L66) immediately recomputes the full scope-embedding index so the new sub-vertical is a candidate in the very next routing call (feeds back into the Stage 1 "Select Top 6 Candidates" step).
2. **Embedding + upsert into rules**: an embedding vector is computed for the action text and the pair is written into the `rules` array via [RulesStore.add_rule](file:///Users/nidhimithiya/Desktop/Arca/backend/routing_agent/rules_store.py#L196), which **deduplicates by normalized action text** — resolving the same action twice updates the existing rule in place rather than growing the DB unbounded.
3. **Immediately retrievable**: the new rule is now a candidate for [RulesStore.find_similar_rules](file:///Users/nidhimithiya/Desktop/Arca/backend/routing_agent/rules_store.py#L263) — the next semantically similar obligation (cosine similarity $\ge 0.65$) will retrieve it as a few-shot example in the LLM prompt (feeds back into the Stage 1 "Semantic Rule Search" step). Older rules seeded without a cached embedding are lazily embedded and cached on first lookup, so the DB self-heals without a separate backfill step.
4. **Atomic, lock-safe write**: persisted via `RulesStore`'s atomic tempfile-+-`os.replace` write under a cross-process `fcntl` lock (see §4), so concurrent reviewer submissions can't corrupt the DB.

### Bulk / offline seeding
[seed_rules.py](file:///Users/nidhimithiya/Desktop/Arca/backend/routing_agent/seed_rules.py) calls this exact same `resolve_ambiguous_case` API in a loop to bootstrap the rules DB with ~30 hand-labeled examples across all departments before a circular's first production run — there is no separate seeding code path to keep in sync; bulk seeding and live human feedback are the same mechanism.

---

## 3. Hybrid Calibration Confidence Scoring

To prevent LLM hallucinations and align assignments with vector space similarity, the pipeline calculates a **Hybrid Calibrated Confidence Score**:

$$\text{Unified Confidence} = 0.65 \cdot C_{LLM} + 0.35 \cdot C_{Embed}$$

Where:
* **$C_{LLM}$** is the LLM's integer score: `very_high` (88), `high` (73), `medium` (52), `low` (32).
* **$C_{Embed}$** is the embedding router's confidence score ($0 - 100$) based on two metrics:

### Embedding Confidence Component ($C_{Embed}$)
$$C_{Embed} = \text{round}(0.55 \cdot \text{Strength} + 0.45 \cdot \text{Clarity})$$

1. **Strength (Absolute Match Quality)**:
   $$\text{Strength} = \text{clamp}\left(\frac{S_{dept} - 0.40}{0.90 - 0.40}, 0, 1\right)$$
   Where $S_{dept}$ is the cosine similarity score of the evaluated department.
2. **Clarity (Margin/Uniqueness)**:
   * **If LLM and Embedding top choice agree**:
     $$\text{Margin} = S_{dept} - S_{second}$$
   * **If LLM and Embedding top choice disagree (Conflict)**:
     $$\text{Margin} = S_{dept} - S_{top\_embedding} \quad (\text{yields a negative margin})$$
   $$\text{Clarity} = \text{clamp}\left(\frac{\text{Margin}}{0.15}, -1.0, 1.0\right)$$

A negative margin (conflict) heavily penalizes the embedding confidence component, correctly dragging down the final hybrid score and triggering a flagged review.

---

## 4. Database Store with Locking & Atomic Writes

The routing rules, taxonomy definitions, and guardrail patterns are persisted in a JSON database [routing_rules.json](file:///Users/nidhimithiya/Desktop/Arca/backend/routing_agent/routing_rules.json) managed by the [RulesStore](file:///Users/nidhimithiya/Desktop/Arca/backend/routing_agent/rules_store.py#L7) class:

* **Atomic Writes**: Saves are written to a temporary file in the same folder first, then replaced atomically using `os.replace` to prevent data corruption.
* **File Locking**: Acquires a cross-process lock on `routing_rules.json.lock` using python's `fcntl.flock(lock_f, fcntl.LOCK_EX)` during any save/write operation.
* **Embedding Cache Seeding**: Resolved few-shot rules are stored with their pre-calculated embedding vectors (`embedding`) in the JSON database, avoiding redundant Ollama embedding query latency during runtime semantic search.

---

## 5. Execution Instructions

The routing agent is executed via the unified pipeline runner:

```bash
# In the virtual environment
.venv/bin/python3 run_pipeline.py --mode route_only --model llama3.2:latest
```

This reads from `backend/arca/arca_output.json`, routes all obligations using the production-grade pipeline, and outputs the augmented metadata into [arca_output_routed.json](file:///Users/nidhimithiya/Desktop/Arca/backend/arca/arca_output_routed.json).

### Running Verification Tests
Execute the test suite to verify guardrails, few-shot prompt injection, self-correction, and the feedback loop:

```bash
.venv/bin/python3 backend/routing_agent/verify_production_agent.py
```

---

## 6. API & Frontend Integration Guidelines

### Routing Result Output Schema
Each routed obligation in [arca_output_routed.json](file:///Users/nidhimithiya/Desktop/Arca/backend/arca/arca_output_routed.json) follows this schema:

```json
{
  "action": "Ensure that all mobile banking portal sessions terminate after 5 minutes of inactivity.",
  "assigned_department": "Digital Banking Services",
  "sub_vertical": "Mobile Banking (MB)",
  "sub_vertical_scope": "Mobile banking apps and services",
  "confidence": 85,
  "reasoning": "The action text specifies session timeouts for mobile banking applications, which falls under Mobile Banking.",
  "routing_source": "LLM Router (Stage 1)",
  "routing_flagged": false,
  "proposed_candidates": [
    {
      "department": "Digital Banking Services",
      "sub_vertical": "Mobile Banking (MB)",
      "confidence": 85,
      "source": "LLM Router (Stage 1)"
    },
    {
      "department": "Digital Banking Services",
      "sub_vertical": "Internet Banking (IB)",
      "confidence": 62,
      "source": "Embedding Similarity (Alternative)"
    }
  ],
  "routing_trace": {
    "guardrail_triggered": false,
    "retrieved_rules": [
      {
        "action": "Ensure mobile banking application locks users out after consecutive failed password attempts.",
        "department": "Digital Banking Services",
        "sub_vertical": "Mobile Banking (MB)",
        "reasoning": "Security policies for mobile banking applications are under Mobile Banking."
      }
    ],
    "self_correction_attempts": 0,
    "validation_errors": []
  },
  "notification_sent": true
}
```

### UI Presentation Checklist
1. **Routing Status Banner**: Render the `assigned_department` and `sub_vertical`.
   * If `routing_flagged` is `true`, render an **attention/warning badge** (e.g., `⚠️ Flagged for Review`).
   * Render the `confidence` percentage as a visual status bar (Green for $\ge 70\%$, Orange/Red for $< 70\%$).
2. **Hover Tooltip / Expansion Panel**:
   * Show the `reasoning` and the `routing_source` (indicates whether it was routed via Guardrails, LLM, or Fallback).
   * Expose the `routing_trace` in an advanced metadata view for compliance auditing.
3. **Alternative Options Dropdown**:
   * Use the `proposed_candidates` array to populate a choice set for human verification, sorted by confidence.
4. **Approve Action**: If the suggested assignment is approved, set `routing_flagged` to `false` and lock the assignment.

### Human Feedback Loop API
When a reviewer approves or corrects a routed assignment in the UI, call `agent.resolve_ambiguous_case(...)` — see **§2. Human-in-the-Loop Feedback System** above for the full mechanics (dynamic taxonomy growth, rule upsert/dedup, embedding cache self-healing, and atomic write-back).

---

## 7. Utility / Offline Scripts

These are run manually during setup or maintenance — none of them are on the live request path:

| Script | Purpose |
|---|---|
| [seed_rules.py](file:///Users/nidhimithiya/Desktop/Arca/backend/routing_agent/seed_rules.py) | Bootstraps `routing_rules.json` with ~30 hand-labeled few-shot examples across all departments via the same `resolve_ambiguous_case` feedback API (§2). Run once before a circular's first production pass. Idempotent — reruns just refresh cached embeddings. |
| [enrich_taxonomy.py](file:///Users/nidhimithiya/Desktop/Arca/backend/routing_agent/enrich_taxonomy.py) | Rewrites every sub-vertical's scope description via LLM to add a mandatory `Excludes:` clause, making adjacent sub-verticals (e.g. Compliance vs. Cybersecurity) more discriminative for both the LLM router and the embedding router. Backs up the DB to `routing_rules.json.pre_enrichment_backup` first. Run once before first production use. |
| [generate_ground_truth.py](file:///Users/nidhimithiya/Desktop/Arca/backend/routing_agent/generate_ground_truth.py) | Calls the Anthropic Batch API against `arca_output.json` to produce an independent `ground_truth.json` routing for evaluating the pipeline's accuracy against a stronger model, separate from the local Ollama models used at runtime. |

