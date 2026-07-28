"""Web search abstraction — SearchProvider protocol + OpenAI Responses API implementation.

Architecture
------------
- ``SearchProvider`` is a structural Protocol; any async class with a ``search`` method qualifies.
- ``OpenAIWebSearchProvider`` calls the OpenAI Responses API (POST /v1/responses) with the
  ``web_search`` tool and ``gpt-4.1`` via httpx.  Requires ``OPENAI_API_KEY``.
  Note: gpt-4o-search-preview and gpt-4o-mini-search-preview were shut down on 2026-07-23.
- ``_NullSearchProvider`` returns an empty list with a warning — used when no key is configured.
- ``build_search_queries`` constructs 2–3 targeted queries from the business-need context.
- Cache helpers read/write the existing ``nlp_cache`` Postgres table (``search_external:`` prefix,
  24 h TTL) — no new migration needed.
"""

from __future__ import annotations

import hashlib
import logging
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from typing import Protocol, runtime_checkable

from app.core.config import settings

logger = logging.getLogger(__name__)

_SEARCH_KEY_PREFIX = "search_external:"
_SEARCH_CACHE_TTL_HOURS = 24

_OPENAI_SEARCH_MODEL = "gpt-4.1"
_OPENAI_RESPONSES_API_URL = "https://api.openai.com/v1/responses"


# ---------------------------------------------------------------------------
# Domain types
# ---------------------------------------------------------------------------


@dataclass
class SearchResult:
    """A single web search result returned by any provider."""

    title: str
    url: str
    snippet: str

    def to_prompt_line(self) -> str:
        """Single-line representation suitable for embedding in a prompt."""
        return f"- [{self.title}]({self.url}): {self.snippet[:300]}"


@runtime_checkable
class SearchProvider(Protocol):
    """Swappable interface for web search.  Any async class with ``search`` qualifies."""

    async def search(self, query: str) -> list[SearchResult]:
        """Run one search query and return up to N results."""
        ...


# ---------------------------------------------------------------------------
# OpenAI Responses API provider
# ---------------------------------------------------------------------------


