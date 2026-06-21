import re

class KeywordMatcher:
    def __init__(self):
        # Taxonomy mapping from theme_2.xlsx
        # Format: { "Business Vertical": { "sub_verticals": [...], "scope": {...}, "keywords": [...] } }
        self.taxonomy = {
            "Digital Banking Services": {
                "sub_verticals": {
                    "Internet Banking (IB)": "Retail and corporate internet banking portals",
                    "Mobile Banking (MB)": "Mobile banking apps and services",
                    "Digital Lending": "Digital loan origination and servicing",
                    "API Banking / Open Banking": "Open APIs and fintech integrations"
                },
                "keywords": [
                    r"internet banking", r"mobile banking", r"digital lending", r"open banking", r"api banking",
                    r"banking portal", r"banking app", r"loan origination", r"fintech integration", r"payment security control"
                ]
            },
            "Cybersecurity Wing": {
                "sub_verticals": {
                    "Security Operations Center (SOC)": "Threat monitoring and incident response",
                    "Vulnerability Management": "Scanning and remediation",
                    "Identity & Access Management": "Authentication and privileged access",
                    "Security Architecture": "Secure design and enterprise controls"
                },
                "keywords": [
                    r"security operations center", r"soc", r"vulnerability management", r"identity.*access management",
                    r"iam", r"security architecture", r"cyber security", r"cyber resilience", r"threat monitoring",
                    r"incident response", r"vulnerability scanning", r"remediation", r"authentication", r"privileged access",
                    r"firewall", r"vapt", r"penetration test", r"cyber threat"
                ]
            },
            "IT Vertical": {
                "sub_verticals": {
                    "Infrastructure Management": "Servers, storage and network services",
                    "Cloud Operations": "Cloud services and hosting",
                    "Application Management": "Core banking and enterprise applications",
                    "Business Continuity & Disaster Recovery": "Resilience and recovery operations"
                },
                "keywords": [
                    r"infrastructure management", r"cloud operations", r"application management", r"business continuity",
                    r"disaster recovery", r"bcp", r"dr", r"server", r"storage", r"network services", r"cloud hosting",
                    r"core banking", r"enterprise application"
                ]
            },
            "Procurement & Vendor Management": {
                "sub_verticals": {
                    "IT Procurement": "Technology sourcing and contracts",
                    "Third-Party Risk Management": "Vendor due diligence and oversight",
                    "Cloud Vendor Management": "Cloud provider governance"
                },
                "keywords": [
                    r"procurement", r"vendor management", r"third-party risk", r"cloud vendor", r"technology sourcing",
                    r"outsourcing of it", r"vendor due diligence", r"service level agreement", r"sla"
                ]
            },
            "Credit Card Vertical": {
                "sub_verticals": {
                    "Card Issuance": "Card onboarding and activation",
                    "Card Operations": "Transaction processing and billing",
                    "Dispute & Chargeback Management": "Disputes and reversals"
                },
                "keywords": [
                    r"credit card", r"debit card", r"card issuance", r"card operations", r"chargeback", r"card billing",
                    r"dispute management"
                ]
            },
            "Payments Vertical": {
                "sub_verticals": {
                    "UPI": "UPI transactions and merchant payments",
                    "NEFT": "Electronic fund transfers",
                    "RTGS": "Real-time gross settlement",
                    "Merchant Acquiring": "Merchant onboarding and acceptance"
                },
                "keywords": [
                    r"upi", r"neft", r"rtgs", r"merchant acquiring", r"fund transfer", r"payment transaction",
                    r"transaction processing", r"merchant onboarding"
                ]
            },
            "Compliance Department": {
                "sub_verticals": {
                    "Regulatory Compliance": "Compliance monitoring and reporting",
                    "AML/CFT": "Anti-money laundering and sanctions"
                },
                "keywords": [
                    r"regulatory compliance", r"aml", r"cft", r"anti-money laundering", r"sanction", r"kyc",
                    r"know your customer", r"compliance monitoring", r"regulatory reporting"
                ]
            },
            "Legal Department": {
                "sub_verticals": {
                    "Contract Management": "Vendor and customer contracts",
                    "Privacy & Data Protection": "Data privacy and consent management"
                },
                "keywords": [
                    r"contract management", r"privacy", r"data protection", r"dpdp", r"personal data",
                    r"consent management", r"legal opinion", r"litigation", r"court", r"tribunal", r"penalty", r"legislation"
                ]
            },
            "Risk Management": {
                "sub_verticals": {
                    "Operational Risk": "Operational risk assessment",
                    "Technology Risk": "Technology and cyber risk"
                },
                "keywords": [
                    r"operational risk", r"technology risk", r"risk management", r"risk assessment", r"capital adequacy",
                    r"npa", r"provisioning", r"lcr", r"nsfr", r"stress test", r"credit risk", r"market risk"
                ]
            },
            "Internal Audit": {
                "sub_verticals": {
                    "Information Systems Audit": "IT and cybersecurity audits",
                    "Regulatory Audit": "Compliance assurance and testing"
                },
                "keywords": [
                    r"internal audit", r"information systems audit", r"is audit", r"regulatory audit", r"audit framework",
                    r"compliance check", r"audit committee"
                ]
            }
        }

    def get_taxonomy_for_llm(self, filter_departments: list = None) -> dict:
        """
        Returns the taxonomy slice needed by the LLM router.
        If filter_departments is provided, only those departments are included.
        Format: { dept_name: { sub_vertical_name: scope_description, ... }, ... }
        """
        depts = filter_departments if filter_departments else list(self.taxonomy.keys())
        return {
            dept: self.taxonomy[dept]["sub_verticals"]
            for dept in depts
            if dept in self.taxonomy
        }

    def _keyword_specificity(self, kw: str) -> float:
        """Returns 0.0–1.0; longer patterns with fewer regex metacharacters score higher."""
        clean = re.sub(r'[\\.*+?()\[\]{}|^$]', '', kw).strip()
        return min(1.0, len(clean) / 25.0)

    def _score_single_match(self, dept: str, matched_kws: list) -> int:
        """
        Formula: base 55 + up to 25 for match breadth + up to 15 for keyword specificity.
        A single vague keyword like 'soc' scores ~58; three specific ones score ~90+.
        """
        all_kws = self.taxonomy[dept]["keywords"]
        match_ratio = len(matched_kws) / len(all_kws)
        avg_spec = sum(self._keyword_specificity(kw) for kw in matched_kws) / len(matched_kws)
        return min(95, round(55 + 25 * match_ratio + 15 * avg_spec))

    def match(self, action_text: str):
        """
        Scans action_text for keywords.
        Returns matched department and details if a single confident match is found,
        or multiple matching departments if ambiguous,
        or None if no match.
        """
        action_lower = action_text.lower()
        matches = {}

        for dept, data in self.taxonomy.items():
            dept_matches = []
            for kw in data["keywords"]:
                if re.search(kw, action_lower):
                    dept_matches.append(kw)
            if dept_matches:
                matches[dept] = dept_matches

        if not matches:
            return {
                "status": "unassigned",
                "reasoning": "No keyword matches found in taxonomy.",
                "department": "Unassigned",
                "sub_vertical": None,
                "confidence": 0
            }

        if len(matches) == 1:
            dept = list(matches.keys())[0]
            matched_kws = matches[dept]
            confidence = self._score_single_match(dept, matched_kws)
            return {
                "status": "matched",
                "reasoning": f"Keyword match(es) '{', '.join(matched_kws)}' found for department '{dept}'.",
                "department": dept,
                "confidence": confidence
            }

        # Ambiguous match — compute dominance of the top department
        sorted_matches = sorted(matches.items(), key=lambda x: len(x[1]), reverse=True)
        top_dept, top_kws = sorted_matches[0]
        second_count = len(sorted_matches[1][1])
        lead = len(top_kws) - second_count
        total = sum(len(kws) for kws in matches.values())
        dominance = lead / total if total > 0 else 0

        reasoning = f"Ambiguity detected. Matches found in multiple departments: {', '.join([f'{d} ({len(kws)})' for d, kws in sorted_matches])}."
        return {
            "status": "ambiguous",
            "reasoning": reasoning,
            "matched_departments": list(matches.keys()),
            "dominant_department": top_dept,
            "dominance": round(dominance, 2),
            "confidence": round(30 + 20 * dominance)  # 30–50, always triggers LLM fallback
        }
