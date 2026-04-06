"""Deduplication logic for multi-source paper records."""

from __future__ import annotations

from difflib import SequenceMatcher
from typing import Iterable

from src.core.normalize import normalize_title, title_hash
from src.models.paper import Paper

try:
    from rapidfuzz.fuzz import token_set_ratio as _token_set_ratio
except ImportError:  # pragma: no cover - fallback when rapidfuzz is unavailable.
    _token_set_ratio = None


def title_similarity(left: str | None, right: str | None) -> float:
    """Return a 0-100 similarity score between two titles."""
    left_norm = normalize_title(left)
    right_norm = normalize_title(right)
    if not left_norm or not right_norm:
        return 0.0
    if _token_set_ratio is not None:
        return float(_token_set_ratio(left_norm, right_norm))
    return SequenceMatcher(a=left_norm, b=right_norm).ratio() * 100


def strong_keys_for_paper(paper: Paper) -> list[str]:
    """Return strong identity keys in preferred order."""
    keys: list[str] = []
    if paper.doi:
        keys.append(f"doi:{paper.doi}")
    if paper.arxiv_id:
        keys.append(f"arxiv:{paper.arxiv_id}")
    if paper.openalex_id:
        keys.append(f"openalex:{paper.openalex_id}")
    if paper.semanticscholar_id:
        keys.append(f"s2:{paper.semanticscholar_id}")
    if paper.title_hash:
        keys.append(f"title:{paper.title_hash}")
    return keys


def canonical_key_for_paper(paper: Paper) -> str:
    """Return the preferred canonical key for a paper."""
    keys = strong_keys_for_paper(paper)
    if keys:
        return keys[0]
    return f"title:{title_hash(paper.title)}"


def author_overlap_ratio(left: Paper, right: Paper) -> float:
    """Compute author overlap to support weak-match deduping."""
    left_authors = {name.lower() for name in left.authors if name}
    right_authors = {name.lower() for name in right.authors if name}
    if not left_authors or not right_authors:
        return 0.0
    return len(left_authors & right_authors) / max(min(len(left_authors), len(right_authors)), 1)


def papers_look_equivalent(left: Paper, right: Paper) -> bool:
    """Apply a conservative weak-match heuristic."""
    if set(strong_keys_for_paper(left)) & set(strong_keys_for_paper(right)):
        return True
    title_score = title_similarity(left.title, right.title)
    year_distance = abs((left.year or 0) - (right.year or 0))
    author_overlap = author_overlap_ratio(left, right)
    if title_score >= 97:
        return True
    return title_score >= 92 and year_distance <= 1 and author_overlap >= 0.34


def merge_papers(primary: Paper, secondary: Paper) -> Paper:
    """Merge fields from a duplicate record into a canonical paper."""
    merged = primary.model_copy(deep=True)
    for field_name in [
        "abstract",
        "venue",
        "doi",
        "arxiv_id",
        "openalex_id",
        "semanticscholar_id",
        "url",
        "pdf_url",
        "publication_date",
    ]:
        if getattr(secondary, field_name) and not getattr(merged, field_name):
            setattr(merged, field_name, getattr(secondary, field_name))
    merged.normalized_title = merged.normalized_title or secondary.normalized_title
    merged.title_hash = merged.title_hash or secondary.title_hash
    merged.year = merged.year or secondary.year
    merged.citations_count = merged.citations_count or secondary.citations_count
    merged.references_count = merged.references_count or secondary.references_count
    merged.authors = list(dict.fromkeys([*merged.authors, *secondary.authors]))
    merged.source_names = list(dict.fromkeys([*merged.source_names, *secondary.source_names]))
    merged.source_tags = list(dict.fromkeys([*merged.source_tags, *secondary.source_tags]))
    merged.reasons = list(dict.fromkeys([*merged.reasons, *secondary.reasons]))
    merged.external_ids = {**secondary.external_ids, **merged.external_ids}
    for scope in secondary.scopes:
        merged.add_scope(scope)
    if secondary.score > merged.score:
        merged.score = secondary.score
        merged.label = secondary.label
        merged.primary_reason = secondary.primary_reason or merged.primary_reason
    if not merged.abstract and secondary.abstract:
        merged.abstract = secondary.abstract
    if secondary.last_updated and not merged.last_updated:
        merged.last_updated = secondary.last_updated
    merged.canonical_id = canonical_key_for_paper(merged)
    return merged


def deduplicate_papers(papers: Iterable[Paper]) -> list[Paper]:
    """Deduplicate papers using strong ids first and weak heuristics second."""
    deduped: list[Paper] = []
    strong_index: dict[str, int] = {}

    for paper in papers:
        paper.canonical_id = canonical_key_for_paper(paper)
        match_index: int | None = None

        for key in strong_keys_for_paper(paper):
            if key in strong_index:
                match_index = strong_index[key]
                break

        if match_index is None:
            for index, existing in enumerate(deduped):
                if papers_look_equivalent(existing, paper):
                    match_index = index
                    break

        if match_index is None:
            deduped.append(paper)
            for key in strong_keys_for_paper(paper):
                strong_index[key] = len(deduped) - 1
            continue

        deduped[match_index] = merge_papers(deduped[match_index], paper)
        for key in strong_keys_for_paper(deduped[match_index]):
            strong_index[key] = match_index

    return deduped
