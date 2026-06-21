import sys
import os

# Add parent directory to sys.path so we can import routing_agent
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from routing_agent import RoutingAgent

def run_tests():
    print("Initializing RoutingAgent...")
    agent = RoutingAgent(ollama_model="llama3.2:latest")

    # Test cases that should trigger Stage 1 (Keyword Matcher)
    test_cases_stage1 = [
        {
            "action": "Ensure that UPI transactions are processed within NPIC limits and daily reconciliation is done.",
            "expected_dept": "Payments Vertical"
        },
        {
            "action": "Submit the annual AML / CFT assessment report to the Financial Intelligence Unit.",
            "expected_dept": "Compliance Department"
        },
        {
            "action": "Establish a board-approved Cybersecurity Policy and implement a Security Operations Center.",
            # This has keywords for Cybersecurity Wing (Cybersecurity, Security Operations Center),
            # but also "board-approved" (Board). It might be ambiguous or direct. Let's see how keyword matcher handles it.
        }
    ]

    print("\n--- Running Stage 1: Keyword Matcher Tests ---")
    for tc in test_cases_stage1:
        print(f"\nRouting action: '{tc['action']}'")
        res = agent.route_map(tc)
        print(f"Result:")
        print(f"  Assigned Department: {res['assigned_department']}")
        print(f"  Confidence: {res['confidence']}%")
        print(f"  Source: {res['routing_source']}")
        print(f"  Reasoning: {res['reasoning']}")

    # Test case that is ambiguous and should trigger Stage 2 (LLM Router)
    test_cases_stage2 = [
        {
            "action": "Evaluate the risk and potential cost trade-offs regarding outsourcing core systems hosting to a vendor and report to the board.",
            # This contains 'risk' (Risk Management), 'outsourcing' (Procurement & Vendor Management), 'hosting' (IT Vertical), and 'board' (Internal Audit / Board).
            # It will likely trigger Stage 2 (Local LLM Router) because of keyword ambiguity or low threshold.
            "clause_ref": "Para 3.2, Outsourcing",
            "priority": "HIGH"
        }
    ]

    print("\n--- Running Stage 2: Local LLM Disambiguation Tests ---")
    for tc in test_cases_stage2:
        print(f"\nRouting action: '{tc['action']}'")
        res = agent.route_map(tc)
        print(f"Result:")
        print(f"  Assigned Department: {res['assigned_department']}")
        print(f"  Confidence: {res['confidence']}%")
        print(f"  Source: {res['routing_source']}")
        print(f"  Reasoning: {res['reasoning']}")

if __name__ == "__main__":
    run_tests()
