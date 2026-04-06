"""State and index models."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class SeenEntry(BaseModel):
    """State stored for a canonical paper across runs."""

    model_config = ConfigDict(extra="ignore")

    canonical_id: str
    first_seen_date: str
    last_seen_date: str
    topic_ids: list[str] = Field(default_factory=list)
    baseline_ids: list[str] = Field(default_factory=list)
    relation_types: list[str] = Field(default_factory=list)
    scope_keys: list[str] = Field(default_factory=list)
    first_seen_by_scope: dict[str, str] = Field(default_factory=dict)
    last_seen_by_scope: dict[str, str] = Field(default_factory=dict)


class TopicEvent(BaseModel):
    """Historical topic discovery event."""

    model_config = ConfigDict(extra="ignore")

    date: str
    canonical_id: str
    relation_type: str
    score: float
    label: str
    reason: str


class BaselineEvent(BaseModel):
    """Historical baseline discovery event."""

    model_config = ConfigDict(extra="ignore")

    date: str
    canonical_id: str
    relation_type: str
    score: float
    label: str
    reason: str


class StateSnapshot(BaseModel):
    """In-memory bundle for the repository-backed state files."""

    model_config = ConfigDict(extra="ignore")

    seen: dict[str, SeenEntry] = Field(default_factory=dict)
    papers: dict[str, dict[str, Any]] = Field(default_factory=dict)
    topics_index: dict[str, list[TopicEvent]] = Field(default_factory=dict)
    baselines_index: dict[str, list[BaselineEvent]] = Field(default_factory=dict)
