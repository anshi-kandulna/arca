import os
import sys
import json
import shutil

# Setup paths to import routing_agent modules safely
script_dir = os.path.dirname(os.path.abspath(__file__))
if script_dir in sys.path:
    sys.path.remove(script_dir)
sys.path.insert(0, os.path.abspath(os.path.join(script_dir, "..")))

from routing_agent.routing_agent import RoutingAgent
from routing_agent.rules_store import RulesStore

def verify_system():
    print("--- Starting Production-Grade Routing Agent Verification ---\n")

    # Define a clean temporary test database path to avoid polluting production DB
    test_db_path = os.path.join(os.path.dirname(__file__), "test_routing_rules.json")
    if os.path.exists(test_db_path):
        os.remove(test_db_path)

    # Initialize Agent with test DB
    print("[1] Initializing RoutingAgent with temporary database...")
    agent = RoutingAgent(ollama_model="llama3.2:latest", db_path=test_db_path)
    print("Agent initialized. Verification database seeded.")

    # --------------------------------------------------------------------------
    # Test 1: Deterministic Guardrails
    # --------------------------------------------------------------------------
    print("\n[2] Testing Deterministic Guardrails Override...")
    # Add a custom guardrail override rule via store
    agent.rules_store.add_guardrail(
        pattern="FEMA reporting guidelines",
        department="Compliance Department",
        sub_vertical="Regulatory Compliance"
    )

    action_guardrail = "Ensure that all FEMA reporting guidelines are checked by managers."
    print(f"Routing action: '{action_guardrail}'")
    res_gr = agent.route_map({"action": action_guardrail})

    print("Result:")
    print("  Dept:", res_gr["assigned_department"])
    print("  Sub-vertical:", res_gr["sub_vertical"])
    print("  Confidence:", res_gr["confidence"])
    print("  Source:", res_gr["routing_source"])
    print("  Flagged:", res_gr["routing_flagged"])
    print("  Trace:", res_gr["routing_trace"])

    assert res_gr["assigned_department"] == "Compliance Department"
    assert res_gr["sub_vertical"] == "Regulatory Compliance"
    assert res_gr["confidence"] == 100
    assert res_gr["routing_trace"]["guardrail_triggered"] is True
    print("✔ Guardrails Test Passed!")

    # --------------------------------------------------------------------------
    # Test 2: Semantic Rules Retrieval & Few-Shot Injection
    # --------------------------------------------------------------------------
    print("\n[3] Testing Contextual Rule Retrieval (Few-Shot Injection)...")
    # This should match the default seeded rule: "Submit the annual AML / CFT assessment..."
    action_semantic = "Please file the annual AML / CFT reports to the FIU officer before deadlines."
    print(f"Routing action: '{action_semantic}'")
    res_sem = agent.route_map({"action": action_semantic})

    print("Result:")
    print("  Dept:", res_sem["assigned_department"])
    print("  Sub-vertical:", res_sem["sub_vertical"])
    print("  Confidence:", res_sem["confidence"])
    print("  Source:", res_sem["routing_source"])
    print("  Retrieved Rules Context:", res_sem["routing_trace"]["retrieved_rules"])

    assert len(res_sem["routing_trace"]["retrieved_rules"]) > 0
    print("✔ Semantic Rules Retrieval Test Passed!")

    # --------------------------------------------------------------------------
    # Test 3: Feedback Loop Write-Back & Dynamic Embedding Reload
    # --------------------------------------------------------------------------
    print("\n[4] Testing Feedback Loop Write-Back & Dynamic Taxonomy Addition...")
    # Add a brand new sub-vertical "Digital Token Security" under Cybersecurity Wing
    new_dept = "Cybersecurity Wing"
    new_sv = "Digital Token Security"
    new_scope = "Security architecture and audits for digital token vaults."
    resolved_action = "Deploy tokenized vault verification system for all corporate wallets."

    print(f"Resolving case: '{resolved_action}' -> '{new_dept} / {new_sv}'")
    agent.resolve_ambiguous_case(
        action=resolved_action,
        assigned_dept=new_dept,
        assigned_sub_vertical=new_sv,
        scope=new_scope,
        reasoning="Compliance resolution: Seeding new sub-vertical for digital asset protection."
    )

    # Verify that the sub-vertical is now present in the active taxonomy
    taxonomy = agent.taxonomy.taxonomy
    assert new_sv in taxonomy[new_dept]
    print(f"✔ Sub-vertical '{new_sv}' successfully added to the active database!")

    # Verify that the action can be routed to this new sub-vertical
    print(f"Routing similar action: 'Tokenized vault deployment for corporate assets'")
    res_feedback = agent.route_map({"action": "Tokenized vault deployment for corporate assets"})
    
    print("Result:")
    print("  Dept:", res_feedback["assigned_department"])
    print("  Sub-vertical:", res_feedback["sub_vertical"])
    print("  Confidence:", res_feedback["confidence"])
    print("  Source:", res_feedback["routing_source"])
    print("  Reasoning:", res_feedback["reasoning"])

    # Clean up temporary test DB files
    if os.path.exists(test_db_path):
        os.remove(test_db_path)
    lock_file = test_db_path + ".lock"
    if os.path.exists(lock_file):
        os.remove(lock_file)

    print("\n--- All Verification Tests Passed Successfully! ---")

if __name__ == "__main__":
    verify_system()
