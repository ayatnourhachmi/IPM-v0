"""NLP service — pitch analysis, tag generation, and suggestions via LLM."""

from __future__ import annotations

import asyncio
import copy
import hashlib
import json
import logging
import time
from datetime import datetime, timedelta, timezone
from typing import NamedTuple

from sqlalchemy import delete, select

from app.core import llm_client
from app.core.langfuse_tracking import (
    merge_trace_rule_pipeline,
    new_langfuse_client,
    safe_flush,
)
from app.core.database import async_session_factory
from app.models.business_need import NlpCache
from app.schemas.business_need import Suggestion, Tags

from app.services.rules_engine import RuleHints, apply_rules
from app.services.validation_guards import sanitize_pitch_tag_dict

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Cache configuration
# ---------------------------------------------------------------------------

_L1_TTL = 300          # in-memory L1: 5 minutes
_L2_TTL_HOURS = 24     # Postgres L2: 24 hours

# ---------------------------------------------------------------------------
# L1 — in-memory cache (fast, no DB round-trip)
# ---------------------------------------------------------------------------

class _CacheEntry(NamedTuple):
    tags: Tags | None
    suggestions: list[Suggestion] | None
    timestamp: float

_l1: dict[str, _CacheEntry] = {}


def _make_key(pitch: str, horizon: str | None) -> str:
    """SHA-256 of normalised pitch + horizon — used for both L1 and L2."""
    raw = f"{pitch.strip().lower()}|{horizon or ''}"
    return hashlib.sha256(raw.encode()).hexdigest()


def _l1_get(key: str) -> tuple[Tags, list[Suggestion]] | None:
    entry = _l1.get(key)
    if entry and (time.monotonic() - entry.timestamp) < _L1_TTL:
        if entry.tags is not None and entry.suggestions is not None:
            return entry.tags, entry.suggestions
    return None


def _l1_get_tags(key: str) -> Tags | None:
    entry = _l1.get(key)
    if entry and (time.monotonic() - entry.timestamp) < _L1_TTL and entry.tags is not None:
        return entry.tags
    return None


def _l1_get_suggestions(key: str) -> list[Suggestion] | None:
    entry = _l1.get(key)
    if entry and (time.monotonic() - entry.timestamp) < _L1_TTL and entry.suggestions:
        return entry.suggestions
    return None


def _l1_merge(key: str, *, tags: Tags | None = None, suggestions: list[Suggestion] | None = None) -> None:
    entry = _l1.get(key)
    merged_tags = tags if tags is not None else (entry.tags if entry else None)
    merged_suggestions = suggestions if suggestions is not None else (entry.suggestions if entry else None)
    _l1[key] = _CacheEntry(tags=merged_tags, suggestions=merged_suggestions, timestamp=time.monotonic())


def _l1_set(key: str, tags: Tags, suggestions: list[Suggestion]) -> None:
    _l1_merge(key, tags=tags, suggestions=suggestions)


# ---------------------------------------------------------------------------
# L2 — Postgres persistent cache (survives container restarts)
# ---------------------------------------------------------------------------

async def _l2_get(key: str) -> tuple[Tags, list[Suggestion]] | None:
    """Read tags + suggestions from Postgres cache. Returns None on any error (non-fatal)."""
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=_L2_TTL_HOURS)
        async with async_session_factory() as session:
            row = await session.scalar(
                select(NlpCache).where(
                    NlpCache.cache_key == key,
                    NlpCache.created_at >= cutoff,
                )
            )
        if row is None:
            return None
        tags = Tags.model_validate(row.tags_json)
        suggestions = [Suggestion(**s) for s in (row.suggestions_json or [])]
        logger.info("L2 cache hit (Postgres) for key=%s", key[:12])
        return tags, suggestions
    except Exception as exc:
        logger.debug("L2 cache read failed (non-fatal): %s", exc)
        return None


async def _l2_get_tags(key: str) -> Tags | None:
    hit = await _l2_get(key)
    return hit[0] if hit else None


async def _l2_get_suggestions(key: str) -> list[Suggestion] | None:
    hit = await _l2_get(key)
    if not hit:
        return None
    suggestions = hit[1]
    return suggestions if suggestions else None


