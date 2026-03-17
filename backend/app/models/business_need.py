"""SQLAlchemy ORM models for business_needs and id_counters tables."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Index, Integer, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""
    pass


class BusinessNeed(Base):
    """A single business need submitted through the sourcing form."""

    __tablename__ = "business_needs"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    pitch: Mapped[str] = mapped_column(Text, nullable=False)
    horizon: Mapped[str] = mapped_column(Text, nullable=False)
    tags: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default="{}")
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="draft")
    rework_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    duplicate_matches: Mapped[list] = mapped_column(JSONB, server_default="[]")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        Index("idx_bn_status", "status"),
        Index("idx_bn_created", "created_at"),
    )


class IdCounter(Base):
    """Year-scoped counter for BN-YYYY-NNN ID generation."""

    __tablename__ = "id_counters"

    year: Mapped[int] = mapped_column(Integer, primary_key=True)
    counter: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