class OpenAIWebSearchProvider:
    """Calls the OpenAI Responses API (gpt-4.1 + web_search tool) via httpx."""

    async def search(self, query: str) -> list[SearchResult]:
        import httpx

        headers = {
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": _OPENAI_SEARCH_MODEL,
            "tools": [{"type": "web_search"}],
            "tool_choice": "required",
            "input": query,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as http:
                resp = await http.post(_OPENAI_RESPONSES_API_URL, headers=headers, json=payload)
                if not resp.is_success:
                    logger.error(
                        "OpenAI Responses API HTTP %s for query %r — %s",
                        resp.status_code, query, resp.text[:500],
                    )
                    return []
                data: dict = resp.json()

            # Responses API output is a list of items; find the message item.
            text = ""
            annotations: list[dict] = []
            for item in data.get("output", []):
                if item.get("type") == "message":
                    for block in item.get("content", []):
                        if block.get("type") == "output_text":
                            text = block.get("text", "")
                            annotations = block.get("annotations", [])
                    break

            results: list[SearchResult] = []
            seen_urls: set[str] = set()
            for ann in annotations:
                if ann.get("type") != "url_citation":
                    continue
                url = ann.get("url", "")
                title = ann.get("title", url)
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    results.append(SearchResult(title=title, url=url, snippet=text[:400]))

            # Fallback: model answered without citing URLs — surface the text as one result.
            if not results and text.strip():
                results.append(SearchResult(
                    title=f"Search results for: {query[:80]}",
                    url="",
                    snippet=text[:600],
                ))

            if not results:
                logger.error(
                    "OpenAI web search returned nothing for query %r. text=%r annotations=%r",
                    query, text[:200], annotations[:3],
                )

            return results

        except Exception as exc:
            logger.error(
                "OpenAI Responses API search failed for query %r: %s", query, exc, exc_info=True,
            )
            return []


# ---------------------------------------------------------------------------
# Null / stub provider
# ---------------------------------------------------------------------------


class _NullSearchProvider:
    """Returns empty results — used when OPENAI_API_KEY is not configured."""

    async def search(self, query: str) -> list[SearchResult]:
        logger.warning("Web search skipped (OPENAI_API_KEY not set) for query: %r", query)
        return []


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------


def get_search_provider() -> SearchProvider:
    """Return an OpenAIWebSearchProvider if OPENAI_API_KEY is set, otherwise a null stub."""
    if settings.openai_api_key:
        return OpenAIWebSearchProvider()
    logger.warning(
        "OPENAI_API_KEY is not set — web search is unavailable. "
        "Add OPENAI_API_KEY to your .env file and restart the backend."
    )
    return _NullSearchProvider()


# ---------------------------------------------------------------------------
# Query construction
# ---------------------------------------------------------------------------


def build_search_queries(pitch: str, objective: str, domains: list[str]) -> list[str]:
    """Derive 2–3 targeted web search queries from business-need context."""
    objective_label = objective.replace("_", " ") if objective else "business improvement"
    domain_str = ", ".join(domains) if domains else "enterprise technology"
    pitch_excerpt = pitch.strip()[:120]

    return [
        f"new {domain_str} tools and solutions for {objective_label} 2025 2026",
        f"{pitch_excerpt} technology trends competitor landscape enterprise",
        f"best enterprise software platforms {objective_label} {domain_str}",
    ]


# ---------------------------------------------------------------------------
# Cache helpers — reuse nlp_cache table (search_external: prefix, 24 h TTL)
# ---------------------------------------------------------------------------


def _make_search_cache_key(pitch: str, objective: str, domains: list[str]) -> str:
    """SHA-256 of normalised (pitch, objective, sorted-domains) — deterministic cache key."""
    raw = (
        f"{pitch.strip().lower()}"
        f"|{objective.strip().lower()}"
        f"|{','.join(sorted(d.strip().lower() for d in domains))}"
    )
    return _SEARCH_KEY_PREFIX + hashlib.sha256(raw.encode()).hexdigest()


def _cache_input_label(pitch: str, objective: str, domains: list[str]) -> str:
    """Human-readable label stored in the nlp_cache.pitch column for search entries."""
    return f"[search_external] {pitch[:200]} | {objective} | {','.join(domains)}"[:500]


async def get_cached_search_results(
    pitch: str,
    objective: str,
    domains: list[str],
) -> list[SearchResult] | None:
    """Return cached search results, or None on cache miss / expiry."""
    from sqlalchemy import select

    from app.core.database import async_session_factory
    from app.models.business_need import NlpCache

    key = _make_search_cache_key(pitch, objective, domains)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=_SEARCH_CACHE_TTL_HOURS)

    try:
        async with async_session_factory() as session:
            row = await session.scalar(
                select(NlpCache).where(NlpCache.cache_key == key)
            )
            if row is None or row.created_at < cutoff:
                return None
            raw = row.tags_json or {}
            results_raw = raw.get("results", [])
            return [
                SearchResult(
                    title=r.get("title", ""),
                    url=r.get("url", ""),
                    snippet=r.get("snippet", ""),
                )
                for r in results_raw
                if isinstance(r, dict)
            ]
    except Exception as exc:
        logger.warning("Search cache read failed: %s", exc)
        return None


async def set_cached_search_results(
    pitch: str,
    objective: str,
    domains: list[str],
    queries: list[str],
    results: list[SearchResult],
) -> None:
    """Persist search results to the nlp_cache table (upsert)."""
    from sqlalchemy.dialects.postgresql import insert

    from app.core.database import async_session_factory
    from app.models.business_need import NlpCache

    key = _make_search_cache_key(pitch, objective, domains)
    label = _cache_input_label(pitch, objective, domains)
    payload: dict = {
        "queries": queries,
        "results": [asdict(r) for r in results],
    }

    try:
        async with async_session_factory() as session:
            stmt = (
                insert(NlpCache)
                .values(
                    cache_key=key,
                    pitch=label,
                    horizon=None,
                    tags_json=payload,
                    suggestions_json=[],
                    created_at=datetime.now(timezone.utc),
                )
                .on_conflict_do_update(
                    index_elements=["cache_key"],
                    set_={
                        "tags_json": payload,
                        "created_at": datetime.now(timezone.utc),
                    },
                )
            )
            await session.execute(stmt)
            await session.commit()
    except Exception as exc:
        logger.warning("Search cache write failed (non-fatal): %s", exc)
