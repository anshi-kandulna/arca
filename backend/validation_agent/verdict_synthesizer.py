def synthesize_verdict(signal_results):
    weight_map = {"CRITICAL": 3.0, "IMPORTANT": 2.0, "SUPPORTING": 1.0}
    status_map = {"MET": 1.0, "PARTIALLY_MET": 0.5, "NOT_MET": 0.0}
    
    total_weight = 0.0
    earned_score = 0.0
    
    print(f"[Verdict Synthesizer] Evaluating {len(signal_results)} signal results...")
    
    for res in signal_results:
        w = weight_map.get(res.get("weight", "IMPORTANT").upper(), 2.0)
        s = status_map.get(res.get("status", "NOT_MET").upper(), 0.0)
        
        total_weight += w
        earned_score += (w * s)
        
    if total_weight == 0:
        pct = 0
    else:
        pct = int((earned_score / total_weight) * 100)
        
    print(f"[Verdict Synthesizer] Total Weight: {total_weight}, Earned: {earned_score}, Percentage: {pct}%")
        
    if pct >= 75:
        verdict = "Satisfied"
    elif pct >= 45:
        verdict = "Partial"
    else:
        verdict = "Not Satisfied"
        
    auto_close = (verdict == "Satisfied" and pct >= 90)
    
    # Missing elements: signals that are NOT_MET and are CRITICAL or IMPORTANT
    missing = [
        r["signal"] for r in signal_results 
        if r.get("status") == "NOT_MET" and r.get("weight") in ["CRITICAL", "IMPORTANT"]
    ]
    
    return {
        "verdict": verdict,
        "confidence": pct,
        "auto_close": auto_close,
        "reasoning": f"Evidence satisfied {pct}% of the required signals based on the document content.",
        "missing_elements": missing,
        "signal_breakdown": signal_results
    }
