"""Tests asserting that mode=CATALOG (default) gap-analysis behaviour is unchanged.

These tests verify:
1. The external_override_block variable is always the empty string in CATALOG mode.
2. The maturity_eval is NOT pinned to 1 in CATALOG mode (uses catalog tier mapping).
3. The dxc_buildability field is absent (None) from the response in CATALOG mode.
4. The gap-analysis prompt is called with prompt_name="gap-analysis".
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


FAKE_NEED_ID = "BN-2026-001"
FAKE_NEED = MagicMock()
FAKE_NEED.id = FAKE_NEED_ID
FAKE_NEED.pitch = "Reduce customer churn via predictive analytics"
FAKE_NEED.tags = {
    "objective": {"value": "cx_improvement", "confidence": "high"},
    "domain": [{"value": "AI", "confidence": "high"}, {"value": "Data", "confidence": "medium"}],
    "impact": [{"value": "Revenue", "confidence": "high"}],
    "origin": {"value": "market_driver", "confidence": "medium"},
}
FAKE_NEED.risks = None
FAKE_NEED.justifications = None
FAKE_NEED.ivi_scores = None

FAKE_CATALOG_SOLUTION = {
    "id": "EXCEL-42",
    "name": "Churn Predictor Pro",
    "description": "ML-powered churn prediction with real-time scoring.",
    "features": ["Predictive scoring", "CRM integration", "Dashboard"],
    "domain": "AI",
    "maturity": "Pilot",
    "business_impact": "Reduces churn by up to 20%",
    "complexity": "medium",
}

FAKE_GAP_JSON = {
    "features_matching": ["Predictive scoring", "CRM integration"],
    "features_missing": ["Multi-channel attribution"],
    "resources_needed": ["Data scientist", "CRM API access"],
    "risks": [{"risk": "Data quality issues", "severity": "medium"}],
    "fit_score": 7,
    "fit_justification": "Strong ML capabilities cover core churn prediction need.",
    "evaluation_scores": {
        "maturity": 3,
        "maturity_justification": "Catalog maturity is Pilot.",
        "expertise": 4,
        "expertise_justification": "DXC has documented AI delivery capabilities.",
        "duration": 3,
        "duration_justification": "Moderate setup time.",
        "impact": 4,
        "impact_justification": "High revenue impact on churn reduction.",
    },
}


def _make_llm_response(content: dict) -> MagicMock:
    resp = MagicMock()
    resp.content = json.dumps(content)
    resp.usage = {"prompt_tokens": 150, "completion_tokens": 300}
    return resp


class TestGapAnalysisCatalogModeUnchanged:
    """Verify CATALOG mode is unaffected by the EXTERNAL mode additions."""

    def _call_gap_analysis(self, request_body: dict, captured: dict):
        async def capture_complete(prompt_name, variables, **kwargs):
            captured["prompt_name"] = prompt_name
            captured["variables"] = dict(variables)
            return _make_llm_response(FAKE_GAP_JSON)

        from app.main import app

        with TestClient(app) as client:
            with (
                patch("app.core.llm_client.complete", side_effect=capture_complete),
                patch(
                    "app.api.v1.needs.get_db",
                    return_value=_make_mock_db(FAKE_NEED),
                ),
            ):
                response = client.post(
                    f"/api/v1/needs/{FAKE_NEED_ID}/gap-analysis",
                    json=request_body,
                )
        return response

    def test_default_mode_is_catalog(self):
        """Omitting mode should behave identically to mode=CATALOG."""
        captured: dict = {}
        response = self._call_gap_analysis(
            {"selected_solution": FAKE_CATALOG_SOLUTION}, captured
        )
        assert response.status_code == 200

    def test_external_override_block_is_empty_in_catalog_mode(self):
        captured: dict = {}
        self._call_gap_analysis(
            {"selected_solution": FAKE_CATALOG_SOLUTION, "mode": "CATALOG"}, captured
        )
        variables = captured.get("variables", {})
        assert "external_override_block" in variables
        assert variables["external_override_block"] == ""

    def test_prompt_name_is_gap_analysis(self):
        captured: dict = {}
        self._call_gap_analysis(
            {"selected_solution": FAKE_CATALOG_SOLUTION}, captured
        )
        assert captured.get("prompt_name") == "gap-analysis"

    def test_dxc_buildability_is_none_in_catalog_mode(self):
        captured: dict = {}
        response = self._call_gap_analysis(
            {"selected_solution": FAKE_CATALOG_SOLUTION, "mode": "CATALOG"}, captured
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("dxc_buildability") is None

    def test_maturity_is_not_pinned_to_1_in_catalog_mode(self):
        """In CATALOG mode with Pilot maturity, maturity should be 3 (catalog tier), not 1."""
        captured: dict = {}
        response = self._call_gap_analysis(
            {"selected_solution": FAKE_CATALOG_SOLUTION, "mode": "CATALOG"}, captured
        )
        assert response.status_code == 200
        data = response.json()
        maturity = data["evaluation_scores"]["maturity"]
        # The catalog maturity mapping: Pilot = 3; it should NOT be 1 (EXTERNAL mode value)
        assert maturity != 1, (
            f"maturity={maturity} — looks like EXTERNAL mode was applied in CATALOG mode"
        )

    def test_fit_score_preserved_within_valid_range(self):
        captured: dict = {}
        response = self._call_gap_analysis(
            {"selected_solution": FAKE_CATALOG_SOLUTION}, captured
        )
        data = response.json()
        assert 1 <= data["fit_score"] <= 10

    def test_explicit_catalog_mode_same_as_default(self):
        """Explicitly sending mode=CATALOG should produce the same result as omitting mode."""
        cap_default: dict = {}
        cap_explicit: dict = {}
        resp_default = self._call_gap_analysis(
            {"selected_solution": FAKE_CATALOG_SOLUTION}, cap_default
        )
        resp_explicit = self._call_gap_analysis(
            {"selected_solution": FAKE_CATALOG_SOLUTION, "mode": "CATALOG"}, cap_explicit
        )
        assert resp_default.status_code == resp_explicit.status_code == 200
        # Both should have empty external_override_block
        assert cap_default["variables"]["external_override_block"] == ""
        assert cap_explicit["variables"]["external_override_block"] == ""


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------


def _make_mock_db(need_object) -> MagicMock:
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = need_object

    mock_session = MagicMock()
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session.flush = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=None)

    async def _get_db_gen():
        yield mock_session

    return _get_db_gen()
