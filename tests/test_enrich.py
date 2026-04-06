from __future__ import annotations

from pathlib import Path

from src.clients.semanticscholar import SemanticScholarRateLimitError
from src.core.enrich import resolve_baseline_seed
from src.models.baseline import BaselineConfig
from src.models.paper import Paper


class DummyOpenAlexClient:
    def __init__(self) -> None:
        self.search_calls = 0

    def get_work(self, identifier: str):
        del identifier
        return None

    def search_works(self, query: str, max_results: int = 3, sort: str = "relevance_score:desc"):
        del query, max_results, sort
        self.search_calls += 1
        return [
            Paper(
                title="Recovered via OpenAlex Search",
                doi="10.1000/openalex-fallback",
                openalex_id="https://openalex.org/W999",
                source_names=["openalex"],
            )
        ]


class DummySemanticScholarClient:
    def get_paper(self, identifier: str):
        del identifier
        return None

    def search_papers(self, query: str, limit: int = 3):
        del query, limit
        raise SemanticScholarRateLimitError("rate limited", retry_after_seconds=60)


def test_resolve_baseline_seed_falls_back_to_openalex_and_caches(tmp_path: Path) -> None:
    baseline = BaselineConfig(
        id="room-to-room",
        title="Vision-and-Language Navigation: Interpreting visually-grounded navigation instructions in real environments",
        topic_id="vln",
    )
    cache_path = tmp_path / "baseline_seeds.json"
    openalex_client = DummyOpenAlexClient()
    semanticscholar_client = DummySemanticScholarClient()

    first = resolve_baseline_seed(
        baseline,
        openalex_client,
        semanticscholar_client,
        cache_path=cache_path,
    )
    second = resolve_baseline_seed(
        baseline,
        openalex_client,
        semanticscholar_client,
        cache_path=cache_path,
    )

    assert first.doi == "10.1000/openalex-fallback"
    assert second.doi == "10.1000/openalex-fallback"
    assert openalex_client.search_calls == 1
