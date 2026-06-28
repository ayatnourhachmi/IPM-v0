"""Generate IPM PFE jury preparation PDF (crib sheet + model answers)."""

from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    HRFlowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "IPM-PFE-Jury-Prep.pdf"


def _styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "DocTitle",
            parent=base["Title"],
            fontSize=22,
            leading=26,
            spaceAfter=6,
            textColor=colors.HexColor("#0f172a"),
            alignment=TA_CENTER,
        ),
        "subtitle": ParagraphStyle(
            "DocSubtitle",
            parent=base["Normal"],
            fontSize=11,
            leading=14,
            spaceAfter=14,
            textColor=colors.HexColor("#475569"),
            alignment=TA_CENTER,
        ),
        "h1": ParagraphStyle(
            "H1",
            parent=base["Heading1"],
            fontSize=14,
            leading=18,
            spaceBefore=10,
            spaceAfter=6,
            textColor=colors.HexColor("#1e40af"),
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontSize=11,
            leading=14,
            spaceBefore=8,
            spaceAfter=4,
            textColor=colors.HexColor("#334155"),
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["Normal"],
            fontSize=9,
            leading=12,
            spaceAfter=4,
            alignment=TA_JUSTIFY,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=base["Normal"],
            fontSize=9,
            leading=12,
            leftIndent=12,
            bulletIndent=0,
            spaceAfter=2,
        ),
        "qa_q": ParagraphStyle(
            "QAQ",
            parent=base["Normal"],
            fontSize=9.5,
            leading=13,
            spaceBefore=6,
            spaceAfter=2,
            textColor=colors.HexColor("#1e3a8a"),
            fontName="Helvetica-Bold",
        ),
        "qa_a": ParagraphStyle(
            "QAA",
            parent=base["Normal"],
            fontSize=9,
            leading=12,
            spaceAfter=6,
            alignment=TA_JUSTIFY,
        ),
        "footer": ParagraphStyle(
            "Footer",
            parent=base["Normal"],
            fontSize=8,
            textColor=colors.HexColor("#64748b"),
            alignment=TA_CENTER,
        ),
    }


