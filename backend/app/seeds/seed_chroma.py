"""Seed ChromaDB with 20 synthetic business needs for demo and duplicate detection."""

from __future__ import annotations

import logging

from app.core.chroma import get_collection
from app.core.embedding_client import embed_texts

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 20 realistic synthetic business needs (English, DXC innovation context)
# ---------------------------------------------------------------------------

SEED_NEEDS: list[dict[str, str | list[str] | dict]] = [
    {
        "id": "BN-2025-001",
        "pitch": "Implement an intelligent chatbot based on generative AI for internal client support, able to answer frequent questions about HR and IT processes in real time.",
        "horizon": "short_term",
        "status": "submitted",
        "tags": {"objective": "cx_improvement", "domain": ["AI", "HR"], "impact": ["Cost", "CustomerExperience"], "origin": "operational_problem"},
    },
    {
        "id": "BN-2025-002",
        "pitch": "Develop an anomaly detection platform for financial flows using machine learning models to identify suspicious transactions before validation.",
        "horizon": "mid_term",
        "status": "in_qualification",
        "tags": {"objective": "risk_mitigation", "domain": ["AI", "Finance"], "impact": ["Risk", "Cost"], "origin": "market_driver"},
    },
    {
        "id": "BN-2025-003",
        "pitch": "Migrate the on-premise infrastructure to a multi-tenant hybrid cloud architecture to reduce hosting costs by 40% while improving resilience.",
        "horizon": "long_term",
        "status": "draft",
        "tags": {"objective": "cost_reduction", "domain": ["Cloud", "Operations"], "impact": ["Cost", "Risk"], "origin": "operational_problem"},
    },
    {
        "id": "BN-2025-004",
        "pitch": "Implement a zero-trust solution to secure remote access for employees working from home, with biometric authentication and behavioral analysis.",
        "horizon": "mid_term",
        "status": "submitted",
        "tags": {"objective": "risk_mitigation", "domain": ["Cybersecurity"], "impact": ["Risk"], "origin": "market_driver"},
    },
    {
        "id": "BN-2025-005",
        "pitch": "Create a unified data lake consolidating all customer data sources to enable cross-channel predictive analytics and improve retention rates.",
        "horizon": "long_term",
        "status": "rework",
        "tags": {"objective": "cx_improvement", "domain": ["Data", "Cloud"], "impact": ["Revenue", "CustomerExperience"], "origin": "client_request"},
    },
    {
        "id": "BN-2025-006",
        "pitch": "Automate the recruitment process with an AI-based resume evaluation tool, including initial screening and candidate scoring.",
        "horizon": "short_term",
        "status": "draft",
        "tags": {"objective": "cost_reduction", "domain": ["AI", "HR"], "impact": ["Cost"], "origin": "operational_problem"},
    },
    {
        "id": "BN-2025-007",
        "pitch": "Launch a mobile self-service application for enterprise clients, enabling real-time ticket tracking, SLA consultation, and direct communication with the support team.",
        "horizon": "mid_term",
        "status": "in_qualification",
        "tags": {"objective": "cx_improvement", "domain": ["Operations"], "impact": ["CustomerExperience", "Revenue"], "origin": "client_request"},
    },
    {
        "id": "BN-2025-008",
        "pitch": "Deploy an RPA solution to automate monthly accounting reconciliations and eliminate manual errors in financial consolidation.",
        "horizon": "short_term",
        "status": "submitted",
        "tags": {"objective": "cost_reduction", "domain": ["Finance", "AI"], "impact": ["Cost", "Risk"], "origin": "operational_problem"},
    },
    {
        "id": "BN-2025-009",
        "pitch": "Design a gamified online cybersecurity training program to raise awareness among 5,000 employees about phishing and social engineering risks.",
        "horizon": "short_term",
        "status": "abandoned",
        "tags": {"objective": "risk_mitigation", "domain": ["Cybersecurity", "HR"], "impact": ["Risk"], "origin": "operational_problem"},
    },
    {
        "id": "BN-2025-010",
        "pitch": "Set up a predictive IT infrastructure monitoring system using time-series analysis to anticipate outages 24 hours in advance.",
        "horizon": "mid_term",
        "status": "draft",
        "tags": {"objective": "cost_reduction", "domain": ["AI", "Operations"], "impact": ["Cost", "Risk"], "origin": "operational_problem"},
    },
    {
        "id": "BN-2025-011",
        "pitch": "Explore blockchain opportunities for contract traceability and decentralized legal document management between business partners.",
        "horizon": "long_term",
        "status": "abandoned",
        "tags": {"objective": "market_opportunity", "domain": ["Other", "Operations"], "impact": ["Risk", "Revenue"], "origin": "market_driver"},
    },
    {
        "id": "BN-2025-012",
        "pitch": "Optimize the logistics supply chain with a digital twin that simulates distribution scenarios and reduces delivery lead times by 25%.",
        "horizon": "long_term",
        "status": "submitted",
        "tags": {"objective": "cost_reduction", "domain": ["AI", "Operations"], "impact": ["Cost", "CustomerExperience"], "origin": "market_driver"},
    },
    {
        "id": "BN-2025-013",
        "pitch": "Develop a unified client portal with AI-personalized service recommendations, integrating a suggestion engine based on usage history.",
        "horizon": "mid_term",
        "status": "draft",
        "tags": {"objective": "cx_improvement", "domain": ["AI", "Data"], "impact": ["Revenue", "CustomerExperience"], "origin": "client_request"},
    },
    {
        "id": "BN-2025-014",
        "pitch": "Bring all personal data processing into GDPR compliance using an automated flow-mapping and consent-management tool.",
        "horizon": "short_term",
        "status": "in_qualification",
        "tags": {"objective": "risk_mitigation", "domain": ["Data", "Cybersecurity"], "impact": ["Risk"], "origin": "market_driver"},
    },
    {
        "id": "BN-2025-015",
        "pitch": "Create an internal marketplace of reusable microservices and APIs to accelerate new application development and reduce code duplication.",
        "horizon": "mid_term",
        "status": "rework",
        "tags": {"objective": "cost_reduction", "domain": ["Cloud", "Operations"], "impact": ["Cost"], "origin": "operational_problem"},
    },
    {
        "id": "BN-2025-016",
        "pitch": "Offer a real-time business intelligence service with interactive dashboards powered by consolidated multi-source data for business leadership teams.",
        "horizon": "short_term",
        "status": "submitted",
        "tags": {"objective": "market_opportunity", "domain": ["Data", "AI"], "impact": ["Revenue"], "origin": "client_request"},
    },
    {
        "id": "BN-2025-017",
        "pitch": "Deploy an edge computing infrastructure to reduce latency for industrial IoT applications and process data close to the sensors.",
        "horizon": "long_term",
        "status": "draft",
        "tags": {"objective": "market_opportunity", "domain": ["Cloud", "Operations"], "impact": ["Revenue", "Cost"], "origin": "market_driver"},
    },
    {
        "id": "BN-2025-018",
        "pitch": "Automate regulatory report generation for the compliance department using NLP to extract and structure relevant information from internal documents.",
        "horizon": "short_term",
        "status": "in_qualification",
        "tags": {"objective": "cost_reduction", "domain": ["AI", "Finance"], "impact": ["Cost", "Risk"], "origin": "operational_problem"},
    },
    {
        "id": "BN-2025-019",
        "pitch": "Implement a digital wellbeing program for employees with an application for workload tracking, overload detection, and personalized recommendations.",
        "horizon": "mid_term",
        "status": "abandoned",
        "tags": {"objective": "cx_improvement", "domain": ["HR", "AI"], "impact": ["CustomerExperience"], "origin": "operational_problem"},
    },
    {
        "id": "BN-2025-020",
        "pitch": "Build an open innovation platform connecting technology startups with internal business needs to co-develop solutions through rapid PoCs.",
        "horizon": "long_term",
        "status": "draft",
        "tags": {"objective": "market_opportunity", "domain": ["Other", "AI"], "impact": ["Revenue", "CustomerExperience"], "origin": "market_driver"},
    },
]


def seed_chromadb() -> None:
    """Insert 20 synthetic business needs into ChromaDB if the collection is empty."""
    collection = get_collection()

    if collection.count() > 0:
        logger.info("ChromaDB collection already seeded (%d entries), skipping.", collection.count())
        return

    logger.info("Seeding ChromaDB with %d synthetic business needs...", len(SEED_NEEDS))

    pitches = [need["pitch"] for need in SEED_NEEDS]
    ids = [need["id"] for need in SEED_NEEDS]
    metadatas = [{"status": need["status"]} for need in SEED_NEEDS]

    # Batch embed all pitches
    embeddings = embed_texts(pitches)  # type: ignore[arg-type]

    collection.add(
        ids=ids,  # type: ignore[arg-type]
        embeddings=embeddings,
        documents=pitches,  # type: ignore[arg-type]
        metadatas=metadatas,  # type: ignore[arg-type]
    )

    logger.info("ChromaDB seeded successfully with %d entries.", len(SEED_NEEDS))
