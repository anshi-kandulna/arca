import os
import sys

# Setup paths to import routing_agent modules safely
script_dir = os.path.dirname(os.path.abspath(__file__))
if script_dir in sys.path:
    sys.path.remove(script_dir)
sys.path.insert(0, os.path.abspath(os.path.join(script_dir, "..")))

from routing_agent.routing_agent import RoutingAgent

def run_standard_routing_tests():
    print("======================================================================")
    print("Starting Standard Routing Agent Evaluation Test")
    print("======================================================================\n")

    # Initialize the Routing Agent with standard database and circular context
    print("Initializing RoutingAgent (with circular context & embedding scopes)...")
    circular_context = ["RBI/2015-16/418", "Cyber Security Framework in Banks"]
    agent = RoutingAgent(
        ollama_model="llama3.2:latest",
        embedding_model="mxbai-embed-large:latest",
        circular_context=circular_context
    )
    print("Agent initialized successfully.")
    
    # Check if the taxonomy contains enriched "Excludes:" clauses from enrich_taxonomy.py
    has_excludes = False
    for dept, svs in agent.taxonomy.taxonomy.items():
        for sv, scope in svs.items():
            if "excludes:" in scope.lower():
                has_excludes = True
                break
    if has_excludes:
        print("Taxonomy Status: Enriched scope descriptions (Excludes clauses active) found.\n")
    else:
        print("Taxonomy Status: Baseline scope descriptions active.\n")

    # Define standard bank compliance test obligations.
    # These actions do not contain deterministic guardrail patterns ("FEMA compliance", "KYC verification").
    test_obligations = [
        {
            "action": "Establish security log analysis procedures for all external-facing banking applications.",
            "clause_ref": "Para 4.1",
            "priority": "HIGH"
        },
        {
            "action": "Maintain records of credit card billing disputes and resolve them within 30 days.",
            "clause_ref": "Para 7.2.3",
            "priority": "MEDIUM"
        },
        {
            "action": "Conduct a comprehensive risk assessment of cloud storage services used for customer records.",
            "clause_ref": "Section 9",
            "priority": "HIGH"
        }
    ]

    for idx, tc in enumerate(test_obligations, 1):
        print(f"----------------------------------------------------------------------")
        print(f"Test Obligation #{idx}")
        print(f"----------------------------------------------------------------------")
        print(f"Action Text:  '{tc['action']}'")
        print(f"Clause Ref:   {tc['clause_ref']}")
        print(f"Priority:     {tc['priority']}")
        print("Routing...")
        
        # Route through the agent
        res = agent.route_map(tc)
        
        print("\nRouting Results:")
        print(f"  Assigned Department: {res['assigned_department']}")
        print(f"  Sub-Vertical:        {res['sub_vertical']}")
        print(f"  Scope Match:         {res['sub_vertical_scope']}")
        print(f"  Calibrated Score:    {res['confidence']}%")
        print(f"  Routing Source:      {res['routing_source']}")
        print(f"  Flagged for Review:  {res['routing_flagged']}")
        print(f"  Reasoning:           {res['reasoning']}")
        
        print("\nProposed Candidates (Dropdown options):")
        for cand in res.get("proposed_candidates", []):
            print(f"  - {cand['department']} / {cand['sub_vertical']} (Conf: {cand['confidence']}%, Source: {cand['source']})")
            
        print("\nAudit Decision Trace:")
        trace = res.get("routing_trace", {})
        print(f"  - Guardrail Triggered:      {trace.get('guardrail_triggered')}")
        print(f"  - Few-Shot Rules Retrieved: {len(trace.get('retrieved_rules', []))}")
        for r in trace.get("retrieved_rules", []):
            print(f"    * Matched Past Action: '{r['action'][:60]}...' -> {r['department']}")
        print(f"  - Self-Correction Retries:  {trace.get('self_correction_attempts')}")
        print(f"  - Format Validation Errors: {trace.get('validation_errors')}")
        print()

if __name__ == "__main__":
    run_standard_routing_tests()
