from __future__ import annotations

from src.core.normalize import inverted_index_to_text, normalize_arxiv_id, normalize_doi, normalize_title


def test_normalize_doi_and_arxiv() -> None:
    assert normalize_doi("https://doi.org/10.1000/XYZ") == "10.1000/xyz"
    assert normalize_arxiv_id("https://arxiv.org/abs/2401.12345v2") == "2401.12345"


def test_inverted_index_to_text() -> None:
    abstract = inverted_index_to_text({"radar": [1], "research": [0], "system": [2]})
    assert abstract == "research radar system"


def test_normalize_title_collapses_case_and_punctuation() -> None:
    assert normalize_title("Vision-Language Navigation!") == "vision language navigation"
