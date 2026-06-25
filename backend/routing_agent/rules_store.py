import os
import json
import sys
import tempfile
from collections import defaultdict

if sys.platform == "win32":
    import msvcrt
else:
    import fcntl
def _lock_file(f):
    if sys.platform == "win32":
        pos = f.tell()
        f.seek(0)
        msvcrt.locking(f.fileno(), msvcrt.LK_LOCK, 1)
        f.seek(pos)
    else:
        fcntl.flock(f, fcntl.LOCK_EX)
def _unlock_file(f):
    if sys.platform == "win32":
        pos = f.tell()
        f.seek(0)
        msvcrt.locking(f.fileno(), msvcrt.LK_UNLCK, 1)
        f.seek(pos)
    else:
        fcntl.flock(f, fcntl.LOCK_UN)

class RulesStore:
    """
    Simulated JSON database store for taxonomy definitions, past resolved rules (few-shot context),
    and deterministic guardrail overrides.
    Implements atomic writes and file locking for production safety.
    """

    def __init__(self, db_path: str = None):
        if db_path is None:
            # Place it in the same directory as this file
            db_path = os.path.join(os.path.dirname(__file__), "routing_rules.json")
        self.db_path = db_path
        self._init_db_if_needed()

    def _init_db_if_needed(self):
        """Initializes the JSON database with default taxonomy if the file does not exist."""
        if not os.path.exists(self.db_path):
            default_taxonomy = {
                "Digital Banking Services": {
                    "Internet Banking (IB)": "Retail and corporate internet banking portals",
                    "Mobile Banking (MB)": "Mobile banking apps and services",
                    "Digital Lending": "Digital loan origination and servicing",
                    "API Banking / Open Banking": "Open APIs and fintech integrations"
                },
                "Cybersecurity Wing": {
                    "Security Operations Center (SOC)": "Threat monitoring and incident response",
                    "Vulnerability Management": "Scanning and remediation",
                    "Identity & Access Management": "Authentication and privileged access",
                    "Security Architecture": "Secure design and enterprise controls"
                },
                "IT Vertical": {
                    "Infrastructure Management": "Servers, storage and network services",
                    "Cloud Operations": "Cloud services and hosting",
                    "Application Management": "Core banking and enterprise applications",
                    "Business Continuity & Disaster Recovery": "Resilience and recovery operations"
                },
                "Procurement & Vendor Management": {
                    "IT Procurement": "Technology sourcing and contracts",
                    "Third-Party Risk Management": "Vendor due diligence and oversight",
                    "Cloud Vendor Management": "Cloud provider governance"
                },
                "Credit Card Vertical": {
                    "Card Issuance": "Card onboarding and activation",
                    "Card Operations": "Transaction processing and billing",
                    "Dispute & Chargeback Management": "Disputes and reversals"
                },
                "Payments Vertical": {
                    "UPI": "UPI transactions and merchant payments",
                    "NEFT": "Electronic fund transfers",
                    "RTGS": "Real-time gross settlement",
                    "Merchant Acquiring": "Merchant onboarding and acceptance"
                },
                "Compliance Department": {
                    "Regulatory Compliance": "Compliance monitoring and reporting",
                    "AML/CFT": "Anti-money laundering and sanctions"
                },
                "Legal Department": {
                    "Contract Management": "Vendor and customer contracts",
                    "Privacy & Data Protection": "Data privacy and consent management"
                },
                "Risk Management": {
                    "Operational Risk": "Operational risk assessment",
                    "Technology Risk": "Technology and cyber risk"
                },
                "Internal Audit": {
                    "Information Systems Audit": "IT and cybersecurity audits",
                    "Regulatory Audit": "Compliance assurance and testing"
                }
            }

            # Seed database with some baseline rules for testing
            default_rules = [
                {
                    "action": "Ensure that UPI transactions are processed within NPIC limits and daily reconciliation is done.",
                    "department": "Payments Vertical",
                    "sub_vertical": "UPI",
                    "reasoning": "Standard UPI operations and daily merchant reconciliations belong to Payments Vertical.",
                    "embedding": None
                },
                {
                    "action": "Submit the annual AML / CFT assessment report to the Financial Intelligence Unit.",
                    "department": "Compliance Department",
                    "sub_vertical": "AML/CFT",
                    "reasoning": "Filing AML/CFT reports is a core compliance and regulatory reporting duty.",
                    "embedding": None
                }
            ]

            # Default guardrails (simple context patterns that bypass embeddings/LLM)
            default_guardrails = [
                {
                    "pattern": "FEMA compliance",
                    "department": "Compliance Department",
                    "sub_vertical": "Regulatory Compliance"
                },
                {
                    "pattern": "KYC verification",
                    "department": "Compliance Department",
                    "sub_vertical": "AML/CFT"
                }
            ]

            data = {
                "taxonomy": default_taxonomy,
                "rules": default_rules,
                "guardrails": default_guardrails
            }
            self._save_raw(data)

    # ──────────────────────────────────────────────────────────────────────────
    # File Operations (Locking & Atomic Write)
    # ──────────────────────────────────────────────────────────────────────────

    def _read_raw(self) -> dict:
        """Reads data from JSON file while acquiring a shared file lock."""
        if not os.path.exists(self.db_path):
            return {"taxonomy": {}, "rules": [], "guardrails": []}
        
        with open(self.db_path, "r", encoding="utf-8") as f:
            try:
                # Exclusive lock for safe reading/writing sequence
                _lock_file(f)
                return json.load(f)
            except Exception:
                return {"taxonomy": {}, "rules": [], "guardrails": []}
            finally:
                _unlock_file(f)

    def _save_raw(self, data: dict):
        """Saves data to JSON file atomically using a tempfile and rename, with file locking."""
        dir_name = os.path.dirname(self.db_path)
        if not os.path.exists(dir_name) and dir_name != "":
            os.makedirs(dir_name, exist_ok=True)

        # Open the main DB file to hold the lock
        lock_file_path = self.db_path + ".lock"
        with open(lock_file_path, "w") as lock_f:
            try:
                _lock_file(lock_f)
                
                # Write to temporary file in the same directory (necessary for atomic atomic rename)
                with tempfile.NamedTemporaryFile("w", dir=dir_name, delete=False, encoding="utf-8", suffix=".tmp") as temp_f:
                    json.dump(data, temp_f, ensure_ascii=False, indent=2)
                    temp_f_path = temp_f.name

                # Replace the old file atomically
                os.replace(temp_f_path, self.db_path)
            finally:
                _unlock_file(lock_f)

    # ──────────────────────────────────────────────────────────────────────────
    # Public APIs
    # ──────────────────────────────────────────────────────────────────────────

    def get_taxonomy(self) -> dict:
        """Loads active taxonomy."""
        return self._read_raw().get("taxonomy", {})

    def save_taxonomy(self, taxonomy: dict):
        """Overwrites taxonomy."""
        data = self._read_raw()
        data["taxonomy"] = taxonomy
        self._save_raw(data)

    def get_rules(self) -> list:
        """Loads all resolved few-shot rules."""
        return self._read_raw().get("rules", [])

    def add_rule(self, action: str, department: str, sub_vertical: str, reasoning: str, embedding: list = None):
        """Adds a resolved few-shot rule, optionally with pre-computed embedding vector."""
        data = self._read_raw()
        rules = data.get("rules", [])
        
        # Check for duplicate
        for r in rules:
            if r["action"].strip().lower() == action.strip().lower():
                r["department"] = department
                r["sub_vertical"] = sub_vertical
                r["reasoning"] = reasoning
                r["embedding"] = embedding
                break
        else:
            rules.append({
                "action": action,
                "department": department,
                "sub_vertical": sub_vertical,
                "reasoning": reasoning,
                "embedding": embedding
            })
            
        data["rules"] = rules
        self._save_raw(data)

    def get_guardrails(self) -> list:
        """Loads active guardrails."""
        return self._read_raw().get("guardrails", [])

    def add_guardrail(self, pattern: str, department: str, sub_vertical: str):
        """Adds a deterministic override pattern."""
        data = self._read_raw()
        guardrails = data.get("guardrails", [])
        
        # Avoid duplicate pattern
        for g in guardrails:
            if g["pattern"].strip().lower() == pattern.strip().lower():
                g["department"] = department
                g["sub_vertical"] = sub_vertical
                break
        else:
            guardrails.append({
                "pattern": pattern,
                "department": department,
                "sub_vertical": sub_vertical
            })
            
        data["guardrails"] = guardrails
        self._save_raw(data)

    def find_matching_guardrail(self, action: str) -> dict:
        """
        Scans all guardrail override patterns. If a pattern is found inside the action
        (case-insensitive), returns the mapped assignment directly.
        """
        guardrails = self.get_guardrails()
        action_lower = action.lower()
        for g in guardrails:
            pat = g["pattern"].lower().strip()
            if pat in action_lower:
                return {
                    "department": g["department"],
                    "sub_vertical": g["sub_vertical"],
                    "reasoning": f"Deterministic Guardrail Triggered: Matched active pattern '{g['pattern']}'."
                }
        return None

    def find_similar_rules(self, action: str, embedder_func, top_n: int = 2, min_similarity: float = 0.65) -> list:
        """
        Calculates similarity of action against all past rules.
        Re-embeds rules dynamically if their vector cache is empty, updating the DB.
        """
        data = self._read_raw()
        rules = data.get("rules", [])
        if not rules:
            return []

        # Get target action embedding
        action_vec = embedder_func(action)

        scored_rules = []
        updated_any = False
        
        for r in rules:
            r_vec = r.get("embedding")
            if not r_vec:
                # Compute and cache embedding vector on-the-fly to avoid future Ollama costs
                r_vec = embedder_func(r["action"])
                r["embedding"] = r_vec
                updated_any = True
            
            # Simple pure-Python cosine similarity
            dot_prod = sum(x * y for x, y in zip(action_vec, r_vec))
            norm_a = sum(x * x for x in action_vec) ** 0.5
            norm_b = sum(y * y for y in r_vec) ** 0.5
            denom = norm_a * norm_b
            sim = float(dot_prod / denom) if denom > 0 else 0.0

            if sim >= min_similarity:
                scored_rules.append((sim, r))

        if updated_any:
            # Save the cached embeddings back to DB
            data["rules"] = rules
            self._save_raw(data)

        # Sort by similarity descending
        scored_rules = sorted(scored_rules, key=lambda x: -x[0])
        return [r for _, r in scored_rules[:top_n]]
