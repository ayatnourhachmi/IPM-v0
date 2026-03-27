"""Pydantic v2 request / response schemas for the business needs API."""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

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

    status: Literal["submitted", "solutions_reviewed", "rework", "abandoned", "in_qualification", "delivery"]
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
    status: Literal["draft", "submitted", "solutions_reviewed", "rework", "abandoned", "in_qualification", "delivery"]
    rework_note: str | None = None
    duplicate_matches: list[DuplicateMatch] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Catalog search schemas
# ---------------------------------------------------------------------------

class CatalogProduct(BaseModel):
    """A DXC product returned by the catalog similarity search."""

    id: str
    name: str
    description: str
    ipm_stage: Optional[str] = None
    internal_external: Optional[str] = None
    industry_focus: Optional[str] = None
    ai_type: Optional[str] = None
    ai_criticality: Optional[str] = None
    maturity_level: Optional[str] = None
    value_layer: Optional[str] = None
    monetization_potential: Optional[str] = None
    business_impact: Optional[str] = None
    lead: Optional[str] = None
    features: list[str] = []
    relevance_score: float


class CatalogSearchResponse(BaseModel):
    """Response for the catalog-search endpoint."""

    results: list[CatalogProduct]
    total: int


# ---------------------------------------------------------------------------
# Gap analysis schemas
# ---------------------------------------------------------------------------

class GapAnalysisRequest(BaseModel):
    """Request body for the gap-analysis endpoint."""

    selected_solution: dict


class GapAnalysisResponse(BaseModel):
    """Response for the gap-analysis endpoint."""

    features_matching: list[str]
    features_missing: list[str]
    resources_needed: list[str]
    fit_score: int = Field(ge=1, le=10)
    solution_name: str