async def _l2_merge_set(
    key: str,
    pitch: str,
    horizon: str | None,
    *,
    tags: Tags | None = None,
    suggestions: list[Suggestion] | None = None,
) -> None:
    """Write partial or full NLP cache row. Non-fatal on error."""
    try:
        existing = await _l2_get(key)
        merged_tags = tags if tags is not None else (existing[0] if existing else None)
        merged_suggestions = suggestions if suggestions is not None else (existing[1] if existing else None)
        if merged_tags is None:
            return

        async with async_session_factory() as session:
            await session.execute(
                delete(NlpCache).where(NlpCache.cache_key == key)
            )
            session.add(NlpCache(
                cache_key=key,
                pitch=pitch,
                horizon=horizon,
                tags_json=json.loads(merged_tags.model_dump_json()),
                suggestions_json=[s.model_dump() for s in (merged_suggestions or [])],
            ))
            await session.commit()
        logger.debug("L2 cache written (Postgres) for key=%s", key[:12])
    except Exception as exc:
        logger.debug("L2 cache write failed (non-fatal): %s", exc)


def _apply_rule_overrides(tag_dict: dict, hints: RuleHints) -> dict:
    """Apply deterministic rule overrides to the parsed LLM tag dict.

    Overrides happen AFTER the LLM responds so they are guaranteed regardless
    of whether the LLM followed the prompt constraints.
    """
    if hints.origin:
        tag_dict["origin"] = {"value": hints.origin, "confidence": "high"}
        logger.info(
            "Rule override applied: origin → %s (rules: %s)",
            hints.origin,
            list(hints.reasons.keys()),
        )

    if hints.exclude_domain:
        original = tag_dict.get("domain", [])
        filtered = [
            item for item in original
            if (item.get("value") if isinstance(item, dict) else item)
            not in hints.exclude_domain
        ]
        # Never leave domain empty — fall back to Other
        tag_dict["domain"] = filtered or [{"value": "Other", "confidence": "low"}]
        removed = len(original) - len(filtered)
        if removed:
            logger.info(
                "Rule override applied: removed %d domain(s) %s from domain",
                removed,
                hints.exclude_domain,
            )

    return tag_dict


# Objective values that contradict each horizon, and the preferred replacement.
_HORIZON_CONTRADICTS: dict[str, set[str]] = {
    "short_term": {"market_opportunity"},
    "mid_term": set(),  # mid-term never forces an override
    "long_term":  {"cost_reduction", "cx_improvement"},
}
_HORIZON_PREFERRED: dict[str, str] = {
    "short_term": "cost_reduction",
    "long_term":  "market_opportunity",
}


def _apply_horizon_override(tag_dict: dict, horizon: str | None, hints: RuleHints) -> dict:
    """Override objective when it contradicts the horizon.

    The only time we respect the LLM's contradictory objective is when the
    deterministic rule engine already fired (i.e. the pitch contained measurable
    KPIs or explicit client signals — truly explicit content).

    A generic LLM 'high' confidence is NOT sufficient to resist the horizon,
    because the LLM over-assigns high confidence to clear operational wording
    even when no hard numeric/client signals exist.
    """
    if not horizon:
        return tag_dict

    objective = tag_dict.get("objective", {})
    current_value = objective.get("value", "") if isinstance(objective, dict) else str(objective)
    current_confidence = objective.get("confidence", "low") if isinstance(objective, dict) else "low"

    contradictory = _HORIZON_CONTRADICTS.get(horizon, set())
    if current_value not in contradictory:
        return tag_dict

    # Only resist the override when the rule engine also fired — that means
    # the pitch had hard, measurable signals (KPIs / client reference) that
    # genuinely justify keeping the LLM's classification.
    if hints.has_overrides:
        logger.debug(
            "Horizon override skipped: rule engine already fired for this pitch "
            "(objective=%s, horizon=%s)",
            current_value,
            horizon,
        )
        return tag_dict

    new_value = _HORIZON_PREFERRED.get(horizon, current_value)
    tag_dict["objective"] = {"value": new_value, "confidence": "medium"}
    logger.info(
        "Horizon override applied: objective %s → %s "
        "(horizon=%s, LLM confidence was %s, no rule-engine signals)",
        current_value,
        new_value,
        horizon,
        current_confidence,
    )

    return tag_dict


# ---------------------------------------------------------------------------
# Horizon context builder
# ---------------------------------------------------------------------------

