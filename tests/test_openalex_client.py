from __future__ import annotations

from src.clients.openalex import OpenAlexClient


def test_map_work_handles_null_nested_payloads() -> None:
    client = OpenAlexClient()

    paper = client._map_work(
        {
            "id": "https://openalex.org/W123",
            "display_name": "Robust Mapping for Nullable OpenAlex Fields",
            "publication_year": 2026,
            "publication_date": "2026-04-07",
            "doi": None,
            "ids": None,
            "primary_location": None,
            "best_oa_location": None,
            "authorships": [{"author": None}, {}],
            "abstract_inverted_index": None,
        }
    )

    assert paper.title == "Robust Mapping for Nullable OpenAlex Fields"
    assert paper.openalex_id == "https://openalex.org/W123"
    assert paper.venue is None
    assert paper.url == "https://openalex.org/W123"
    assert paper.authors == []