def _table(data: list[list[str]], col_widths: list[float], styles) -> Table:
    rows = [[Paragraph(cell, styles["body"]) for cell in row] for row in data]
    t = Table(rows, colWidths=col_widths, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e40af")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return t


def build_story(styles) -> list:
    s: list = []

    s.append(Paragraph("IPM — PFE Jury Preparation", styles["title"]))
    s.append(Paragraph("AI Layer · Semantic Search · Embeddings · Demo Q&amp;A", styles["subtitle"]))
    s.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1")))
    s.append(Spacer(1, 6 * mm))

    s.append(Paragraph("Elevator pitch (30 seconds)", styles["h1"]))
    s.append(
        Paragraph(
            "IPM is an AI-assisted innovation intake platform for DXC. A user submits a business need "
            "in natural language; the system classifies it, detects duplicates, semantically searches the "
            "DXC catalog, runs gap analysis, scores solutions (IVI), generates delivery recommendations, "
            "and exports PDF/DOCX. AI is <b>hybrid</b>: embeddings for retrieval, LLM for reasoning, "
            "deterministic rules and validation for trust.",
            styles["body"],
        )
    )

    s.append(Paragraph("Architecture flow", styles["h1"]))
    s.append(
        Paragraph(
            "Pitch → [Cache] → [Rules] → [LLM Tags] → [Guards] → Tags<br/>"
            "Pitch → [Embed] → Chroma → Duplicate check (≥ 0.80)<br/>"
            "Pitch + Tags → [Embed query] → Chroma catalog → [Lexical filter] → Top 4 solutions<br/>"
            "Selected solution → [LLM Gap Analysis] → IVI scores → [LLM Recos] → Export",
            styles["body"],
        )
    )

    s.append(Paragraph("Key numbers (memorize)", styles["h1"]))
    s.append(
        _table(
            [
                ["Item", "Value"],
                ["Embedding model", "BAAI/bge-small-en-v1.5 (384-dim, local)"],
                ["Vector DB", "ChromaDB — cosine / HNSW"],
                ["Duplicate threshold", "≥ 0.80 (max 3 matches)"],
                ["Catalog search", "Pool 40 → lexical filter → return 4"],
                ["NLP cache", "L1: 5 min · L2 Postgres: 24 h"],
                ["Frontend debounce", "900 ms · min pitch: 30 chars"],
                ["LLM", "Groq Llama 3.3 70B or Azure GPT-4o"],
                ["Chroma collections", "business_needs · dxc_catalog"],
            ],
            [5.5 * cm, 11.5 * cm],
            styles,
        )
    )
    s.append(Spacer(1, 4 * mm))

    s.append(Paragraph("Tech stack one-liner", styles["h1"]))
    s.append(
        Paragraph(
            "Next.js 14 · FastAPI · PostgreSQL · ChromaDB · BGE embeddings · Groq/Azure LLM · Langfuse · Docker Compose",
            styles["body"],
        )
    )

    s.append(Paragraph("Demo pitches to rehearse", styles["h1"]))
    for line in [
        "1. AI HR chatbot — catalog match, no duplicate",
        "2. Near-copy of seed BN-2025-001 — duplicate blocked at VC-1",
        "3. Data lake + dashboards only — AI domain removed by rules engine",
    ]:
        s.append(Paragraph(f"• {line}", styles["bullet"]))

    s.append(PageBreak())

    s.append(Paragraph("Top 10 jury questions — model answers", styles["title"]))
    s.append(Spacer(1, 4 * mm))

    qa = [
        (
            "1. What problem does IPM solve?",
            "DXC innovation intake is unstructured: business needs arrive as free text and must be "
            "qualified, matched to internal catalog solutions, scored, and turned into delivery recommendations. "
            "IPM digitizes the full IPM workflow — Sourcing through VC-1 to VC-4 — with AI assisting classification, "
            "search, gap analysis, and document generation.",
        ),
        (
            "2. Why hybrid AI (rules + LLM + embeddings) instead of just ChatGPT?",
            "Innovation intake needs control and traceability, not only fluency. Rules enforce business logic "
            "the LLM can miss (e.g. data dashboard ≠ AI project). Embeddings handle semantic matching at scale. "
            "The LLM adds flexible classification and gap reasoning. Post-LLM guards keep outputs on-vocabulary. "
            "Langfuse traces decisions. This is cheaper, more auditable, and safer for enterprise than a single black-box prompt.",
        ),
        (
            "3. How does semantic catalog search work?",
            "We build a query from pitch + AI tags (objective, domains, impact), embed with BGE using the query prefix, "
            "and search the dxc_catalog Chroma collection (cosine similarity). We fetch up to 40 candidates, then apply "
            "a lexical overlap filter on features/description to remove semantic false positives. We return top 4 by "
            "relevance score (1 − cosine distance). Catalog is seeded from Excel at startup.",
        ),
        (
            "4. How does duplicate detection work?",
            "On create, the pitch is embedded as a document and upserted into business_needs in Chroma. We query for "
            "similar pitches excluding the new ID. Matches ≥ 0.80 similarity are returned (max 3). VC-1 blocks validation "
            "if duplicates exist. Twenty synthetic needs are seeded for demo. This catches paraphrases, not just exact matches.",
        ),
        (
            "5. What is the NLP tagging pipeline?",
            "Pitch + horizon → L1 cache (5 min) → L2 Postgres (24 h) → rules engine (KPI/client/AI-vs-Data) → horizon "
            "bias in prompt → LLM call → post-parse overrides → validation guards. Tags carry confidence H/M/L. Frontend "
            "debounces 900 ms and requires ≥ 30 characters.",
        ),
        (
            "6. Is this RAG? Difference between Discovery relevance and IVI?",
            "Not full RAG — we retrieve catalog products but do not inject chunks into a generation prompt. Gap analysis "
            "is a separate structured LLM call on the user-selected solution. Discovery relevance = semantic catalog fit (0–1). "
            "IVI = multi-dimensional qualification after gap analysis (maturity, expertise, duration, impact, 1–5).",
        ),
        (
            "7. How do you reduce hallucinations?",
            "Four layers: pre-LLM rules (hard constraints), structured JSON prompts, post-LLM validation (allow-lists for tags, "
            "roles, risks, KPIs), and hybrid scoring (business impact alignment computed deterministically; LLM only phrases "
            "catalog-grounded explanations). Gap fit_score is calibrated when missing features exceed matching ones.",
        ),
        (
            "8. Why ChromaDB and local BGE instead of pgvector + OpenAI embeddings?",
            "Separation of concerns: Postgres for transactional data, Chroma for vector search with HNSW. Two collections with "
            "independent seeding. BGE-small runs locally — no API cost per search. OpenAI embeddings remain configurable via env vars.",
        ),
        (
            "9. Main limitations and next steps?",
            "Limits: English-optimized model, no formal precision@k eval, hand-maintained lexical lexicons, no reranker, no auth. "
            "Next: evaluation dataset, cross-encoder reranking, multilingual embeddings (bge-m3), auth/audit trail, prompt A/B via Langfuse.",
        ),
        (
            "10. Walk us through a live demo.",
            "Happy path: AI HR chatbot pitch → tags → create need → Discovery catalog hits → gap analysis + IVI → Selection → "
            "Recos → PDF export. Duplicate: pitch similar to BN-2025-001 → alert at ≥ 0.80 → VC-1 blocked. Rules: data lake + "
            "dashboards only → AI domain removed — system does not blindly trust the LLM.",
        ),
    ]

    for q, a in qa:
        s.append(Paragraph(q, styles["qa_q"]))
        s.append(Paragraph(a, styles["qa_a"]))

    s.append(Spacer(1, 6 * mm))
    s.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1")))
    s.append(Spacer(1, 4 * mm))

    s.append(Paragraph("Quick rebuttals", styles["h1"]))
    s.append(
        _table(
            [
                ["Challenge", "Response"],
                ["Why not fine-tune?", "Structured taxonomy + catalog. Rules + prompts give faster, explainable control for PFE scope."],
                ["How was 0.80 chosen?", "Empirical on demo seeds. Production would tune with labeled duplicate pairs."],
                ["Lexical filter seems hacky", "Fixes real vector-search false positives. Proper fix = reranker or labeled eval set."],
                ["No authentication?", "Intentional for PFE demo. Production needs auth, roles, audit trail."],
            ],
            [4.5 * cm, 12.5 * cm],
            styles,
        )
    )

    s.append(Spacer(1, 8 * mm))
    s.append(
        Paragraph(
            "IPM-v3 · Generated for PFE presentation · github.com (local workspace)",
            styles["footer"],
        )
    )

    return s


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    styles = _styles()
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
        title="IPM PFE Jury Preparation",
        author="IPM Team",
    )
    doc.build(build_story(styles))
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
