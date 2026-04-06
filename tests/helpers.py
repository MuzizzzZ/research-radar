from __future__ import annotations

from src.core.normalize import normalize_title, title_hash
from src.models.paper import Paper


def make_paper(**overrides) -> Paper:
    title = overrides.pop("title", "Example Paper")
    return Paper(
        title=title,
        normalized_title=normalize_title(title),
        title_hash=title_hash(title),
        authors=overrides.pop("authors", ["Ada Lovelace", "Alan Turing"]),
        year=overrides.pop("year", 2024),
        publication_date=overrides.pop("publication_date", "2024-08-01"),
        venue=overrides.pop("venue", "NeurIPS"),
        abstract=overrides.pop("abstract", "A paper about research radar."),
        **overrides,
    )
