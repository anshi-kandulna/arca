"""
seed_rules.py  —  One-time DB seeding script
=============================================
Populates routing_rules.json with high-quality labeled examples covering
all 10 departments.  On subsequent pipeline runs, the cosine-similarity
retrieval in RulesStore.find_similar_rules() will automatically surface
the 2-3 most relevant seeds per action — no prompt bloat.

Run ONCE (after enrich_taxonomy.py) before your first production run:
    python backend/routing_agent/seed_rules.py [--model gemma:4b] [--embedding-model mxbai-embed-large:latest]

Requirements: Ollama must be running with both the LLM and embedding model loaded.

Idempotent: RulesStore.add_rule() deduplicates by action text, so re-running
is safe (it will just refresh the stored embeddings).
"""

import os
import sys
import argparse

# ── Path setup ────────────────────────────────────────────────────────────────
SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))  # .../backend/routing_agent
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)                  # .../backend

# Python auto-inserts the script's directory as sys.path[0] when run directly.
# This makes `routing_agent.py` importable as a flat module, which conflicts
# with importing the `routing_agent/` directory as a package.
# Strip it so the package import wins.
if sys.path and os.path.abspath(sys.path[0]) == SCRIPT_DIR:
    sys.path.pop(0)

sys.path.insert(0, BACKEND_DIR)

from routing_agent.routing_agent import RoutingAgent

# ── Seed definitions ──────────────────────────────────────────────────────────
# Format: (action, department, sub_vertical, reasoning)
# Coverage: all 10 departments, ~2-4 examples each for the most commonly
# misrouted departments (Cybersecurity Wing, IT Vertical, Risk Management).

