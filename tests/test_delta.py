from __future__ import annotations

from src.core.delta import StateStore
from src.models.paper import PaperScope
from tests.helpers import make_paper


def test_delta_detects_first_seen_and_new_scope(tmp_path) -> None:
    store = StateStore(tmp_path)
    snapshot = store.load()
    paper = make_paper(
        title="A Fresh Topic Paper",
        doi="10.1000/fresh",
        scopes=[PaperScope(scope_type="topic", scope_id="vln", relation_type="topic", score=9.0, label="high_confidence")],
    )

    first_delta = store.compute_delta(snapshot, [paper], "2026-04-06")
    assert len(first_delta.new_global_papers) == 1
    assert len(first_delta.topic_new_papers["vln"]) == 1

    updated_snapshot = store.apply_delta(snapshot, [paper], "2026-04-06")
    second_delta = store.compute_delta(updated_snapshot, [paper], "2026-04-07")
    assert second_delta.all_new_papers == []

    paper.add_scope(
        PaperScope(
            scope_type="baseline",
            scope_id="room-to-room",
            relation_type="related",
            score=6.0,
            label="candidate",
            reason="similar to baseline title",
        )
    )
    third_delta = store.compute_delta(updated_snapshot, [paper], "2026-04-07")
    assert len(third_delta.baseline_new_related["room-to-room"]) == 1
