"""Normalization helpers for cross-source paper records."""

from __future__ import annotations

import hashlib
import re
from typing import Any


DOI_PREFIX_RE = re.compile(r"^(?:https?://(?:dx\.)?doi\.org/|doi:)", re.IGNORECASE)
ARXIV_RE = re.compile(r"(?:arxiv:|https?://arxiv\.org/(?:abs|pdf)/)?([a-z\-]+/\d{7}|\d{4}\.\d{4,5})(?:v\d+)?", re.IGNORECASE)
OPENALEX_RE = re.compile(r"(?:https?://openalex\.org/)?([WAISCF]\d+)", re.IGNORECASE)
WHITESPACE_RE = re.compile(r"\s+")
PUNCT_RE = re.compile(r"[^a-z0-9\s]")


def normalize_whitespace(value: str | None) -> str | None:
    """Collapse repeated whitespace."""
    if value is None:
        return None
    return WHITESPACE_RE.sub(" ", value).strip()


def normalize_doi(value: str | None) -> str | None:
    """Normalize DOI strings into lowercase bare identifiers."""
    if not value:
        return None
    value = DOI_PREFIX_RE.sub("", value.strip()).strip()
    return value.lower() or None


def normalize_arxiv_id(value: str | None) -> str | None:
    """Extract a stable arXiv identifier if present."""
    if not value:
        return None
    match = ARXIV_RE.search(value.strip())
    return match.group(1).lower() if match else None


def normalize_openalex_id(value: str | None) -> str | None:
    """Normalize OpenAlex identifiers to full URLs."""
    if not value:
        return None
    match = OPENALEX_RE.search(value.strip())
    if not match:
        return None
    return f"https://openalex.org/{match.group(1).upper()}"


def normalize_semanticscholar_id(value: str | None) -> str | None:
    """Normalize Semantic Scholar identifiers."""
    if not value:
        return None
    return value.strip()


def normalize_title(value: str | None) -> str:
    """Create a comparison-friendly title representation."""
    value = normalize_whitespace((value or "").lower()) or ""
    value = PUNCT_RE.sub(" ", value)
    return normalize_whitespace(value) or ""


def title_hash(value: str | None) -> str:
    """Hash a normalized title for weak identity fallback."""
    normalized = normalize_title(value)
    return hashlib.sha1(normalized.encode("utf-8")).hexdigest()


def inverted_index_to_text(index: dict[str, list[int]] | None) -> str | None:
    """Convert an OpenAlex abstract inverted index to plain text."""
    if not index:
        return None
    positions: list[tuple[int, str]] = []
    for token, token_positions in index.items():
        for position in token_positions:
            positions.append((position, token))
    positions.sort(key=lambda item: item[0])
    return " ".join(token for _, token in positions)


def compact_text(value: str | None, limit: int = 240) -> str | None:
    """Normalize and truncate long text for summaries."""
    if not value:
        return None
    cleaned = normalize_whitespace(value)
    if cleaned is None:
        return None
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: limit - 1].rstrip() + "…"


def coerce_int(value: Any) -> int | None:
    """Safely coerce numeric values."""
    try:
        if value is None:
            return None
        return int(value)
    except (TypeError, ValueError):
        return None
