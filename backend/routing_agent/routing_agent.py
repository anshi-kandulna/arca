try:
    from .taxonomy_store import TaxonomyStore
    from .llm_router import LLMRouter
    from .embedding_router import EmbeddingRouter
except ImportError:
    from routing_agent.taxonomy_store import TaxonomyStore
    from routing_agent.llm_router import LLMRouter
    from routing_agent.embedding_router import EmbeddingRouter


class RoutingAgent:
    """
    Two-stage MAP routing pipeline with candidate pre-filtering and hybrid calibration:

    Stage 1 - Candidate Pre-filtering + LLM Router
      1. Run action through EmbeddingRouter to rank all departments based on
         sub-vertical scope similarity.
      2. Narrow choice pool to only the TOP 3 candidate departments.
      3. Call LLM Router passing only those 3 candidates (speeds up prompt,
         prevents hallucination to irrelevant departments).
      4. If LLM assigns a candidate with confidence >= HIGH_THRESHOLD:
         Calculate the HYBRID confidence score (combining LLM self-score with
         embedding similarity of the chosen department).
         - Hybrid score >= 70 -> Confident assignment (flagged = False)
         - Hybrid score < 70 -> Proposed assignment (flagged = True)

    Stage 2 - Embedding Similarity Fallback (under-confident LLM)
      1. If LLM is uncertain, use the best matched department from the embedding search.
      2. Embedding score >= 70 -> Confident assignment (flagged = False)
      3. Embedding score < 70 -> Proposed assignment (flagged = True)

    No assignments are set to "Unassigned" automatically; the system always proposes
    the best semantic guess and flags low-confidence ones for human verification.
    """

    LLM_HIGH_THRESHOLD  = 73   # very_high(88) or high(73) -> accept LLM result

    def __init__(
        self,
        ollama_model: str = "llama3.2:latest",
        embedding_model: str = "mxbai-embed-large:latest"
    ):
        self.taxonomy = TaxonomyStore()
        self.llm = LLMRouter(model_name=ollama_model)
        # EmbeddingRouter pre-computes 30 scope embeddings at init (~3 s one-time cost)
        self.embedder = EmbeddingRouter(
            taxonomy_store=self.taxonomy,
            embedding_model=embedding_model
        )

    # --------------------------------------------------------------------------
    # Public API
    # --------------------------------------------------------------------------

    def route_map(self, map_data: dict, feedback_examples: list = None) -> dict:
        """
        Routes a single MAP dict through the two-stage filtered pipeline.
        Expected MAP keys: action, clause_ref (opt), deadline_raw (opt), priority (opt).
        """
        action    = map_data.get("action", "")
        clause_ref= map_data.get("clause_ref", "")
        deadline  = map_data.get("deadline_raw", "")
        priority  = map_data.get("priority", "")

        # --- Step 1: Pre-Filter candidates using Embedding Similarity ---
        # Find the top 3 departments based on sub-vertical scope similarity
        embed_result = self.embedder.route(action)
        top_depts = list(embed_result["dept_scores"].keys())[:3]
        
        # Get scope definitions for only these top 3 candidates
        filtered_taxonomy = self.taxonomy.get_taxonomy_for_llm(top_depts)

        # --- Step 2: LLM Router with filtered taxonomy ---
        llm_result = self.llm.route(
            action_text=action,
            candidate_taxonomy=filtered_taxonomy,
            clause_ref=clause_ref,
            deadline=deadline,
            priority=priority,
            feedback_examples=feedback_examples
        )

        # Stage 1: Confident LLM routing
        if llm_result["confidence"] >= self.LLM_HIGH_THRESHOLD and llm_result["department"] in top_depts:
            assigned_dept = llm_result["department"]
            hybrid_conf = self._calculate_hybrid_confidence(
                assigned_dept = assigned_dept,
                llm_conf      = llm_result["confidence"],
                embed_result  = embed_result
            )
            
            flagged = hybrid_conf < 70
            
            return self._build_result(
                action         = action,
                department     = assigned_dept,
                confidence     = hybrid_conf,
                reasoning      = llm_result["reasoning"],
                routing_source = f"LLM Router (Stage 1) [filtered: {', '.join(top_depts)}]",
                flagged        = flagged,
                map_data       = map_data
            )

        # Stage 2: Embedding similarity fallback (when LLM is under-confident)
        embed_conf = embed_result["confidence"]
        embed_dept = embed_result["department"]
        flagged = embed_conf < 70

        reasoning = (
            f"LLM uncertain (conf {llm_result['confidence']}%); "
            f"embedding suggested '{embed_dept}' "
            f"(top_sim={embed_result['top_sim']}, margin={embed_result['margin']})."
        )
        return self._build_result(
            action         = action,
            department     = embed_dept,
            confidence     = embed_conf,
            reasoning      = reasoning,
            routing_source = "Embedding Similarity (Stage 2 Fallback)" if not flagged else "Embedding Similarity (Stage 2 Fallback) [flagged]",
            flagged        = flagged,
            map_data       = map_data
        )

    # --------------------------------------------------------------------------
    # Helpers
    # --------------------------------------------------------------------------

    def _calculate_hybrid_confidence(self, assigned_dept: str, llm_conf: int, embed_result: dict) -> int:
        """
        Calculates the hybrid calibrated confidence score for a department.
        Combines the LLM categorical confidence with the embedding similarity metric.
        If there is a mismatch (LLM chose different from embedding top choice),
        the margin becomes negative, penalizing the clarity and lowering the final score.
        """
        sim_dept = embed_result["dept_scores"].get(assigned_dept, 0.0)
        
        # 1. Strength (Absolute similarity match)
        SIM_FLOOR = 0.40
        SIM_CEIL  = 0.90
        strength = max(0.0, min(1.0, (sim_dept - SIM_FLOOR) / (SIM_CEIL - SIM_FLOOR)))
        
        # 2. Clarity (Margin relative to the best option)
        top_dept = embed_result["department"]
        top_sim  = embed_result["top_sim"]
        
        if assigned_dept == top_dept:
            margin = embed_result["margin"]
        else:
            # Conflict: negative margin penalizes the score
            margin = sim_dept - top_sim
            
        clarity = max(-1.0, min(1.0, margin / 0.15))
        
        # 3. Calculate embedding confidence component
        embed_component = round((0.55 * strength + 0.45 * clarity) * 100)
        embed_component = max(0, min(100, embed_component))
        
        # 4. Hybrid combination (40% LLM weight, 60% Embedding weight)
        hybrid_conf = round(0.40 * llm_conf + 0.60 * embed_component)
        return max(0, min(100, hybrid_conf))

    def _build_result(
        self,
        action: str,
        department: str,
        confidence: int,
        reasoning: str,
        routing_source: str,
        flagged: bool,
        map_data: dict
    ) -> dict:
        notification_sent = False
        if department != "Unassigned":
            notification_sent = self._dispatch_notification(department, map_data)

        return {
            "action":              action,
            "assigned_department": department,
            "confidence":          confidence,
            "reasoning":           reasoning,
            "routing_source":      routing_source,
            "routing_flagged":     flagged,
            "notification_sent":   notification_sent
        }

    def _dispatch_notification(self, department: str, map_data: dict) -> bool:
        """
        Mocks a department notification.
        In production: triggers email (Resend API) or WebSocket event to frontend.
        """
        print(
            f"[NOTIFICATION] -> '{department}' | "
            f"'{map_data.get('action', '')[:60]}...'"
        )
        return True