_HORIZON_CONTEXT: dict[str, str] = {
    "short_term": (
        "Planning horizon: SHORT-TERM (short_term — delivery expected within ~6 months).\n"
        "Rule for objective: when the pitch is ambiguous or could fit multiple objective values, "
        "you MUST default to 'cost_reduction' or 'cx_improvement'.\n"
        "You MUST NOT select 'market_opportunity' unless the pitch explicitly and "
        "unambiguously describes launching a new product or capturing a new market — "
        "vague growth language does NOT qualify.\n"
        "Select 'risk_mitigation' only if the pitch explicitly mentions a compliance "
        "deadline, audit, security breach, or regulatory obligation."
    ),
    "mid_term": (
        "Planning horizon: MID-TERM (mid_term — delivery expected within 6–18 months).\n"
        "Rule for objective: all values are valid. When ambiguous, slightly prefer "
        "'cost_reduction', 'cx_improvement', or 'risk_mitigation' over "
        "'market_opportunity' — choose 'market_opportunity' only when the pitch "
        "clearly signals expansion, new revenue, or competitive positioning."
    ),
    "long_term": (
        "Planning horizon: LONG-TERM (long_term — delivery expected beyond 18 months).\n"
        "Rule for objective: when the pitch is ambiguous or could fit multiple objective values, "
        "you MUST default to 'market_opportunity' or 'risk_mitigation'.\n"
        "You MUST NOT select 'cost_reduction' or 'cx_improvement' unless the pitch "
        "describes a foundational, multi-year transformation — a simple efficiency "
        "improvement does NOT qualify for long-term horizon."
    ),
}

_HORIZON_NO_CONTEXT = (
    "Planning horizon: not specified — classify objective solely based on the pitch content."
)


def _build_horizon_context(horizon: str | None) -> str:
    """Return the horizon constraint block for injection into the LLM prompt."""
    ctx = _HORIZON_CONTEXT.get(horizon or "", _HORIZON_NO_CONTEXT)
    logger.info("Horizon context applied: %s", horizon or "none")
    return ctx


def _build_tagging_intent(hints: RuleHints, horizon: str | None) -> tuple[str, str, str]:
    """Build explicit, implicit, and strategic intent strings for pitch tagging."""
    explicit = (
        "Return structured tags only — objective, domain, impact, origin — "
        "each with an honest per-field confidence level."
    )

    implicit_lines = [
        "Calibrate confidence honestly: high only when the pitch explicitly and unambiguously "
        "signals a classification; prefer medium or low when signals are vague or inferred.",
    ]
    if hints.has_overrides:
        implicit_lines.append(
            "Treat pre-determined rules as mandatory; use high confidence on overridden fields."
        )
    if horizon:
        implicit_lines.append(
            "Bias objective per horizon context when the pitch is ambiguous."
        )
    implicit = " ".join(implicit_lines)

    strategic = (
        "Produce taxonomy tags suitable for portfolio intake and downstream dimension extraction."
    )

    return explicit, implicit, strategic


def _build_suggestions_intent() -> tuple[str, str, str]:
    """Build intent strings for pitch reformulation suggestions."""
    explicit = (
        "Return exactly three suggestions labeled Reformulation, Business Precision, and Value Angle."
    )
    implicit = (
        "Make every suggestion concrete and measurable — nudge the submitter toward quantifiable "
        "outcomes, timelines, or KPIs where the pitch is underspecified."
    )
    strategic = (
        "Frame suggestions for portfolio intake: help the submitter articulate a clearer, "
        "measurable business need that reviewers can triage and compare on equal footing."
    )
    return explicit, implicit, strategic


def _parse_tag_dict(raw_tags: dict) -> dict:
    def _scalar(field: str, fallback_value: str) -> dict:
        raw = raw_tags.get(field)
        if isinstance(raw, dict):
            return {"value": raw.get("value", fallback_value), "confidence": raw.get("confidence", "low")}
        if isinstance(raw, str):
            return {"value": raw, "confidence": "low"}
        return {"value": fallback_value, "confidence": "low"}

    def _items(field: str) -> list[dict]:
        raw = raw_tags.get(field, [])
        result: list[dict] = []
        for item in raw:
            if isinstance(item, dict):
                result.append({"value": item.get("value", ""), "confidence": item.get("confidence", "low")})
            elif isinstance(item, str):
                result.append({"value": item, "confidence": "low"})
        return result or [{"value": "Other", "confidence": "low"}]

    return {
        "objective": _scalar("objective", "cost_reduction"),
        "domain": _items("domain"),
        "impact": _items("impact"),
        "origin": _scalar("origin", "operational_problem"),
    }


def _parse_suggestions(parsed: dict) -> list[Suggestion]:
    suggestions: list[Suggestion] = []
    raw_suggestions = parsed.get("suggestions", [])
    for s in raw_suggestions:
        if isinstance(s, dict) and "label" in s and "text" in s:
            suggestions.append(Suggestion(label=s["label"], text=s["text"]))
    return suggestions


