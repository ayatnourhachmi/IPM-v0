"""Pydantic v2 request / response schemas for the business needs API."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Nested schemas
# ---------------------------------------------------------------------------

class Tags(BaseModel):
    """AI-generated metadata tags for a business need."""

    objectif: Literal[
        "cost_reduction", "cx_improvement", "risk_mitigation", "market_opportunity"
    ] = Field(description="Primary objective classification")
    domaine: list[str] = Field(description="Business domains (IA, Cloud, etc.)")
    impact: list[str] = Field(description="Impact areas (Revenue, Cost, etc.)")
    origine: Literal[
        "enjeu_marche", "probleme_operationnel", "demande_client"
    ] = Field(description="Origin classification")


class DuplicateMatch(BaseModel):
    """A potential duplicate business need found via vector similarity."""

    id: str
    pitch: str
    status: str
    similarity_score: float = Field(ge=0.0, le=1.0)


class Suggestion(BaseModel):
    """AI-generated pitch reformulation suggestion."""

    label: str = Field(description="Suggestion category label")
    text: str = Field(description="Suggested reformulation text")


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    """Request body for the /needs/analyze endpoint."""

    pitch: str = Field(min_length=1, description="Free-text pitch to analyze")


class CreateNeedRequest(BaseModel):
    """Request body for POST /needs — only 2 fields from the user."""

    pitch: str = Field(min_length=20, description="Free-text pitch (≥20 chars)")
    horizon: Literal["court_terme", "moyen_terme", "long_terme"]

    @field_validator("pitch")
    @classmethod
    def pitch_not_blank(cls, v: str) -> str:
        """Ensure pitch is not just whitespace."""
        if not v.strip():
            raise ValueError("Pitch must not be empty or whitespace only")
        return v.strip()


class UpdateStatusRequest(BaseModel):
    """Request body for PATCH /needs/{id}/status."""

    status: Literal["submitted", "rework", "abandoned", "in_qualification", "delivery"]
    note: str | None = Field(default=None, description="Required when status=rework")

    @field_validator("note")
    @classmethod
    def note_required_for_rework_or_abandon(cls, v: str | None, info) -> str | None:
        """Validate that a note is provided when transitioning to rework or abandoned."""
        status = info.data.get("status")
        if status in ("rework", "abandoned") and not v:
            raise ValueError(f"A note/reason is required when setting status to '{status}'")
        return v


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class AnalyzeResponse(BaseModel):
    """Response for the /needs/analyze endpoint."""

    tags: Tags
    suggestions: list[Suggestion] = []


class BusinessNeedResponse(BaseModel):
    """Full business need object returned by the API."""

    id: str
    pitch: str
    horizon: Literal["court_terme", "moyen_terme", "long_terme"]
    tags: Tags
    status: Literal["draft", "submitted", "rework", "abandoned", "in_qualification", "delivery"]
    rework_note: str | None = None
    duplicate_matches: list[DuplicateMatch] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
