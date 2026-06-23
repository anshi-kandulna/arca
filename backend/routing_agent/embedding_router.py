import ollama
from collections import defaultdict


class EmbeddingRouter:
    """
    Stage 2 fallback router that uses sub-vertical scope embeddings for department
    assignment when the LLM is uncertain (medium / low confidence).

    Strategy:
      - At init: pre-compute embeddings for all 30 sub-vertical scope descriptions
        using mxbai-embed-large (already installed, purpose-built for semantic similarity)
      - At routing time: embed the action text, compute cosine similarity against all
        scope embeddings, aggregate per department using MAX similarity, then apply
        a two-signal confidence formula to decide whether to assign or flag.

    Confidence formula:
      strength  = how high is the best match? (absolute cosine similarity)
      clarity   = how much better is the winner vs the runner-up? (margin)
      embed_conf = round((0.55 × strength + 0.45 × clarity) × 100)

    Thresholds (set in RoutingAgent, not here):
      ≥ 70  → confident assignment
      50–69 → assign but flag for compliance officer review
      < 50  → Unassigned
    """

    # mxbai-embed-large typical cosine range for enriched scopes: noise ~0.35-0.45, good match ~0.58-0.70
    # Recalibrated (Run 3 showed top_sim clustering 0.58–0.66; SIM_CEIL=0.90 was crushing scores)
    SIM_FLOOR = 0.35    # cosine below this = no signal
    SIM_CEIL  = 0.70    # cosine at/above this = perfect signal (was 0.90)
    MARGIN_FULL = 0.08  # margin at/above this = full clarity score (was 0.15)

    def __init__(self, taxonomy_store, embedding_model: str = "mxbai-embed-large:latest"):
        self.taxonomy_store = taxonomy_store
        self.embedding_model = embedding_model
        self._scope_index = []  # list of (dept, sv_name, sv_scope, list_of_floats)
        self._precompute()

    # ──────────────────────────────────────────────────────────────────────────
    # Internals
    # ──────────────────────────────────────────────────────────────────────────

    def _embed(self, text: str) -> list:
        response = ollama.embed(model=self.embedding_model, input=text)
        return response["embeddings"][0]

    @staticmethod
    def _cosine(a: list, b: list) -> float:
        dot_product = sum(x * y for x, y in zip(a, b))
        norm_a = sum(x * x for x in a) ** 0.5
        norm_b = sum(y * y for y in b) ** 0.5
        denom = norm_a * norm_b
        if denom == 0:
            return 0.0
        return float(dot_product / denom)

    def _precompute(self):
        scope_items = self.taxonomy_store.get_all_scope_items()
        print(f"[EmbeddingRouter] Pre-computing embeddings for {len(scope_items)} sub-vertical scopes...")
        for dept, sv_name, sv_scope in scope_items:
            vec = self._embed(sv_scope)
            self._scope_index.append((dept, sv_name, sv_scope, vec))
        print(f"[EmbeddingRouter] Ready. Scope embeddings cached for {len(self._scope_index)} sub-verticals.")

    def reload(self):
        """Clears the cached scope index and re-computes embeddings for all active scopes."""
        self._scope_index = []
        self._precompute()

    def _confidence(self, top_sim: float, margin: float) -> int:
        """
        Two-signal confidence score, scaled to 0–100.

        Signal 1 — Strength: how good is the best match in absolute terms?
          Normalized from [SIM_FLOOR, SIM_CEIL] to [0, 1].

        Signal 2 — Clarity: how much better is the winner over the runner-up?
          Full clarity at margin >= MARGIN_FULL.
        """
        strength = max(0.0, min(1.0,
            (top_sim - self.SIM_FLOOR) / (self.SIM_CEIL - self.SIM_FLOOR)
        ))
        clarity = min(1.0, margin / self.MARGIN_FULL)
        return round((0.55 * strength + 0.45 * clarity) * 100)

    # ──────────────────────────────────────────────────────────────────────────
    # Public API
    # ──────────────────────────────────────────────────────────────────────────

    def route(self, action_text: str) -> dict:
        """
        Embeds action_text and finds the best-matching department via sub-vertical
        scope similarity. Returns a routing result dict with confidence score.

        Returns:
          {
            "department":   str,     # winning department
            "sub_vertical":  str,     # winning sub-vertical
            "top_sim":      float,   # cosine similarity of winning match
            "margin":       float,   # gap between winner and runner-up in a different department
            "confidence":   int,     # 0–100 composite confidence score
            "flagged":      bool,    # True if confidence is below assign threshold
            "dept_scores":  dict,    # dept → max cosine score (for backward compatibility)
            "ranked_sub_verticals": list # sorted list of sub-vertical matches
          }
        """
        action_vec = self._embed(action_text)

        sv_scores = []
        for dept, sv_name, sv_scope, sv_vec in self._scope_index:
            sim = self._cosine(action_vec, sv_vec)
            sv_scores.append({
                "department": dept,
                "sub_vertical": sv_name,
                "scope": sv_scope,
                "similarity": sim
            })

        # Sort sub-verticals by descending similarity
        sv_scores = sorted(sv_scores, key=lambda x: -x["similarity"])
        top_sv = sv_scores[0]
        winning_dept = top_sv["department"]
        winning_sv = top_sv["sub_vertical"]
        top_sim = top_sv["similarity"]

        # Calculate margin as the gap between the winning sub-vertical and the
        # highest scoring sub-vertical belonging to a DIFFERENT department.
        second_sim = 0.0
        for sv in sv_scores:
            if sv["department"] != winning_dept:
                second_sim = sv["similarity"]
                break
        margin = top_sim - second_sim

        embed_conf = self._confidence(top_sim, margin)

        # Aggregate max similarity per department for backward compatibility and hybrid calibration
        dept_max = defaultdict(float)
        for sv in sv_scores:
            d = sv["department"]
            s = sv["similarity"]
            if s > dept_max[d]:
                dept_max[d] = s

        sorted_depts = sorted(dept_max.items(), key=lambda x: -x[1])

        return {
            "department": winning_dept,
            "sub_vertical": winning_sv,
            "top_sim": round(top_sim, 4),
            "margin": round(margin, 4),
            "confidence": embed_conf,
            "flagged": embed_conf < 70,
            "dept_scores": {d: round(s, 4) for d, s in sorted_depts},
            "ranked_sub_verticals": [
                {
                    "department": sv["department"],
                    "sub_vertical": sv["sub_vertical"],
                    "scope": sv["scope"],
                    "similarity": round(sv["similarity"], 4)
                }
                for sv in sv_scores
            ]
        }
