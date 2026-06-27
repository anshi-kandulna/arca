# pyrefly: ignore [missing-import]
import ollama
import json

OBLIGATION_INTEL_PROMPT = """You are a regulatory compliance expert at an Indian bank.

Analyze this regulatory obligation and determine what evidence would prove compliance.

Obligation: {obligation_text}
Clause Reference: {clause_ref}
Department: {business_vertical}

Classify this obligation and determine what evidence signals would demonstrate compliance.

Return ONLY valid JSON:
{{
  "obligation_type": "DOCUMENT | PROCESS | SYSTEM | REPORTING | APPROVAL | INVENTORY | CONTROL",
  "core_requirement": "one sentence: what EXACTLY must be proven",
  "evidence_signals": [
    {{
      "signal": "what to look for in evidence",
      "weight": "CRITICAL | IMPORTANT | SUPPORTING",
      "example": "example of what satisfying evidence would mention"
    }}
  ],
  "red_flags": ["things that would indicate non-compliance or inadequate evidence"]
}}"""

def extract_obligation_intel(map_obj):
    prompt = OBLIGATION_INTEL_PROMPT.format(
        obligation_text=map_obj.obligation_text,
        clause_ref=map_obj.clause_ref or "N/A",
        business_vertical=map_obj.business_vertical or "N/A"
    )
    
    response = ollama.generate(
        model="qwen2.5:7b",
        prompt=prompt,
        format="json"
    )
    
    try:
        return json.loads(response['response'])
    except Exception as e:
        print(f"Error parsing Phase 1 response: {e}")
        # Fallback empty structure
        return {
            "obligation_type": "PROCESS",
            "core_requirement": map_obj.obligation_text,
            "evidence_signals": [{"signal": "Evidence matches obligation", "weight": "CRITICAL", "example": ""}],
            "red_flags": []
        }
