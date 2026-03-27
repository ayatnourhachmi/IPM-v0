"""Business needs API endpoints."""

from __future__ import annotations

import logging

import asyncio

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import llm_client
from app.core.config import settings
from app.core.database import get_db
from app.core.embedding_client import embed_text_async
from app.models.business_need import BusinessNeed
from app.schemas.business_need import (
    AnalyzeRequest,
    AnalyzeResponse,
    BusinessNeedResponse,
    CatalogProduct,
    CatalogSearchResponse,
    CreateNeedRequest,
    GapAnalysisRequest,
    GapAnalysisResponse,
    Tags,
    UpdateStatusRequest,
)
from app.core.chroma import get_collection
from app.services import embedding_service, id_service, nlp_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/needs", tags=["needs"])

# ---------------------------------------------------------------------------
# Allowed status transitions
# ---------------------------------------------------------------------------
ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "draft": {"submitted", "rework", "abandoned"},
    "submitted": {"in_qualification", "rework", "abandoned"},
    "in_qualification": {"delivery", "rework", "abandoned"},
    "rework": {"draft", "submitted"},
    "delivery": set(),          # terminal — Phase 2 may extend
    "abandoned": set(),         # terminal
}


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_pitch(request: AnalyzeRequest) -> AnalyzeResponse:
    """Analyze a pitch and return AI-generated tags and suggestions."""
    try:
        tags, suggestions = await nlp_service.analyze_pitch(request.pitch)
        return AnalyzeResponse(tags=tags, suggestions=suggestions)
    except Exception as exc:
        logger.error("Failed to analyze pitch: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="LLM analysis failed. Please try again.",
        ) from exc


@router.post("", response_model=BusinessNeedResponse, status_code=status.HTTP_201_CREATED)
async def create_need(
    request: CreateNeedRequest,
    db: AsyncSession = Depends(get_db),
) -> BusinessNeedResponse:
    """Create a new business need with AI enrichment and duplicate detection."""
    try:
        # 1. Run LLM tagging + embedding generation concurrently (both are the slow parts)
        (tags, _suggestions), embedding = await asyncio.gather(
            nlp_service.analyze_pitch(request.pitch),
            embed_text_async(request.pitch, is_query=False),
        )

        # 2. Generate unique ID
        need_id = await id_service.generate_id(db)

        # 3. Upsert embedding (reuse pre-computed — no second model call)
        embedding_service.upsert_embedding(need_id, request.pitch, "draft", embedding=embedding)

        # 4. Search duplicates (reuse same embedding — no third model call)
        duplicates = embedding_service.search_duplicates(request.pitch, exclude_id=need_id, embedding=embedding)

        # 5. Persist to PostgreSQL
        need = BusinessNeed(
            id=need_id,
            pitch=request.pitch,
            horizon=request.horizon,
            tags=tags.model_dump(),
            status="draft",
            duplicate_matches=[d.model_dump() for d in duplicates],
        )
        db.add(need)
        await db.flush()
        await db.refresh(need)

        return BusinessNeedResponse(
            id=need.id,
            pitch=need.pitch,
            horizon=need.horizon,
            tags=Tags(**need.tags),
            status=need.status,
            rework_note=need.rework_note,
            duplicate_matches=duplicates,
            created_at=need.created_at,
            updated_at=need.updated_at,
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to create business need: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create business need: {str(exc)}",
        ) from exc


@router.get("", response_model=list[BusinessNeedResponse])
async def list_needs(
    db: AsyncSession = Depends(get_db),
) -> list[BusinessNeedResponse]:
    """Return all business needs ordered by creation date descending."""
    try:
        result = await db.execute(
            select(BusinessNeed).order_by(BusinessNeed.created_at.desc())
        )
        needs = result.scalars().all()

        return [
            BusinessNeedResponse(
                id=n.id,
                pitch=n.pitch,
                horizon=n.horizon,
                tags=Tags(**n.tags) if n.tags else Tags(
                    objectif="cost_reduction",
                    domaine=[],
                    impact=[],
                    origine="probleme_operationnel",
                ),
                status=n.status,
                rework_note=n.rework_note,
                duplicate_matches=n.duplicate_matches or [],
                created_at=n.created_at,
                updated_at=n.updated_at,
            )
            for n in needs
        ]
    except Exception as exc:
        logger.error("Failed to list business needs: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve business needs.",
        ) from exc


