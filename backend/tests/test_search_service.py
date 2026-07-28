"""Unit tests for search query construction logic in search_service.py."""

import pytest

from app.services.search_service import build_search_queries, _make_search_cache_key


class TestBuildSearchQueries:
    def test_returns_list_of_queries(self):
        queries = build_search_queries(
            pitch="Automate vendor invoice processing",
            objective="cost_reduction",
            domains=["Finance", "Operations"],
        )
        assert isinstance(queries, list)

    def test_returns_2_to_3_queries(self):
        queries = build_search_queries(
            pitch="Improve customer onboarding flow",
            objective="cx_improvement",
            domains=["AI"],
        )
        assert 2 <= len(queries) <= 3

    def test_queries_are_non_empty_strings(self):
        queries = build_search_queries(
            pitch="Detect anomalies in network traffic",
            objective="risk_mitigation",
            domains=["Cybersecurity"],
        )
        for q in queries:
            assert isinstance(q, str)
            assert q.strip() != ""

    def test_queries_contain_domain(self):
        queries = build_search_queries(
            pitch="Build a cloud data warehouse",
            objective="cost_reduction",
            domains=["Cloud", "Data"],
        )
        combined = " ".join(queries).lower()
        assert "cloud" in combined or "data" in combined

    def test_queries_contain_objective(self):
        queries = build_search_queries(
            pitch="Reduce SLA breach incidents",
            objective="risk_mitigation",
            domains=["Operations"],
        )
        combined = " ".join(queries).lower()
        assert "risk" in combined or "mitigation" in combined or "risk mitigation" in combined

    def test_empty_domains_uses_fallback(self):
        queries = build_search_queries(
            pitch="General purpose automation",
            objective="cost_reduction",
            domains=[],
        )
        assert len(queries) >= 2
        for q in queries:
            assert q.strip() != ""

    def test_long_pitch_is_truncated_in_query(self):
        long_pitch = "A" * 300
        queries = build_search_queries(
            pitch=long_pitch,
            objective="market_opportunity",
            domains=["AI"],
        )
        for q in queries:
            assert len(q) < 500, f"Query too long: {len(q)} chars"


class TestMakeSearchCacheKey:
    def test_same_inputs_produce_same_key(self):
        k1 = _make_search_cache_key("Automate invoices", "cost_reduction", ["Finance"])
        k2 = _make_search_cache_key("Automate invoices", "cost_reduction", ["Finance"])
        assert k1 == k2

    def test_different_pitch_produces_different_key(self):
        k1 = _make_search_cache_key("Automate invoices", "cost_reduction", ["Finance"])
        k2 = _make_search_cache_key("Detect fraud", "cost_reduction", ["Finance"])
        assert k1 != k2

    def test_key_starts_with_prefix(self):
        k = _make_search_cache_key("test pitch", "cost_reduction", ["AI"])
        assert k.startswith("search_external:")

    def test_domain_order_is_normalised(self):
        k1 = _make_search_cache_key("pitch", "cost_reduction", ["AI", "Cloud"])
        k2 = _make_search_cache_key("pitch", "cost_reduction", ["Cloud", "AI"])
        assert k1 == k2

    def test_case_insensitive_normalisation(self):
        k1 = _make_search_cache_key("PITCH TEXT", "Cost_Reduction", ["AI"])
        k2 = _make_search_cache_key("pitch text", "cost_reduction", ["ai"])
        assert k1 == k2
