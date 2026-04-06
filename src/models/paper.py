"""Normalized paper models used across sources and outputs."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


PaperLabel = Literal["high_confidence", "candidate", "filtered_out"]
ScopeType = Literal["topic", "baseline"]
RelationType = Literal["topic", "citation", "related"]


class PaperScope(BaseModel):
    """A scoped relationship between a paper and a tracked entity."""

    model_config = ConfigDict(extra="ignore")

    scope_type: ScopeType
    scope_id: str
    relation_type: RelationType
    reason: str = ""
    score: float = 0.0
    label: PaperLabel = "candidate"

    def key(self) -> str:
        """Return a unique state key for this scope relationship."""
        return f"{self.scope_type}:{self.scope_id}:{self.relation_type}"


class Paper(BaseModel):
    """Canonical paper representation after normalization and merging."""

    model_config = ConfigDict(extra="ignore")

    canonical_id: str | None = None
    title: str
    normalized_title: str | None = None
    title_hash: str | None = None
    abstract: str | None = None
    authors: list[str] = Field(default_factory=list)
    year: int | None = None
    publication_date: str | None = None
    venue: str | None = None
    doi: str | None = None
    arxiv_id: str | None = None
    openalex_id: str | None = None
    semanticscholar_id: str | None = None
    url: str | None = None
    pdf_url: str | None = None
    external_ids: dict[str, str] = Field(default_factory=dict)
    source_names: list[str] = Field(default_factory=list)
    source_tags: list[str] = Field(default_factory=list)
    scopes: list[PaperScope] = Field(default_factory=list)
    score: float = 0.0
    label: PaperLabel = "candidate"
    primary_reason: str | None = None
    reasons: list[str] = Field(default_factory=list)
    citations_count: int | None = None
    references_count: int | None = None
    discovered_date: str | None = None
    last_updated: str | None = None

    def add_scope(self, scope: PaperScope) -> None:
        """Add or merge a scope relationship."""
        for existing in self.scopes:
            if existing.key() == scope.key():
                if scope.score > existing.score:
                    existing.score = scope.score
                    existing.label = scope.label
                    existing.reason = scope.reason or existing.reason
                elif scope.reason and scope.reason not in existing.reason:
                    existing.reason = "; ".join(part for part in [existing.reason, scope.reason] if part)
                return
        self.scopes.append(scope)

    def scope_keys(self) -> set[str]:
        """Return all scope keys associated with this paper."""
        return {scope.key() for scope in self.scopes}

    def topic_ids(self) -> list[str]:
        """Return related topic ids."""
        return sorted({scope.scope_id for scope in self.scopes if scope.scope_type == "topic"})

    def baseline_ids(self) -> list[str]:
        """Return related baseline ids."""
        return sorted({scope.scope_id for scope in self.scopes if scope.scope_type == "baseline"})

    def add_reason(self, reason: str) -> None:
        """Append a unique human-readable reason."""
        if reason and reason not in self.reasons:
            self.reasons.append(reason)

    def best_external_url(self) -> str | None:
        """Return the most helpful external URL available."""
        if self.url:
            return self.url
        if self.doi:
            return f"https://doi.org/{self.doi}"
        if self.arxiv_id:
            return f"https://arxiv.org/abs/{self.arxiv_id}"
        if self.openalex_id:
            return self.openalex_id
        if self.semanticscholar_id:
            return f"https://www.semanticscholar.org/paper/{self.semanticscholar_id}"
        return None
