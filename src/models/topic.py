"""Topic configuration models."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class TopicConfig(BaseModel):
    """A research topic tracked by the radar."""

    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    queries: list[str] = Field(default_factory=list)
    exclude: list[str] = Field(default_factory=list)
    preferred_venues: list[str] = Field(default_factory=list)
    preferred_authors: list[str] = Field(default_factory=list)
    min_score: float | None = None
    enabled: bool = True
