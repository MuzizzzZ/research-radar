"""Incremental change detection and repository-backed state updates."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from src.core.dedup import canonical_key_for_paper
from src.models.paper import Paper
from src.models.state import BaselineEvent, SeenEntry, StateSnapshot, TopicEvent
from src.utils.io import dump_json, load_json


@dataclass(slots=True)
class DeltaResult:
    """Delta results grouped for reports and site generation."""

    all_new_papers: list[Paper] = field(default_factory=list)
    new_global_papers: list[Paper] = field(default_factory=list)
    topic_new_papers: dict[str, list[Paper]] = field(default_factory=dict)
    baseline_new_citations: dict[str, list[Paper]] = field(default_factory=dict)
    baseline_new_related: dict[str, list[Paper]] = field(default_factory=dict)


class StateStore:
    """Read and write state from repository JSON files."""

    def __init__(self, state_dir: Path) -> None:
        self.state_dir = state_dir
        self.seen_path = state_dir / "seen.json"
        self.papers_path = state_dir / "papers.json"
        self.topics_index_path = state_dir / "topics_index.json"
        self.baselines_index_path = state_dir / "baselines_index.json"

    def load(self) -> StateSnapshot:
        """Load all state files into pydantic models."""
        seen_payload = load_json(self.seen_path, {})
        papers_payload = load_json(self.papers_path, {})
        topics_payload = load_json(self.topics_index_path, {})
        baselines_payload = load_json(self.baselines_index_path, {})

        return StateSnapshot(
            seen={key: SeenEntry.model_validate(value) for key, value in seen_payload.items()},
            papers=papers_payload,
            topics_index={
                key: [TopicEvent.model_validate(item) for item in value]
                for key, value in topics_payload.items()
            },
            baselines_index={
                key: [BaselineEvent.model_validate(item) for item in value]
                for key, value in baselines_payload.items()
            },
        )

    def save(self, snapshot: StateSnapshot) -> None:
        """Persist state files back to disk."""
        dump_json(
            self.seen_path,
            {key: value.model_dump(mode="json") for key, value in snapshot.seen.items()},
        )
        dump_json(self.papers_path, snapshot.papers)
        dump_json(
            self.topics_index_path,
            {key: [event.model_dump(mode="json") for event in value] for key, value in snapshot.topics_index.items()},
        )
        dump_json(
            self.baselines_index_path,
            {
                key: [event.model_dump(mode="json") for event in value]
                for key, value in snapshot.baselines_index.items()
            },
        )

    def compute_delta(
        self,
        snapshot: StateSnapshot,
        papers: list[Paper],
        discovery_date: str,
    ) -> DeltaResult:
        """Compare current papers with stored state and group new scope events."""
        result = DeltaResult()

        for paper in papers:
            if not paper.canonical_id:
                paper.canonical_id = canonical_key_for_paper(paper)
            entry = snapshot.seen.get(paper.canonical_id)
            existing_scope_keys = set(entry.scope_keys) if entry else set()
            paper_scope_keys = paper.scope_keys()
            new_scope_keys = sorted(paper_scope_keys - existing_scope_keys)

            if entry is None:
                result.new_global_papers.append(paper)

            if not new_scope_keys and entry is not None:
                continue

            result.all_new_papers.append(paper)
            for scope in paper.scopes:
                scope_key = scope.key()
                if scope_key not in new_scope_keys and entry is not None:
                    continue
                if scope.scope_type == "topic":
                    result.topic_new_papers.setdefault(scope.scope_id, []).append(paper)
                elif scope.relation_type == "citation":
                    result.baseline_new_citations.setdefault(scope.scope_id, []).append(paper)
                else:
                    result.baseline_new_related.setdefault(scope.scope_id, []).append(paper)

        return result

    def apply_delta(self, snapshot: StateSnapshot, papers: list[Paper], discovery_date: str) -> StateSnapshot:
        """Update the persisted state with the latest paper metadata and scopes."""
        for paper in papers:
            if not paper.canonical_id:
                paper.canonical_id = canonical_key_for_paper(paper)

            existing = snapshot.seen.get(paper.canonical_id)
            if existing is None:
                existing = SeenEntry(
                    canonical_id=paper.canonical_id,
                    first_seen_date=discovery_date,
                    last_seen_date=discovery_date,
                )
            existing.last_seen_date = discovery_date
            existing_topic_set = set(existing.topic_ids)
            existing_baseline_set = set(existing.baseline_ids)
            existing_relation_set = set(existing.relation_types)
            existing_scope_set = set(existing.scope_keys)

            for topic_id in paper.topic_ids():
                if topic_id not in existing_topic_set:
                    existing.topic_ids.append(topic_id)
                    existing_topic_set.add(topic_id)
            for baseline_id in paper.baseline_ids():
                if baseline_id not in existing_baseline_set:
                    existing.baseline_ids.append(baseline_id)
                    existing_baseline_set.add(baseline_id)

            for scope in paper.scopes:
                is_new_scope = scope.key() not in existing_scope_set
                if scope.relation_type not in existing_relation_set:
                    existing.relation_types.append(scope.relation_type)
                    existing_relation_set.add(scope.relation_type)
                scope_key = scope.key()
                if is_new_scope:
                    existing.scope_keys.append(scope_key)
                    existing.first_seen_by_scope[scope_key] = discovery_date
                    existing_scope_set.add(scope_key)
                existing.last_seen_by_scope[scope_key] = discovery_date

                if scope.scope_type == "topic" and is_new_scope:
                    snapshot.topics_index.setdefault(scope.scope_id, []).append(
                        TopicEvent(
                            date=discovery_date,
                            canonical_id=paper.canonical_id,
                            relation_type=scope.relation_type,
                            score=scope.score,
                            label=scope.label,
                            reason=scope.reason,
                        )
                    )
                elif scope.scope_type == "baseline" and is_new_scope:
                    snapshot.baselines_index.setdefault(scope.scope_id, []).append(
                        BaselineEvent(
                            date=discovery_date,
                            canonical_id=paper.canonical_id,
                            relation_type=scope.relation_type,
                            score=scope.score,
                            label=scope.label,
                            reason=scope.reason,
                        )
                    )

            snapshot.seen[paper.canonical_id] = existing
            snapshot.papers[paper.canonical_id] = paper.model_dump(mode="json")

        return snapshot
