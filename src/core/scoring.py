"""Explainable rule-based scoring for topic and baseline relevance."""

from __future__ import annotations

from src.core.dedup import title_similarity
from src.core.normalize import normalize_title
from src.models.baseline import BaselineConfig
from src.models.paper import Paper, PaperLabel, PaperScope
from src.models.topic import TopicConfig


def _contains_phrase(text: str, phrase: str) -> bool:
    return normalize_title(phrase) in text if phrase else False


def _count_token_hits(text: str, phrases: list[str]) -> int:
    hits = 0
    for phrase in phrases:
        normalized = normalize_title(phrase)
        if not normalized:
            continue
        if normalized in text:
            hits += 1
    return hits


def classify_score(score: float, min_score: float | None = None) -> PaperLabel:
    """Translate numeric scores to report-friendly labels."""
    high_threshold = max(min_score or 0.0, 8.0)
    candidate_threshold = max(4.0, high_threshold / 2)
    if score >= high_threshold:
        return "high_confidence"
    if score >= candidate_threshold:
        return "candidate"
    return "filtered_out"


def score_topic_scope(paper: Paper, topic: TopicConfig) -> tuple[float, list[str]]:
    """Score a paper against a configured topic."""
    title_text = normalize_title(paper.title)
    abstract_text = normalize_title(paper.abstract)
    score = 0.0
    reasons: list[str] = []

    title_hits = _count_token_hits(title_text, topic.queries)
    abstract_hits = _count_token_hits(abstract_text, topic.queries)
    if title_hits:
        score += title_hits * 3.0
        reasons.append(f"title hit x{title_hits}")
    if abstract_hits:
        score += abstract_hits * 1.5
        reasons.append(f"abstract hit x{abstract_hits}")

    if paper.venue and any(normalize_title(venue) == normalize_title(paper.venue) for venue in topic.preferred_venues):
        score += 2.0
        reasons.append("preferred venue")

    author_hits = 0
    if topic.preferred_authors:
        author_set = {normalize_title(author) for author in paper.authors}
        for preferred in topic.preferred_authors:
            if normalize_title(preferred) in author_set:
                author_hits += 1
        if author_hits:
            score += min(author_hits, 2) * 1.5
            reasons.append(f"preferred author x{author_hits}")

    exclude_hits = _count_token_hits(f"{title_text} {abstract_text}", topic.exclude)
    if exclude_hits:
        score -= exclude_hits * 4.0
        reasons.append(f"exclude penalty x{exclude_hits}")

    if not reasons:
        reasons.append("weak topical signal")
    return score, reasons


def score_baseline_scope(
    paper: Paper,
    scope: PaperScope,
    baseline: BaselineConfig,
    baseline_seed: Paper | None,
) -> tuple[float, list[str]]:
    """Score a paper against a baseline relation."""
    score = 0.0
    reasons: list[str] = []

    if scope.relation_type == "citation":
        score += 7.5
        reasons.append("direct citation to baseline")

    if baseline_seed:
        similarity = title_similarity(paper.title, baseline_seed.title)
        if similarity >= 88:
            score += 4.0
            reasons.append(f"title similarity {similarity:.0f}")
        elif similarity >= 75:
            score += 2.0
            reasons.append(f"title similarity {similarity:.0f}")

        baseline_authors = {normalize_title(author) for author in baseline_seed.authors}
        author_overlap = len(baseline_authors & {normalize_title(author) for author in paper.authors})
        if author_overlap:
            score += min(author_overlap, 2) * 1.0
            reasons.append("shared author")

    if scope.relation_type == "related":
        score += 3.5
        reasons.append("related to baseline topic cluster")

    if not reasons:
        reasons.append(f"linked to baseline {baseline.id}")
    return score, reasons


def score_papers(
    papers: list[Paper],
    topics: dict[str, TopicConfig],
    baselines: dict[str, BaselineConfig],
    baseline_seeds: dict[str, Paper],
) -> list[Paper]:
    """Score each paper across its scopes and set the top-level label."""
    for paper in papers:
        best_score = -999.0
        best_label: PaperLabel = "filtered_out"
        best_reason = "insufficient signal"
        paper.reasons = []

        for scope in paper.scopes:
            if scope.scope_type == "topic":
                topic = topics.get(scope.scope_id)
                if not topic:
                    continue
                score, reasons = score_topic_scope(paper, topic)
                label = classify_score(score, topic.min_score)
            else:
                baseline = baselines.get(scope.scope_id)
                if not baseline:
                    continue
                score, reasons = score_baseline_scope(
                    paper=paper,
                    scope=scope,
                    baseline=baseline,
                    baseline_seed=baseline_seeds.get(scope.scope_id),
                )
                label = classify_score(score, min_score=6.0 if scope.relation_type == "citation" else 5.0)

            scope.score = round(score, 2)
            scope.label = label
            scope.reason = ", ".join(reasons[:3])
            paper.add_reason(scope.reason)

            if score > best_score:
                best_score = score
                best_label = label
                best_reason = scope.reason

        paper.score = round(max(best_score, 0.0), 2)
        paper.label = best_label
        paper.primary_reason = best_reason

    return papers
