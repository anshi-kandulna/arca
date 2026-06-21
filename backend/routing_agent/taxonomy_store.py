class TaxonomyStore:
    """
    Single source of truth for the department → sub-vertical → scope mapping.
    Source: theme_2.xlsx (Sub-Vertical Advisory Mapping sheet)
    No keyword matching logic — that responsibility is removed entirely.
    """

    def __init__(self):
        # Format: { "Business Vertical": { "Sub-Vertical Name": "Scope Description" } }
        self.taxonomy = {
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

    def get_all_departments(self) -> list:
        return list(self.taxonomy.keys())

    def get_taxonomy_for_llm(self, filter_departments: list = None) -> dict:
        """
        Returns the full taxonomy (or a dept-filtered slice) for passing to the LLM router.
        Format: { dept_name: { sub_vertical_name: scope_description } }
        """
        depts = filter_departments if filter_departments else list(self.taxonomy.keys())
        return {dept: self.taxonomy[dept] for dept in depts if dept in self.taxonomy}

    def get_all_scope_items(self) -> list:
        """
        Returns a flat list of (dept, sub_vertical_name, scope_description) tuples.
        Used by the EmbeddingRouter to pre-compute scope embeddings.
        """
        items = []
        for dept, sub_verticals in self.taxonomy.items():
            for sv_name, sv_scope in sub_verticals.items():
                items.append((dept, sv_name, sv_scope))
        return items
