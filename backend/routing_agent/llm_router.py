import ollama
import json


class LLMRouter:
    def __init__(self, model_name: str = "llama3.2:latest"):
        self.model_name = model_name
        self.all_departments = [
            "Digital Banking Services",
            "Cybersecurity Wing",
            "IT Vertical",
            "Procurement & Vendor Management",
            "Credit Card Vertical",
            "Payments Vertical",
            "Compliance Department",
            "Legal Department",
            "Risk Management",
            "Internal Audit"
        ]

    def _build_scope_block(self, candidate_taxonomy: dict) -> str:
        """
        Renders the scope-enriched department context block for the LLM prompt.

        candidate_taxonomy format:
          {
            "Cybersecurity Wing": {
              "Security Operations Center (SOC)": "Threat monitoring and incident response",
              "Vulnerability Management": "Scanning and remediation",
              ...
            },
            "Risk Management": { ... }
          }
        """
        lines = []
        for dept, sub_verticals in candidate_taxonomy.items():
            lines.append(f"{dept}")
            for sv_name, sv_scope in sub_verticals.items():
                lines.append(f"    • {sv_name}: {sv_scope}")
        return "\n".join(lines)

    def route(
        self,
        action_text: str,
        candidate_taxonomy: dict,   # dept → {sub_vertical: scope}
        clause_ref: str = None,
        deadline: str = None,
        priority: str = None,
        feedback_examples: list = None
    ):
        """
        Calls the local LLM (Ollama) to assign a department AND sub-vertical to the
        given action text, using the full scope-enriched taxonomy for disambiguation.
        """
        system_prompt = (
            "You are a regulatory compliance routing expert for an Indian commercial bank. "
            "Your job is to read an obligation extracted from an RBI circular and assign it "
            "to the most appropriate department and sub-vertical based on each sub-vertical's scope.\n"
            "Return ONLY valid JSON, nothing else. No explanation, no markdown, no backticks."
        )

        map_details = f"Action: {action_text}\n"
        if clause_ref:
            map_details += f"Clause Ref: {clause_ref}\n"
        if deadline:
            map_details += f"Deadline: {deadline}\n"
        if priority:
            map_details += f"Priority: {priority}\n"

        scope_block = self._build_scope_block(candidate_taxonomy)
        dept_names = list(candidate_taxonomy.keys())

        user_content = f"""Given the following regulatory obligation, determine which department and sub-vertical should own it.
Use the scope description of each sub-vertical — not just the name — to make the most accurate assignment.

Obligation Details:
{map_details}
Available Departments and Sub-Verticals (with scope):
──────────────────────────────────────────────────────
{scope_block}
──────────────────────────────────────────────────────
Output format must be EXACTLY this JSON (no extra keys, no markdown):
{{
  "department": "Name of chosen department (must match exactly)",
  "sub_vertical": "Name of the most relevant sub-vertical (must match exactly)",
  "sub_vertical_scope": "The scope description of the chosen sub-vertical",
  "confidence_level": "very_high | high | medium | low",
  "reasoning": "One sentence explaining why this sub-vertical's scope best matches the obligation."
}}

Confidence level definitions:
- very_high: The obligation's language maps directly to one sub-vertical's scope.
- high: This sub-vertical is clearly the best fit but touches adjacent areas.
- medium: Reasonable assignment; another sub-vertical could also own it.
- low: Scope overlap is significant; multiple sub-verticals have equal claim.
"""
        if feedback_examples:
            user_content += "\nSimilar past routings at this bank:\n"
            for ex in feedback_examples:
                user_content += (
                    f"- '{ex['action']}' → {ex['department']} / {ex.get('sub_vertical', 'N/A')} "
                    f"(Reason: {ex.get('reasoning', 'matching context')})\n"
                )

        try:
            response = ollama.chat(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                options={"temperature": 0}
            )

            raw = response["message"]["content"].strip()

            # Strip markdown code fences if present
            if raw.startswith("```"):
                lines = raw.split("\n")
                lines = [l for l in lines if not l.strip().startswith("```")]
                raw = "\n".join(lines).strip()

            result = json.loads(raw)

            # Validate department against available candidates
            dept = result.get("department", "")
            if dept not in dept_names:
                # Try case-insensitive match
                for valid_dept in dept_names:
                    if dept.lower().strip() == valid_dept.lower().strip():
                        result["department"] = valid_dept
                        dept = valid_dept
                        break
                else:
                    result["department"] = "Unassigned"

            # Map categorical confidence → calibrated int
            level_to_score = {"very_high": 88, "high": 73, "medium": 52, "low": 32}
            level = result.get("confidence_level", "medium").lower().strip()
            confidence = level_to_score.get(level, 52)

            return {
                "status": "success",
                "department": result.get("department", "Unassigned"),
                "sub_vertical": result.get("sub_vertical"),
                "sub_vertical_scope": result.get("sub_vertical_scope"),
                "confidence": confidence,
                "reasoning": result.get("reasoning", "Assigned via local LLM disambiguation.")
            }

        except Exception as e:
            return {
                "status": "error",
                "department": "Unassigned",
                "sub_vertical": None,
                "sub_vertical_scope": None,
                "confidence": 0,
                "reasoning": f"LLM Routing failed with error: {str(e)}"
            }