@router.patch("/{need_id}/status", response_model=BusinessNeedResponse)
async def update_status(
    need_id: str,
    request: UpdateStatusRequest,
    db: AsyncSession = Depends(get_db),
) -> BusinessNeedResponse:
    """Update the status of a business need, enforcing the transition rules."""
    try:
        result = await db.execute(
            select(BusinessNeed).where(BusinessNeed.id == need_id)
        )
        need = result.scalar_one_or_none()

        if need is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Business need '{need_id}' not found.",
            )

        # Enforce transition rules
        allowed = ALLOWED_TRANSITIONS.get(need.status, set())
        if request.status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Cannot transition from '{need.status}' to '{request.status}'. "
                       f"Allowed transitions: {sorted(allowed) if allowed else 'none'}.",
            )

        # Apply the update
        need.status = request.status
        if request.status == "rework" and request.note:
            need.rework_note = request.note
        elif request.status == "submitted":
            need.rework_note = None

        await db.flush()
        await db.refresh(need)

        # Update ChromaDB metadata
        try:
            embedding_service.upsert_embedding(need.id, need.pitch, need.status)
        except Exception as chroma_exc:
            logger.warning("Failed to update ChromaDB for %s: %s", need.id, chroma_exc)

        return BusinessNeedResponse(
            id=need.id,
            pitch=need.pitch,
            horizon=need.horizon,
            tags=Tags(**need.tags) if need.tags else Tags(
                objectif="cost_reduction",
                domaine=[],
                impact=[],
                origine="probleme_operationnel",
            ),
            status=need.status,
            rework_note=need.rework_note,
            duplicate_matches=need.duplicate_matches or [],
            created_at=need.created_at,
            updated_at=need.updated_at,
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to update status for %s: %s", need_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update business need status.",
        ) from exc


@router.post("/{need_id}/catalog-search", response_model=CatalogSearchResponse)
async def catalog_search(
    need_id: str,
    db: AsyncSession = Depends(get_db),
) -> CatalogSearchResponse:
    """Return the top 5 DXC catalog products most similar to the business need."""
    try:
        result = await db.execute(
            select(BusinessNeed).where(BusinessNeed.id == need_id)
        )
        need = result.scalar_one_or_none()

        if need is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Business need '{need_id}' not found.",
            )

        # Build query text from pitch + AI-derived fields
        tags: dict = need.tags or {}

        OBJECTIF_LABELS = {
            "cost_reduction": "cost reduction efficiency savings",
            "cx_improvement": "customer experience improvement satisfaction",
            "risk_mitigation": "risk management compliance security",
            "market_opportunity": "market growth revenue expansion",
            "productivity": "productivity automation efficiency",
            "innovation": "innovation digital transformation modernization",
        }
        objectif_str = OBJECTIF_LABELS.get(tags.get("objectif", ""), "")

        domains_list: list = tags.get("domaine") or []
        domains_str = " ".join(domains_list)

        impact_parts = tags.get("impact") or []
        impact_str = (
            " ".join(impact_parts)
            if isinstance(impact_parts, list)
            else str(impact_parts)
        )

        query_text = " ".join(
            filter(None, [need.pitch, objectif_str, domains_str, impact_str])
        )
        query_text = query_text[:600].strip()

        # Embed — is_query=True applies the BGE retrieval prefix
        embedding = await embed_text_async(query_text, is_query=True)

        # Query dxc_catalog
        collection = get_collection("dxc_catalog")
        raw = collection.query(
            query_embeddings=[embedding],
            n_results=5,
            include=["metadatas", "documents", "distances"],
        )

        ids = raw["ids"][0]
        metadatas = raw["metadatas"][0]
        documents = raw["documents"][0]
        distances = raw["distances"][0]

        def _meta_val(meta: dict, key: str) -> str | None:
            """Return None for empty-string sentinel values stored in ChromaDB."""
            v = meta.get(key)
            return None if v == "" else v

        products: list[CatalogProduct] = []
        for pid, meta, doc, dist in zip(ids, metadatas, documents, distances):
            score = round(max(0.0, min(1.0, 1.0 - dist)), 2)
            features_raw = meta.get("features")
            features: list[str] = (
                [f.strip() for f in features_raw.split(",") if f.strip()]
                if features_raw
                else []
            )
            products.append(CatalogProduct(
                id=pid,
                name=meta.get("name", ""),
                description=doc,
                ipm_stage=_meta_val(meta, "ipm_stage"),
                internal_external=_meta_val(meta, "internal_external"),
                industry_focus=_meta_val(meta, "industry_focus"),
                ai_type=_meta_val(meta, "ai_type"),
                ai_criticality=_meta_val(meta, "ai_criticality"),
                maturity_level=_meta_val(meta, "maturity_level"),
                value_layer=_meta_val(meta, "value_layer"),
                monetization_potential=_meta_val(meta, "monetization_potential"),
                business_impact=_meta_val(meta, "business_impact"),
                lead=_meta_val(meta, "lead"),
                features=features,
                relevance_score=score,
            ))

        products.sort(key=lambda p: p.relevance_score, reverse=True)

        return CatalogSearchResponse(results=products, total=len(products))

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to run catalog search for %s: %s", need_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Catalog search failed. Please try again.",
        ) from exc


