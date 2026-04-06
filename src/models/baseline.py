"""Baseline configuration models."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, field_validator

from src.core.normalize import normalize_arxiv_id, normalize_doi, normalize_openalex_id, normalize_semanticscholar_id


class BaselineConfig(BaseModel):
    """A baseline paper that anchors citation and related-work tracking."""

    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    topic_id: str
    doi: str | None = None
    arxiv_id: str | None = None
    openalex_id: str | None = None
    semanticscholar_id: str | None = None
    track_new_citations: bool = True
    track_related: bool = True
    enabled: bool = True

    @field_validator("doi")
    @classmethod
    def _normalize_doi(cls, value: str | None) -> str | None:
        return normalize_doi(value)

    @field_validator("arxiv_id")
    @classmethod
    def _normalize_arxiv(cls, value: str | None) -> str | None:
        return normalize_arxiv_id(value)

    @field_validator("openalex_id")
    @classmethod
    def _normalize_openalex(cls, value: str | None) -> str | None:
        return normalize_openalex_id(value)

    @field_validator("semanticscholar_id")
    @classmethod
    def _normalize_s2(cls, value: str | None) -> str | None:
        return normalize_semanticscholar_id(value)

    def identifier_candidates(self) -> list[str]:
        """Return candidate identifiers in the order most APIs can resolve."""
        candidates: list[str] = []
        if self.semanticscholar_id:
            candidates.append(self.semanticscholar_id)
        if self.doi:
            candidates.append(f"DOI:{self.doi}")
        if self.arxiv_id:
            candidates.append(f"ARXIV:{self.arxiv_id}")
        return candidates