SEEDS = [

    # ── Cybersecurity Wing / Security Operations Center (SOC) ─────────────────
    (
        "Set up a Security Operations Centre to monitor and manage cyber risks in real time.",
        "Cybersecurity Wing",
        "Security Operations Center (SOC)",
        "SOC setup and real-time cyber risk monitoring is the core mandate of the SOC sub-vertical.",
    ),
    (
        "Ensure continuous surveillance and keep the bank updated on the latest emerging cyber threats.",
        "Cybersecurity Wing",
        "Security Operations Center (SOC)",
        "Continuous threat surveillance and intelligence feeds are primary SOC responsibilities.",
    ),
    (
        "Establish systems to collect and share threat information from local, national, and international sources.",
        "Cybersecurity Wing",
        "Security Operations Center (SOC)",
        "Threat intelligence collection and sharing is a core SOC function.",
    ),
    (
        "Define incident response procedures, allocate roles, and periodically test the incident response plan.",
        "Cybersecurity Wing",
        "Security Operations Center (SOC)",
        "Incident response planning and testing is owned by the SOC.",
    ),
    (
        "Actively participate in cyber drills conducted under the aegis of CERT-In and IDRBT.",
        "Cybersecurity Wing",
        "Security Operations Center (SOC)",
        "Cyber drill participation and coordination with CERT-In is a SOC responsibility.",
    ),

    # ── Cybersecurity Wing / Vulnerability Management ─────────────────────────
    (
        "Conduct periodic vulnerability assessment and penetration testing of all internet-facing systems.",
        "Cybersecurity Wing",
        "Vulnerability Management",
        "VA/PT exercises are owned by the Vulnerability Management sub-vertical.",
    ),
    (
        "Monitor the release of security patches from vendors and apply them expeditiously per patch management policy.",
        "Cybersecurity Wing",
        "Vulnerability Management",
        "Patch management and timely remediation of known vulnerabilities is Vulnerability Management.",
    ),
    (
        "Implement anti-malware and antivirus protection with behavioural detection across all endpoint devices.",
        "Cybersecurity Wing",
        "Vulnerability Management",
        "Malware defence and antivirus tooling falls under Vulnerability Management.",
    ),

    # ── Cybersecurity Wing / Identity & Access Management ────────────────────
    (
        "Implement centralised multi-factor authentication for access to all critical banking systems.",
        "Cybersecurity Wing",
        "Identity & Access Management",
        "MFA and centralised authentication are Identity & Access Management controls.",
    ),
    (
        "Disallow administrative rights on end-user workstations and enforce least-privilege access principles.",
        "Cybersecurity Wing",
        "Identity & Access Management",
        "Least-privilege and admin rights controls are Identity & Access Management.",
    ),
    (
        "Implement controls to log and monitor privileged and superuser access to critical servers and databases.",
        "Cybersecurity Wing",
        "Identity & Access Management",
        "Privileged access management and audit logging of admin sessions is IAM.",
    ),

    # ── Cybersecurity Wing / Security Architecture ────────────────────────────
    (
        "Design IT architecture to incorporate security controls and network segmentation at all times.",
        "Cybersecurity Wing",
        "Security Architecture",
        "Secure IT architecture design and network segmentation is Security Architecture.",
    ),
    (
        "Develop a data loss prevention strategy and classify data based on sensitivity and confidentiality.",
        "Cybersecurity Wing",
        "Security Architecture",
        "Data classification and DLP strategy belong to Security Architecture.",
    ),

    # ── IT Vertical / Infrastructure Management ───────────────────────────────
    (
        "Maintain an up-to-date centralised inventory of all authorised hardware, software, and network devices.",
        "IT Vertical",
        "Infrastructure Management",
        "Asset inventory management is an IT Infrastructure Management responsibility.",
    ),
    (
        "Put in place physical security measures and environmental controls for the bank's critical IT assets.",
        "IT Vertical",
        "Infrastructure Management",
        "Physical security and environmental controls for data centres are IT Infrastructure Management.",
    ),
    (
        "Prepare and maintain an up-to-date network architecture diagram including all wired and wireless networks.",
        "IT Vertical",
        "Infrastructure Management",
        "Network topology documentation is an IT Infrastructure Management task.",
    ),

    # ── IT Vertical / Application Management ─────────────────────────────────
    (
        "Incorporate information security controls across all stages of the application development lifecycle.",
        "IT Vertical",
        "Application Management",
        "Secure SDLC practices are owned by Application Management.",
    ),
    (
        "Manage changes to core banking applications using robust configuration management processes.",
        "IT Vertical",
        "Application Management",
        "Application change management and configuration baseline is Application Management.",
    ),

    # ── IT Vertical / Business Continuity & Disaster Recovery ────────────────
    (
        "Ensure BCP and DR capabilities meet the bank's cyber resilience objectives and recovery time targets.",
        "IT Vertical",
        "Business Continuity & Disaster Recovery",
        "BCP/DR planning and testing against RTO objectives is this sub-vertical's mandate.",
    ),
    (
        "Develop a Cyber Crisis Management Plan and integrate it into the Board-approved strategy.",
        "IT Vertical",
        "Business Continuity & Disaster Recovery",
        "CCMP development is a BC/DR responsibility linked to cyber resilience.",
    ),

    # ── Risk Management / Technology Risk ────────────────────────────────────
    (
        "Develop a Board-approved cyber risk framework with risk categorisation and key risk indicators.",
        "Risk Management",
        "Technology Risk",
        "Cyber risk governance frameworks and KRIs are Technology Risk responsibilities.",
    ),
    (
        "Identify and assess inherent risks in technologies adopted, delivery channels, and internal threats.",
        "Risk Management",
        "Technology Risk",
        "Inherent technology risk identification is a Technology Risk function.",
    ),
    (
        "Ensure Board-level oversight and involvement in setting the right tone on cybersecurity governance.",
        "Risk Management",
        "Technology Risk",
        "Board-level cyber governance and risk appetite setting is Technology Risk.",
    ),

    # ── Risk Management / Operational Risk ───────────────────────────────────
    (
        "Implement risk-based transaction monitoring across all delivery channels for fraud risk management.",
        "Risk Management",
        "Operational Risk",
        "Fraud risk transaction monitoring is an Operational Risk control.",
    ),

    # ── Compliance Department / Regulatory Compliance ─────────────────────────
    (
        "Report all cybersecurity incidents to the Reserve Bank of India in the prescribed format.",
        "Compliance Department",
        "Regulatory Compliance",
        "Incident reporting to the RBI is a regulatory compliance filing obligation.",
    ),
    (
        "Place a copy of the RBI circular before the Board of Directors in its ensuing meeting.",
        "Compliance Department",
        "Regulatory Compliance",
        "Board circulation of RBI directives is a regulatory compliance formality.",
    ),

    # ── Internal Audit / Information Systems Audit ────────────────────────────
    (
        "Manage and analyse audit logs systematically to detect, understand, and recover from cyber attacks.",
        "Internal Audit",
        "Information Systems Audit",
        "Audit log management and forensic readiness are Information Systems Audit responsibilities.",
    ),
    (
        "Independently assess adherence to the cyber resilience framework through audits by qualified professionals.",
        "Internal Audit",
        "Information Systems Audit",
        "Independent compliance audits of IT/cyber controls are Information Systems Audit.",
    ),

    # ── Procurement & Vendor Management / Third-Party Risk Management ─────────
    (
        "Conduct effective due diligence and risk assessment before outsourcing critical processes to third-party vendors.",
        "Procurement & Vendor Management",
        "Third-Party Risk Management",
        "Vendor due diligence and outsourcing risk assessment is Third-Party Risk Management.",
    ),
    (
        "Mandate background checks and non-disclosure agreements for all third-party service provider personnel.",
        "Procurement & Vendor Management",
        "Third-Party Risk Management",
        "Personnel vetting for third parties is a Third-Party Risk Management control.",
    ),

    # ── Legal Department / Contract Management ────────────────────────────────
    (
        "Enter into an agreement with service providers that includes right of audit by the bank and regulatory inspection.",
        "Legal Department",
        "Contract Management",
        "Audit rights and inspection clauses in vendor contracts are a Contract Management obligation.",
    ),

    # ── Legal Department / Privacy & Data Protection ─────────────────────────
    (
        "Adhere to legal requirements on data localisation and movement of customer data across national borders.",
        "Legal Department",
        "Privacy & Data Protection",
        "Data localisation and cross-border data transfer rules are Privacy & Data Protection.",
    ),

    # ── Digital Banking Services / Internet Banking (IB) ─────────────────────
    (
        "Educate customers on the risks of sharing login credentials with third-party vendors.",
        "Digital Banking Services",
        "Internet Banking (IB)",
        "Customer security education for online banking credentials is an Internet Banking responsibility.",
    ),
    (
        "Encourage customers to report phishing mails and phishing sites and take effective remedial action.",
        "Digital Banking Services",
        "Internet Banking (IB)",
        "Anti-phishing customer communication is an Internet Banking (IB) function.",
    ),

    # ── Payments Vertical / UPI ───────────────────────────────────────────────
    (
        "Ensure that UPI transactions are processed within NPCI daily limits and reconciliation is completed.",
        "Payments Vertical",
        "UPI",
        "UPI transaction processing and daily reconciliation is a Payments Vertical / UPI function.",
    ),
]


