"""Integration tests for POST /needs/{need_id}/search-external.

Mocks the SearchProvider and LLM client so no real API calls are made.
Asserts that the synthesis prompt receives correctly shaped input and that
the response matches the ExternalSolutionResponse schema.
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.services.search_service import SearchResult


# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------

FAKE_NEED_ID = "BN-2026-001"
FAKE_NEED = MagicMock()
FAKE_NEED.id = FAKE_NEED_ID
FAKE_NEED.pitch = "Automate vendor invoice matching to reduce manual effort"
FAKE_NEED.tags = {
    "objective": {"value": "cost_reduction", "confidence": "high"},
    "domain": [{"value": "Finance", "confidence": "high"}, {"value": "Operations", "confidence": "medium"}],
    "impact": [{"value": "Cost", "confidence": "high"}],
    "origin": {"value": "operational_problem", "confidence": "high"},
}

FAKE_SEARCH_RESULTS = [
    SearchResult(
        title="InvoiceAI — Intelligent AP Automation",
        url="https://example.com/invoiceai",
        snippet="InvoiceAI uses ML to match purchase orders with invoices automatically.",
    ),
    SearchResult(
        title="Tipalti Accounts Payable Automation",
        url="https://tipalti.com",
        snippet="Tipalti offers end-to-end AP automation with 26,000+ payment methods.",
    ),
]

FAKE_LLM_SYNTHESIS_JSON = {
    "solution_name": "VendorMatch AI",
    "solution_description": (
        "VendorMatch AI automates invoice-to-PO matching using ML-based OCR and rule engines. "
        "It integrates natively with ERP systems to trigger straight-through processing. "
        "Anomalies are flagged for human review with ranked confidence scores."
    ),
    "solution_features": [
        "ML-powered invoice OCR and data extraction",
        "PO-to-invoice 3-way match automation",
        "ERP integration (SAP, Oracle, Dynamics)",
        "Exception management and approval workflows",
    ],
    "inspired_by": [
        {"name": "InvoiceAI", "url": "https://example.com/invoiceai"},
        {"name": "Tipalti", "url": "https://tipalti.com"},
    ],
    "differentiation_from_internal": None,
    "maturity_estimate": "Concept",
    "low_confidence": False,
}


def _make_llm_response(content: dict) -> MagicMock:
    """Wrap a dict in a fake LLMResponse."""
    resp = MagicMock()
    resp.content = json.dumps(content)
    resp.usage = {"prompt_tokens": 100, "completion_tokens": 200}
    return resp


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestSearchExternalEndpoint:
    """Integration-level tests with mocked search provider and LLM client."""

    def _run_with_mocks(self, mock_provider_results=None, llm_content=None):
        """Helper: patch DB, search provider, and LLM; call the endpoint; return response."""
        if mock_provider_results is None:
            mock_provider_results = FAKE_SEARCH_RESULTS
        if llm_content is None:
            llm_content = FAKE_LLM_SYNTHESIS_JSON

        from app.main import app

        with TestClient(app) as client:
            with (
                patch(
                    "app.api.v1.needs.get_search_provider",
                    return_value=_make_mock_provider(mock_provider_results),
                ),
                patch(
                    "app.services.search_service.get_cached_search_results",
                    new_callable=AsyncMock,
                    return_value=None,
                ),
                patch(
                    "app.services.search_service.set_cached_search_results",
                    new_callable=AsyncMock,
                ),
                patch(
                    "app.core.llm_client.complete",
                    new_callable=AsyncMock,
                    return_value=_make_llm_response(llm_content),
                ),
                patch(
                    "app.api.v1.needs.get_db",
                    return_value=_make_mock_db(FAKE_NEED),
                ),
            ):
                response = client.post(f"/api/v1/needs/{FAKE_NEED_ID}/search-external")
        return response

    def test_returns_200_with_valid_schema(self):
        response = self._run_with_mocks()
        assert response.status_code == 200
        data = response.json()
        assert "solution_name" in data
        assert "solution_description" in data
        assert "solution_features" in data
        assert "inspired_by" in data
        assert "maturity_estimate" in data
        assert "sources" in data

    def test_maturity_estimate_is_always_concept(self):
        response = self._run_with_mocks()
        data = response.json()
        assert data["maturity_estimate"] == "Concept"

    def test_synthesis_receives_search_results_block(self):
        """Assert that the LLM complete call receives a non-empty search_results variable."""
        captured_variables: dict = {}

        async def capture_complete(prompt_name, variables, **kwargs):
            captured_variables.update(variables)
            return _make_llm_response(FAKE_LLM_SYNTHESIS_JSON)

        from app.main import app

        with TestClient(app) as client:
            with (
                patch(
                    "app.api.v1.needs.get_search_provider",
                    return_value=_make_mock_provider(FAKE_SEARCH_RESULTS),
                ),
                patch(
                    "app.services.search_service.get_cached_search_results",
                    new_callable=AsyncMock,
                    return_value=None,
                ),
                patch(
                    "app.services.search_service.set_cached_search_results",
                    new_callable=AsyncMock,
                ),
                patch("app.core.llm_client.complete", side_effect=capture_complete),
                patch(
                    "app.api.v1.needs.get_db",
                    return_value=_make_mock_db(FAKE_NEED),
                ),
            ):
                client.post(f"/api/v1/needs/{FAKE_NEED_ID}/search-external")

        assert "search_results" in captured_variables
        assert captured_variables["search_results"] != ""
        assert captured_variables["search_results"] != "No search results available."
        assert "pitch" in captured_variables
        assert captured_variables["pitch"] == FAKE_NEED.pitch

    def test_inspired_by_has_name_and_url(self):
        response = self._run_with_mocks()
        data = response.json()
        for item in data["inspired_by"]:
            assert "name" in item
            assert "url" in item

    def test_low_confidence_false_by_default(self):
        response = self._run_with_mocks()
        data = response.json()
        assert data["low_confidence"] is False

    def test_empty_search_results_returns_503(self):
        from app.main import app

        with TestClient(app) as client:
            with (
                patch(
                    "app.api.v1.needs.get_search_provider",
                    return_value=_make_mock_provider([]),
                ),
                patch(
                    "app.services.search_service.get_cached_search_results",
                    new_callable=AsyncMock,
                    return_value=None,
                ),
                patch(
                    "app.services.search_service.set_cached_search_results",
                    new_callable=AsyncMock,
                ),
                patch(
                    "app.api.v1.needs.get_db",
                    return_value=_make_mock_db(FAKE_NEED),
                ),
            ):
                response = client.post(f"/api/v1/needs/{FAKE_NEED_ID}/search-external")
        assert response.status_code == 503

    def test_cache_hit_skips_provider(self):
        """When the cache returns results, the SearchProvider.search should not be called."""
        mock_provider = _make_mock_provider(FAKE_SEARCH_RESULTS)

        from app.main import app

        with TestClient(app) as client:
            with (
                patch(
                    "app.api.v1.needs.get_search_provider",
                    return_value=mock_provider,
                ),
                patch(
                    "app.services.search_service.get_cached_search_results",
                    new_callable=AsyncMock,
                    return_value=FAKE_SEARCH_RESULTS,
                ),
                patch(
                    "app.core.llm_client.complete",
                    new_callable=AsyncMock,
                    return_value=_make_llm_response(FAKE_LLM_SYNTHESIS_JSON),
                ),
                patch(
                    "app.api.v1.needs.get_db",
                    return_value=_make_mock_db(FAKE_NEED),
                ),
            ):
                client.post(f"/api/v1/needs/{FAKE_NEED_ID}/search-external")

        mock_provider.search.assert_not_called()


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------


def _make_mock_provider(results: list[SearchResult]) -> MagicMock:
    provider = MagicMock()
    provider.search = AsyncMock(return_value=results)
    return provider


def _make_mock_db(need_object) -> MagicMock:
    """Return a mock AsyncSession whose .execute() returns the fake need."""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = need_object

    mock_session = MagicMock()
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=None)

    async def _get_db_gen():
        yield mock_session

    return _get_db_gen()
