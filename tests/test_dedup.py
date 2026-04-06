from __future__ import annotations

from src.core.dedup import deduplicate_papers
from tests.helpers import make_paper


def test_deduplicate_by_strong_id() -> None:
    papers = [
        make_paper(title="Paper A", doi="10.1000/example"),
        make_paper(title="Paper A (extended metadata)", doi="10.1000/example", abstract="Richer abstract"),
    ]

    deduped = deduplicate_papers(papers)

    assert len(deduped) == 1
    assert deduped[0].doi == "10.1000/example"
    assert deduped[0].abstract == "A paper about research radar."


def test_deduplicate_by_fuzzy_title_and_author_overlap() -> None:
    left = make_paper(title="Vision Language Navigation with Memory")
    right = make_paper(title="Vision-Language Navigation with Memory", authors=["Ada Lovelace"])

    deduped = deduplicate_papers([left, right])

    assert len(deduped) == 1