# ── Runner ────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Seed routing_rules.json with labeled examples.")
    parser.add_argument("--model",           default="gemma:4b",
                        help="Ollama LLM model name (only used at RoutingAgent init)")
    parser.add_argument("--embedding-model", default="mxbai-embed-large:latest",
                        help="Ollama embedding model name")
    parser.add_argument("--db",              default=None,
                        help="Path to routing_rules.json (default: auto-detected)")
    args = parser.parse_args()

    print(f"Initialising RoutingAgent (model={args.model}, "
          f"embedding={args.embedding_model})...")
    print("Note: EmbeddingRouter will pre-compute scope embeddings — this takes ~20s.\n")

    agent = RoutingAgent(
        ollama_model     = args.model,
        embedding_model  = args.embedding_model,
        db_path          = args.db,
    )

    total   = len(SEEDS)
    success = 0
    failed  = []

    for i, (action, dept, sv, reasoning) in enumerate(SEEDS, 1):
        print(f"[{i:02d}/{total}] {dept} / {sv}")
        print(f"       Action: {action[:80]}{'...' if len(action)>80 else ''}")
        try:
            agent.resolve_ambiguous_case(
                action               = action,
                assigned_dept        = dept,
                assigned_sub_vertical = sv,
                reasoning            = reasoning,
            )
            print(f"       ✓ Seeded\n")
            success += 1
        except Exception as e:
            print(f"       ✗ Failed: {e}\n")
            failed.append((i, action[:60], str(e)))

    # ── Summary ───────────────────────────────────────────────────────────────
    print("=" * 60)
    print(f"Seeding complete: {success}/{total} succeeded.")
    if failed:
        print(f"\nFailed ({len(failed)}):")
        for idx, action, err in failed:
            print(f"  [{idx:02d}] {action!r} — {err}")
    else:
        print("All seeds stored with embeddings. DB is ready.")
    print("\nNext steps:")
    print("  1. Run enrich_taxonomy.py (if not already done)")
    print("  2. Run the pipeline: python run_pipeline.py --mode route_only")


if __name__ == "__main__":
    main()
