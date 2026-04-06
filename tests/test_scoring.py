from __future__ import annotations

from src.core.scoring import score_papers
from src.models.baseline import BaselineConfig
from src.models.paper import PaperScope
from src.models.topic import TopicConfig
from tests.helpers import make_paper


def test_scoring_marks_relevant_topic_and_baseline() -> None:
    topic = TopicConfig(
        id="vln",
        name="Vision-Language Navigation",
        queries=["vision language navigation", "instruction following"],
        preferred_venues=["NeurIPS"],
        preferred_authors=["Ada Lovelace"],
        min_score=8,
        enabled=True,
    )
    baseline = BaselineConfig(
        id="room-to-room",
        title="Vision-and-Language Navigation",
        topic_id="vln",
        track_new_citations=True,
        track_related=True,
        enabled=True,
    )
    baseline_seed = make_paper(title="Vision-and-Language Navigation", authors=["Ada Lovelace"])
    paper = make_paper(
        title="Vision Language Navigation with Instruction Following",
        abstract="This work studies vision language navigation and instruction following in embodied environments.",
        authors=["Ada Lovelace", "Grace Hopper"],
        scopes=[
            PaperScope(scope_type="topic", scope_id="vln", relation_type="topic"),
            PaperScope(scope_type="baseline", scope_id="room-to-room", relation_type="related"),
        ],
    )

    scored = score_papers([paper], {"vln": topic}, {"room-to-room": baseline}, {"room-to-room": baseline_seed})
    result = scored[0]

    assert result.label == "high_confidence"
    assert result.score >= 8
    assert any(scope.scope_type == "topic" and scope.label == "high_confidence" for scope in result.scopes)
