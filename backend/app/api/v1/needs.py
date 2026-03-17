"""Business needs API endpoints."""

from __future__ import annotations

import logging

import asyncio

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.embedding_client import embed_text_async
from app.models.business_need import BusinessNeed
from app.schemas.business_need import (
    AnalyzeRequest,
    AnalyzeResponse,
    BusinessNeedResponse,
    CreateNeedRequest,
    Tags,
    UpdateStatusRequest,
)
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
            embed_text_async(request.pitch),
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
