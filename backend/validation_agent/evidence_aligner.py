# pyrefly: ignore [missing-import]
import ollama
import json

ALIGNMENT_PROMPT = """You are a compliance auditor verifying evidence against a regulatory obligation.

Obligation: {obligation_text}
Expected Evidence Signal: {signal_description}

Evidence Submitted (Notes + Document Content):
{combined_evidence_text}

Question: Does the submitted evidence adequately demonstrate this specific signal?
Return ONLY valid JSON:
{{
  "status": "MET | PARTIALLY_MET | NOT_MET",
  "confidence": <integer between 0 and 100>,
  "reasoning": "one sentence explaining your assessment referencing specific text"
}}"""

def align_evidence(map_obj, intel_data, combined_evidence_text):
    signals = intel_data.get("evidence_signals", [])
    
    # Truncate text to roughly 4000 words to avoid context limits
    words = combined_evidence_text.split()
    if len(words) > 4000:
        combined_evidence_text = " ".join(words[:4000]) + "\n...[TRUNCATED]"
        
    results = []
    
    for signal in signals:
        prompt = ALIGNMENT_PROMPT.format(
            obligation_text=map_obj.obligation_text,
            signal_description=signal["signal"],
            combined_evidence_text=combined_evidence_text
        )
        
        try:
            llm_response = ollama.generate(model="qwen2.5:7b", prompt=prompt, format="json")
            llm_res = json.loads(llm_response['response'])
        except Exception as e:
            print(f"LLM Error in alignment: {e}")
            llm_res = {"status": "NOT_MET", "confidence": 0, "reasoning": "Error validating signal"}
            
        results.append({
            "signal": signal["signal"],
            "weight": signal.get("weight", "IMPORTANT"),
            "status": llm_res.get("status", "NOT_MET"),
            "confidence": llm_res.get("confidence", 0),
            "reasoning": llm_res.get("reasoning", "")
        })
        
    return results
