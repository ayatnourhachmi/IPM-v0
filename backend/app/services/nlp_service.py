"""NLP service — pitch analysis, tag generation, and suggestions via LLM."""

from __future__ import annotations

import logging
import time
from typing import NamedTuple

from app.core import llm_client
from app.schemas.business_need import Suggestion, Tags

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# In-memory analysis cache (5 min TTL)
# ---------------------------------------------------------------------------

class _CacheEntry(NamedTuple):
    tags: Tags
    suggestions: list[Suggestion]
    timestamp: float

_cache: dict[str, _CacheEntry] = {}
_CACHE_TTL = 300  # 5 minutes


def _get_cached(pitch: str) -> tuple[Tags, list[Suggestion]] | None:
    """Return cached analysis if still valid."""
    key = pitch.strip().lower()
    entry = _cache.get(key)
    if entry and (time.monotonic() - entry.timestamp) < _CACHE_TTL:
        return entry.tags, entry.suggestions
    return None


def _set_cache(pitch: str, tags: Tags, suggestions: list[Suggestion]) -> None:
    """Store analysis result in cache."""
    key = pitch.strip().lower()
    _cache[key] = _CacheEntry(tags=tags, suggestions=suggestions, timestamp=time.monotonic())


async def analyze_pitch(pitch: str) -> tuple[Tags, list[Suggestion]]:
    """Analyze a business need pitch and return structured tags and suggestions."""
    # Check cache first
    cached = _get_cached(pitch)
    if cached:
        logger.debug("Cache hit for pitch analysis")
        return cached

    response = await llm_client.complete(
        prompt_name="nlp_tagging",
        variables={"pitch": pitch},
        response_format="json",
    )
    parsed = llm_client.parse_json_response(response)
    logger.info("LLM response keys: %s", list(parsed.keys()))

    # Handle both flat format (tags at root) and nested format (tags under "tags" key)
    if "tags" in parsed and isinstance(parsed["tags"], dict):
        tags = Tags(**parsed["tags"])
    else:
        tags = Tags(**{k: parsed[k] for k in ("objectif", "domaine", "impact", "origine") if k in parsed})

    # Parse suggestions
    suggestions: list[Suggestion] = []
    raw_suggestions = parsed.get("suggestions", [])
    logger.info("Raw suggestions count: %d", len(raw_suggestions))
    for s in raw_suggestions:
        if isinstance(s, dict) and "label" in s and "text" in s:
            suggestions.append(Suggestion(label=s["label"], text=s["text"]))

    logger.info("Parsed %d suggestions for pitch (len=%d)", len(suggestions), len(pitch))

    # Cache the result
    _set_cache(pitch, tags, suggestions)

    return tags, suggestions
