try:
    from .rules_store import RulesStore
    from .taxonomy_store import TaxonomyStore
    from .llm_router import LLMRouter
    from .embedding_router import EmbeddingRouter
except ImportError:
    from routing_agent.rules_store import RulesStore
    from routing_agent.taxonomy_store import TaxonomyStore
    from routing_agent.llm_router import LLMRouter
    from routing_agent.embedding_router import EmbeddingRouter


class RoutingAgent:
    """
    Production-grade Routing Agent featuring:
      1. Deterministic Guardrails Overrides (Regex/Keyword substring pattern matches)
      2. Dynamic context-aware Few-Shot Routing Rules retrieval (semantic search)
      3. Granular Sub-Vertical Pre-Filtering (top 6 candidates)
      4. Calibration favoring LLM reasoning (65/35 weight ratio)
      5. Generative Self-Correction Retry Loop
      6. Explainability Auditing (Decision Tracing)
      7. Dynamic Feedback Loop write-back (adding rules & runtime sub-verticals)
    """

    LLM_ACCEPT_THRESHOLD = 52   # medium (52) or higher (73, 88) -> accept LLM result

    def __init__(
        self,
        ollama_model: str = "llama3.2:latest",
        embedding_model: str = "mxbai-embed-large:latest",
        db_path: str = None,
        circular_context: list = None
    ):
        self.rules_store = RulesStore(db_path=db_path)
        self.taxonomy = TaxonomyStore(rules_store=self.rules_store)
        self.llm = LLMRouter(model_name=ollama_model, circular_context=circular_context)
        # EmbeddingRouter pre-computes scope embeddings at init
        self.embedder = EmbeddingRouter(
            taxonomy_store=self.taxonomy,
            embedding_model=embedding_model
        )

    # --------------------------------------------------------------------------
    # Public API
    # --------------------------------------------------------------------------

    def route_map(self, map_data: dict, feedback_examples: list = None) -> dict:
        """
        Routes a single MAP dict through the production-grade pipeline.
        Expected MAP keys: action, clause_ref (opt), deadline_raw (opt), priority (opt).
        """
        action     = map_data.get("action", "")
        clause_ref = map_data.get("clause_ref", "")
        deadline   = map_data.get("deadline_raw", "")
        priority   = map_data.get("priority", "")

        # Initialize audit trace logs
        trace = {
            "guardrail_triggered": False,
            "retrieved_rules": [],
            "self_correction_attempts": 0,
            "validation_errors": []
        }

        # --- Step 1: Check Deterministic Guardrail Overrides ---
        guardrail = self.rules_store.find_matching_guardrail(action)
        if guardrail:
            trace["guardrail_triggered"] = True
            
            proposed_candidates = [
                {
                    "department": guardrail["department"],
                    "sub_vertical": guardrail["sub_vertical"],
                    "confidence": 100,
                    "source": "Deterministic Guardrail Override"
                }
            ]
            
            return self._build_result(
                action              = action,
                department          = guardrail["department"],
                sub_vertical        = guardrail["sub_vertical"],
                sub_vertical_scope  = self.taxonomy.taxonomy.get(guardrail["department"], {}).get(guardrail["sub_vertical"], ""),
                confidence          = 100,
                reasoning           = guardrail["reasoning"],
                routing_source      = "Deterministic Guardrail Override",
                flagged             = False,
                proposed_candidates = proposed_candidates,
                routing_trace       = trace,
                map_data            = map_data
            )

        # --- Step 2: Pre-Filter candidates using Embedding Similarity at Sub-Vertical Level ---
        embed_result = self.embedder.route(action)
        ranked_svs = embed_result["ranked_sub_verticals"]
        
        # Select the top 6 sub-verticals
        TOP_K_SVS = 6
        candidate_svs = ranked_svs[:TOP_K_SVS]
        
        # Build candidate_taxonomy: format { dept_name: { sub_vertical_name: scope_description } }
        candidate_taxonomy = {}
        candidate_sv_names = set()
        for sv in candidate_svs:
            dept = sv["department"]
            sv_name = sv["sub_vertical"]
            scope = sv["scope"]
            
            if dept not in candidate_taxonomy:
                candidate_taxonomy[dept] = {}
            candidate_taxonomy[dept][sv_name] = scope
            candidate_sv_names.add(sv_name)

        # --- Step 3: Retrieve contextually similar active routing rules (few-shots) ---
        if feedback_examples is None:
            # Query the database for past resolved cases matching this action
            retrieved_rules = self.rules_store.find_similar_rules(
                action=action,
                embedder_func=self.embedder._embed,
                top_n=2,
                min_similarity=0.65
            )
            feedback_examples = retrieved_rules
            trace["retrieved_rules"] = [
                {
                    "action": r["action"],
                    "department": r["department"],
                    "sub_vertical": r["sub_vertical"],
                    "reasoning": r["reasoning"]
                }
                for r in retrieved_rules
            ]

        # --- Step 4: LLM Router with filtered sub-vertical taxonomy ---
        llm_result = self.llm.route(
            action_text=action,
            candidate_taxonomy=candidate_taxonomy,
            clause_ref=clause_ref,
            deadline=deadline,
            priority=priority,
            feedback_examples=feedback_examples
        )

        llm_dept = llm_result.get("department", "Unassigned")
        llm_sv = llm_result.get("sub_vertical")
        
        # Validate LLM output against candidate set
        is_valid = (
            llm_dept in candidate_taxonomy and 
            llm_sv in candidate_sv_names
        )

        # --- Step 5: Generative Self-Correction Loop ---
        if not is_valid and llm_dept != "Unassigned":
            trace["self_correction_attempts"] += 1
            error_msg = f"Chosen sub-vertical '{llm_sv}' or department '{llm_dept}' is not in the allowed candidate set."
            trace["validation_errors"].append(error_msg)
            
            # Reprompt the LLM to correct itself
            corrected_result = self.llm.route_correct(
                action_text=action,
                previous_invalid_dept=llm_dept,
                previous_invalid_sv=llm_sv,
                candidate_taxonomy=candidate_taxonomy,
                error_msg=error_msg
            )
            
            if corrected_result.get("status") == "success":
                corr_dept = corrected_result.get("department", "Unassigned")
                corr_sv = corrected_result.get("sub_vertical")
                if corr_dept in candidate_taxonomy and corr_sv in candidate_sv_names:
                    # Self-correction succeeded! Overwrite LLM result.
                    llm_result = corrected_result
                    llm_dept = corr_dept
                    llm_sv = corr_sv
                    is_valid = True

        # Stage 1: Confident LLM routing (retains medium and high confidence)
        if (is_valid and llm_result["confidence"] >= self.LLM_ACCEPT_THRESHOLD):
            hybrid_conf = self._calculate_hybrid_confidence(
                assigned_dept = llm_dept,
                llm_conf      = llm_result["confidence"],
                embed_result  = embed_result
            )
            
            flagged = hybrid_conf < 70
            
            proposed_candidates = self._build_proposed_candidates(
                primary_dept=llm_dept,
                primary_sv=llm_sv,
                primary_conf=hybrid_conf,
                primary_source="LLM Router (Stage 1)",
                embed_result=embed_result
            )
            
            return self._build_result(
                action              = action,
                department          = llm_dept,
                sub_vertical        = llm_sv,
                sub_vertical_scope  = llm_result.get("sub_vertical_scope"),
                confidence          = hybrid_conf,
                reasoning           = llm_result["reasoning"],
                routing_source      = "LLM Router (Stage 1)" if not flagged else "LLM Router (Stage 1) [flagged]",
                flagged             = flagged,
                proposed_candidates = proposed_candidates,
                routing_trace       = trace,
                map_data            = map_data
            )

        # Stage 2: Embedding similarity fallback
        embed_conf = embed_result["confidence"]
        embed_dept = embed_result["department"]
        embed_sv   = embed_result["sub_vertical"]
        
        # Find scope of the winning sub-vertical
        embed_sv_scope = ""
        for sv in ranked_svs:
            if sv["department"] == embed_dept and sv["sub_vertical"] == embed_sv:
                embed_sv_scope = sv["scope"]
                break
                
        flagged = True # fallback routing is always flagged

        reasoning = (
            f"LLM uncertain/invalid (conf {llm_result.get('confidence', 0)}%); "
            f"embedding suggested '{embed_dept} / {embed_sv}' "
            f"(top_sim={embed_result['top_sim']}, margin={embed_result['margin']})."
        )
        
        proposed_candidates = self._build_proposed_candidates(
            primary_dept=embed_dept,
            primary_sv=embed_sv,
            primary_conf=embed_conf,
            primary_source="Embedding Similarity (Stage 2 Fallback)",
            embed_result=embed_result
        )
        
        return self._build_result(
            action              = action,
            department          = embed_dept,
            sub_vertical        = embed_sv,
            sub_vertical_scope  = embed_sv_scope,
            confidence          = embed_conf,
            reasoning           = reasoning,
            routing_source      = "Embedding Similarity (Stage 2 Fallback)",
            flagged             = flagged,
            proposed_candidates = proposed_candidates,
            routing_trace       = trace,
            map_data            = map_data
        )

    # --------------------------------------------------------------------------
    # Feedback Loop API
    # --------------------------------------------------------------------------

    def resolve_ambiguous_case(
        self,
        action: str,
        assigned_dept: str,
        assigned_sub_vertical: str,
        scope: str = None,
        reasoning: str = "Resolved by human verification."
    ):
        """
        Feedback loop API to save manual resolution.
        If a new sub-vertical is provided, updates the taxonomy.
        Saves resolved action mapping to rules database and re-computes embeddings.
        """
        # 1. Update taxonomy if sub-vertical is new
        taxonomy = self.taxonomy.taxonomy
        if assigned_dept not in taxonomy or assigned_sub_vertical not in taxonomy.get(assigned_dept, {}):
            if not scope:
                scope = f"Scope for {assigned_sub_vertical}"
            self.taxonomy.add_sub_vertical(assigned_dept, assigned_sub_vertical, scope)
            # Recompute embeddings cache dynamically for new scope
            self.embedder.reload()
            
        # 2. Compute embedding for the action to cache it in the rule
        action_embed = self.embedder._embed(action)
        
        # 3. Add to rules database (handles locking and atomic saving)
        self.rules_store.add_rule(
            action=action,
            department=assigned_dept,
            sub_vertical=assigned_sub_vertical,
            reasoning=reasoning,
            embedding=action_embed
        )
        print(f"[Feedback Loop] Successfully recorded resolved case for action: '{action[:50]}...' -> {assigned_dept} / {assigned_sub_vertical}")

    # --------------------------------------------------------------------------
    # Helpers
    # --------------------------------------------------------------------------

    def _calculate_hybrid_confidence(self, assigned_dept: str, llm_conf: int, embed_result: dict) -> int:
        """
        Calculates the hybrid calibrated confidence score.
        Combines LLM confidence with the embedding similarity metric.
        Favors LLM reasoning (65% LLM weight, 35% Embedding weight).
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
        
        # 4. Hybrid combination (65% LLM weight, 35% Embedding weight)
        hybrid_conf = round(0.65 * llm_conf + 0.35 * embed_component)
        return max(0, min(100, hybrid_conf))

    def _build_proposed_candidates(
        self,
        primary_dept: str,
        primary_sv: str,
        primary_conf: int,
        primary_source: str,
        embed_result: dict
    ) -> list:
        """
        Constructs the list of department/sub-vertical options for human-in-the-loop dropdown review.
        The first element is the primary proposed option. The rest are alternative embedding matches.
        """
        candidates = [
            {
                "department": primary_dept,
                "sub_vertical": primary_sv,
                "confidence": primary_conf,
                "source": primary_source
            }
        ]
        
        seen = {(primary_dept, primary_sv)}
        
        # Add next best sub-vertical matches from the embedding router
        for sv in embed_result.get("ranked_sub_verticals", []):
            dept = sv["department"]
            sv_name = sv["sub_vertical"]
            
            if (dept, sv_name) not in seen:
                seen.add((dept, sv_name))
                # Scale absolute similarity of alternatives to a 0-100 score
                sim = sv["similarity"]
                sim_conf = round(max(0.0, min(1.0, (sim - 0.40) / 0.50)) * 100)
                
                candidates.append({
                    "department": dept,
                    "sub_vertical": sv_name,
                    "confidence": sim_conf,
                    "source": "Embedding Similarity (Alternative)"
                })
                
            if len(candidates) >= 3:
                break
                
        return candidates

    def _build_result(
        self,
        action: str,
        department: str,
        sub_vertical: str,
        sub_vertical_scope: str,
        confidence: int,
        reasoning: str,
        routing_source: str,
        flagged: bool,
        proposed_candidates: list,
        routing_trace: dict,
        map_data: dict
    ) -> dict:
        notification_sent = False
        if department != "Unassigned":
            notification_sent = self._dispatch_notification(department, map_data)

        return {
            "action":              action,
            "assigned_department": department,
            "sub_vertical":        sub_vertical,
            "sub_vertical_scope":  sub_vertical_scope,
            "confidence":          confidence,
            "reasoning":           reasoning,
            "routing_source":      routing_source,
            "routing_flagged":     flagged,
            "proposed_candidates": proposed_candidates,
            "routing_trace":       routing_trace,
            "notification_sent":   notification_sent
        }

    def _dispatch_notification(self, department: str, map_data: dict) -> bool:
        """
        Mocks a department notification.
        """
        print(
            f"[NOTIFICATION] -> '{department}' | "
            f"'{map_data.get('action', '')[:60]}...'"
        )
        return True