@router.post("/{need_id}/gap-analysis", response_model=GapAnalysisResponse)
async def gap_analysis(
    need_id: str,
    body: GapAnalysisRequest,
    db: AsyncSession = Depends(get_db),
) -> GapAnalysisResponse:
    """Run a structured gap analysis between a business need and a selected DXC solution."""
    try:
        result = await db.execute(
            select(BusinessNeed).where(BusinessNeed.id == need_id)
        )
        need = result.scalar_one_or_none()

        if need is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Business need '{need_id}' not found.",
            )

        # Extract solution fields from request body
        sol = body.selected_solution
        name: str = sol.get("name", "Unknown")
        description: str = sol.get("description", "") or ""
        features_raw = sol.get("features", [])
        features: list[str] = features_raw if isinstance(features_raw, list) else []
        business_impact: str = sol.get("business_impact", "") or ""
        maturity_level: str = sol.get("maturity_level", "") or ""

        # Extract need context from JSONB tags
        need_tags: dict = need.tags or {}
        objectif: str = need_tags.get("objectif", "") or "Not specified"
        impact_list: list = need_tags.get("impact", []) or []
        impact: str = ", ".join(impact_list) if impact_list else "Not specified"
        domains_list: list = need_tags.get("domaine", []) or []
        domains: str = ", ".join(domains_list) if domains_list else "Not specified"

        variables: dict[str, str] = {
            "pitch": need.pitch,
            "objectif": objectif,
            "impact": impact,
            "domains": domains,
            "solution_name": name,
            "solution_description": description,
            "solution_features": ", ".join(features) if features else "Not listed",
            "solution_business_impact": business_impact or "Not specified",
            "solution_maturity": maturity_level or "Not specified",
        }

        # Langfuse trace — create before LLM call, update after; silent if disabled
        _lf_trace = None
        try:
            from langfuse import Langfuse
            _lf = Langfuse(
                public_key=settings.langfuse_public_key,
                secret_key=settings.langfuse_secret_key,
                host=settings.langfuse_host,
            )
            _lf_trace = _lf.trace(
                name="gap-analysis",
                input={
                    "need_id": need_id,
                    "need_pitch": need.pitch,
                    "solution_name": name,
                    "solution_maturity": maturity_level,
                },
                metadata={
                    "endpoint": "gap-analysis",
                    "need_id": need_id,
                    "solution_id": sol.get("id", "unknown"),
                    "solution_name": name,
                },
            )
        except Exception:
            pass

        # LLM call — replicates nlp_service.py pattern
        llm_response = await llm_client.complete(
            prompt_name="gap-analysis",
            variables=variables,
            response_format="json",
        )

        # Parse
        try:
            parsed = llm_client.parse_json_response(llm_response)
        except Exception as parse_exc:
            logger.error("Gap analysis JSON parse failed for %s: %s", need_id, parse_exc)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="LLM returned invalid JSON for gap analysis",
            ) from parse_exc

        features_matching: list[str] = parsed.get("features_matching") or []
        features_missing: list[str] = parsed.get("features_missing") or []
        resources_needed: list[str] = parsed.get("resources_needed") or []
        fit_score: int = max(1, min(10, int(parsed.get("fit_score", 5))))

        # Update Langfuse trace with parsed output
        try:
            if _lf_trace:
                _lf_trace.update(output={
                    "fit_score": fit_score,
                    "features_matching_count": len(features_matching),
                    "features_missing_count": len(features_missing),
                    "resources_needed_count": len(resources_needed),
                })
        except Exception:
            pass

        return GapAnalysisResponse(
            features_matching=features_matching,
            features_missing=features_missing,
            resources_needed=resources_needed,
            fit_score=fit_score,
            solution_name=name,
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Gap analysis failed for %s: %s", need_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gap analysis failed. Please try again.",
        ) from exc