async def tag_pitch(
    pitch: str,
    horizon: str | None = None,
) -> Tags:
    """Classify a pitch into taxonomy tags (fast path — no reformulation suggestions)."""
    key = _make_key(pitch, horizon)

    hit = _l1_get_tags(key)
    if hit:
        logger.debug("L1 tags cache hit (horizon=%s)", horizon)
        return hit

    hit = await _l2_get_tags(key)
    if hit:
        _l1_merge(key, tags=hit)
        return hit

    hints: RuleHints = apply_rules(pitch)
    rules_context = hints.to_prompt_context()
    horizon_context = _build_horizon_context(horizon)

    trace_meta = {"cache_key_sha256_prefix": key[:16]}
    lf = new_langfuse_client()
    lf_trace = None
    if lf is not None:
        try:
            lf_trace = lf.trace(
                name="nlp_pitch_tagging",
                input={"pitch_preview": pitch[:280], "horizon": horizon},
                metadata=trace_meta,
            )
        except Exception as exc:
            logger.debug("Langfuse NLP trace init skipped (non-fatal): %s", exc)
            lf_trace = None

    explicit, implicit, strategic = _build_tagging_intent(hints, horizon)
    response = await llm_client.complete(
        prompt_name="nlp_tagging",
        variables={
            "pitch": pitch,
            "rules_context": rules_context,
            "horizon_context": horizon_context,
            "explicit": explicit,
            "implicit": implicit,
            "strategic": strategic,
        },
        response_format="json",
        lf_parent_trace=lf_trace,
    )
    parsed = llm_client.parse_json_response(response)
    raw_tags = parsed.get("tags", parsed)
    tag_dict = _parse_tag_dict(raw_tags if isinstance(raw_tags, dict) else {})
    tags_pre_override = copy.deepcopy(tag_dict)

    tag_dict = _apply_rule_overrides(tag_dict, hints)
    after_rules = copy.deepcopy(tag_dict)
    tag_dict = _apply_horizon_override(tag_dict, horizon, hints)
    tag_dict = sanitize_pitch_tag_dict(tag_dict)

    def _objective_blob(d: dict) -> str:
        return json.dumps(d.get("objective"), sort_keys=True, default=str)

    horizon_override_fired = _objective_blob(after_rules) != _objective_blob(tag_dict)

    merge_trace_rule_pipeline(
        lf_trace,
        base_metadata=trace_meta,
        pitch_preview=pitch[:200],
        horizon=horizon,
        hints_payload={
            "origin_hint": hints.origin,
            "exclude_domain": list(hints.exclude_domain),
            "reasons": dict(hints.reasons),
            "has_overrides": hints.has_overrides,
        },
        tags_pre_override=tags_pre_override,
        tags_post_pipeline=tag_dict,
        horizon_override_fired=horizon_override_fired,
    )
    safe_flush(lf)

    tags = Tags(**tag_dict)
    _l1_merge(key, tags=tags)
    await _l2_merge_set(key, pitch, horizon, tags=tags)
    return tags


async def suggest_pitch(
    pitch: str,
    horizon: str | None = None,
) -> list[Suggestion]:
    """Generate reformulation suggestions for a pitch (separate from tagging)."""
    key = _make_key(pitch, horizon)

    hit = _l1_get_suggestions(key)
    if hit is not None:
        logger.debug("L1 suggestions cache hit (horizon=%s)", horizon)
        return hit

    hit = await _l2_get_suggestions(key)
    if hit is not None:
        _l1_merge(key, suggestions=hit)
        return hit

    trace_meta = {"cache_key_sha256_prefix": key[:16]}
    lf = new_langfuse_client()
    lf_trace = None
    if lf is not None:
        try:
            lf_trace = lf.trace(
                name="nlp_pitch_suggestions",
                input={"pitch_preview": pitch[:280], "horizon": horizon},
                metadata=trace_meta,
            )
        except Exception as exc:
            logger.debug("Langfuse suggestions trace init skipped (non-fatal): %s", exc)
            lf_trace = None

    explicit, implicit, strategic = _build_suggestions_intent()
    response = await llm_client.complete(
        prompt_name="nlp_suggestions",
        variables={
            "pitch": pitch,
            "explicit": explicit,
            "implicit": implicit,
            "strategic": strategic,
        },
        response_format="json",
        lf_parent_trace=lf_trace,
    )
    parsed = llm_client.parse_json_response(response)
    suggestions = _parse_suggestions(parsed)
    logger.info("Parsed %d suggestions for pitch (len=%d)", len(suggestions), len(pitch))

    _l1_merge(key, suggestions=suggestions)
    await _l2_merge_set(key, pitch, horizon, suggestions=suggestions)
    return suggestions


async def analyze_pitch(
    pitch: str,
    horizon: str | None = None,
) -> tuple[Tags, list[Suggestion]]:
    """Analyze a business need pitch and return structured tags and suggestions.

    Runs tagging and suggestions concurrently (separate LLM prompts).
    """
    tags, suggestions = await asyncio.gather(
        tag_pitch(pitch, horizon),
        suggest_pitch(pitch, horizon),
    )
    return tags, suggestions
