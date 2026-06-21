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

    # mxbai-embed-large typical cosine range: noise ~0.35-0.45, good match ~0.65-0.90
    SIM_FLOOR = 0.40    # cosine below this = no signal
    SIM_CEIL  = 0.90    # cosine at/above this = perfect signal
    MARGIN_FULL = 0.15  # margin at/above this = full clarity score

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
            "department":   str | "Unassigned",
            "top_sim":      float,   # cosine similarity of winning match
            "margin":       float,   # gap between winner and runner-up
            "confidence":   int,     # 0–100 composite confidence score
            "flagged":      bool,    # True if confidence is below assign threshold
            "dept_scores":  dict     # top 3 dept → cosine score (for transparency)
          }
        """
        action_vec = self._embed(action_text)

        # Aggregate cosine similarity per department: take MAX across sub-verticals
        dept_max: dict = defaultdict(float)
        for dept, sv_name, sv_scope, sv_vec in self._scope_index:
            sim = self._cosine(action_vec, sv_vec)
            if sim > dept_max[dept]:
                dept_max[dept] = sim

        sorted_depts = sorted(dept_max.items(), key=lambda x: -x[1])
        winning_dept, top_sim = sorted_depts[0]
        second_sim = sorted_depts[1][1] if len(sorted_depts) > 1 else 0.0
        margin = top_sim - second_sim

        embed_conf = self._confidence(top_sim, margin)

        return {
            "department": winning_dept,
            "top_sim": round(top_sim, 4),
            "margin": round(margin, 4),
            "confidence": embed_conf,
            "flagged": embed_conf < 70,
            "dept_scores": {d: round(s, 4) for d, s in sorted_depts}
        }
