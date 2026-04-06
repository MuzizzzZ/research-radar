"""Markdown report generation for daily and historical snapshots."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from src.models.paper import Paper
from src.models.state import StateSnapshot
from src.models.topic import TopicConfig
from src.models.baseline import BaselineConfig
from src.utils.io import dump_text


def _paper_bullet(paper: Paper) -> str:
    authors = ", ".join(paper.authors[:3]) if paper.authors else "Unknown authors"
    if len(paper.authors) > 3:
        authors += ", et al."
    venue_bits = [bit for bit in [paper.publication_date or paper.year, paper.venue] if bit]
    venue_text = " | ".join(str(bit) for bit in venue_bits) if venue_bits else "date/venue unavailable"
    links: list[str] = []
    if paper.doi:
        links.append(f"[DOI](https://doi.org/{paper.doi})")
    if paper.arxiv_id:
        links.append(f"[arXiv](https://arxiv.org/abs/{paper.arxiv_id})")
    if paper.openalex_id:
        links.append(f"[OpenAlex]({paper.openalex_id})")
    if paper.semanticscholar_id:
        links.append(f"[Semantic Scholar](https://www.semanticscholar.org/paper/{paper.semanticscholar_id})")
    reason = paper.primary_reason or "; ".join(paper.reasons[:2]) or "no reason recorded"
    abstract = paper.abstract.strip().replace("\n", " ") if paper.abstract else "Abstract not available."
    if len(abstract) > 280:
        abstract = abstract[:279].rstrip() + "…"
    return "\n".join(
        [
            f"- **{paper.title}**",
            f"  - Authors: {authors}",
            f"  - Meta: {venue_text}",
            f"  - Score: {paper.score:.1f} ({paper.label})",
            f"  - Reason: {reason}",
            f"  - Abstract: {abstract}",
            f"  - Links: {' | '.join(links) if links else 'N/A'}",
        ]
    )


def build_daily_report_markdown(context: dict[str, Any]) -> str:
    """Render a markdown daily report from the supplied context."""
    lines: list[str] = [
        f"# Research Radar Daily Report - {context['report_date']}",
        "",
        "## Summary",
        "",
        f"- Lookback window: {context['window_start']} to {context['window_end']}",
        f"- Raw candidates collected: {context['candidates_collected']}",
        f"- Deduplicated candidates: {context['deduped_count']}",
        f"- Selected papers after scoring: {context['selected_count']}",
        f"- New scope discoveries today: {context['new_scope_count']}",
        f"- First-time global papers today: {context['new_global_count']}",
        "",
        "## Topic-Level New Papers",
        "",
    ]

    for section in context["topic_sections"]:
        lines.append(f"### {section['topic'].name} ({len(section['papers'])})")
        lines.append("")
        if not section["papers"]:
            lines.append("- No new topic-level papers.")
            lines.append("")
            continue
        for paper in section["papers"]:
            lines.append(_paper_bullet(paper))
            lines.append("")

    lines.extend(["## Baseline Tracking", ""])
    for section in context["baseline_sections"]:
        baseline = section["baseline"]
        lines.append(f"### {baseline.title}")
        lines.append("")
        lines.append(f"- Topic: `{baseline.topic_id}`")
        lines.append(f"- New citing papers: {len(section['citations'])}")
        lines.append(f"- New related papers: {len(section['related'])}")
        lines.append("")
        if section["citations"]:
            lines.append("#### New Citing Papers")
            lines.append("")
            for paper in section["citations"]:
                lines.append(_paper_bullet(paper))
                lines.append("")
        if section["related"]:
            lines.append("#### New Related Papers")
            lines.append("")
            for paper in section["related"]:
                lines.append(_paper_bullet(paper))
                lines.append("")
        if not section["citations"] and not section["related"]:
            lines.append("- No new baseline-specific papers.")
            lines.append("")

    lines.extend(
        [
            "## Data Sources",
            "",
            "- OpenAlex is the primary source for topic discovery and metadata.",
            "- Semantic Scholar is used for baseline citation tracking and metadata enrichment.",
            "",
            "## Failures / Known Limitations",
            "",
        ]
    )
    if context["issues"]:
        lines.extend(f"- {issue}" for issue in context["issues"])
    else:
        lines.append("- No source failures were recorded in this run.")

    return "\n".join(lines).rstrip() + "\n"


def build_historical_report_context(
    target_date: str,
    snapshot: StateSnapshot,
    topics: list[TopicConfig],
    baselines: list[BaselineConfig],
) -> dict[str, Any]:
    """Reconstruct report context from persisted indexes."""
    topic_lookup = {topic.id: topic for topic in topics}
    baseline_lookup = {baseline.id: baseline for baseline in baselines}

    topic_sections = []
    for topic in topics:
        events = [event for event in snapshot.topics_index.get(topic.id, []) if event.date == target_date]
        papers = [
            Paper.model_validate(snapshot.papers[event.canonical_id])
            for event in sorted(events, key=lambda item: item.score, reverse=True)
            if event.canonical_id in snapshot.papers
        ]
        topic_sections.append({"topic": topic, "papers": papers})

    baseline_sections = []
    for baseline in baselines:
        events = [event for event in snapshot.baselines_index.get(baseline.id, []) if event.date == target_date]
        citation_papers = []
        related_papers = []
        for event in sorted(events, key=lambda item: item.score, reverse=True):
            if event.canonical_id not in snapshot.papers:
                continue
            paper = Paper.model_validate(snapshot.papers[event.canonical_id])
            if event.relation_type == "citation":
                citation_papers.append(paper)
            else:
                related_papers.append(paper)
        baseline_sections.append({"baseline": baseline_lookup[baseline.id], "citations": citation_papers, "related": related_papers})

    return {
        "report_date": target_date,
        "window_start": target_date,
        "window_end": target_date,
        "candidates_collected": sum(len(section["papers"]) for section in topic_sections) + sum(
            len(section["citations"]) + len(section["related"]) for section in baseline_sections
        ),
        "deduped_count": len(
            {
                paper.canonical_id
                for section in topic_sections
                for paper in section["papers"]
                if paper.canonical_id
            }
            | {
                paper.canonical_id
                for section in baseline_sections
                for paper in [*section["citations"], *section["related"]]
                if paper.canonical_id
            }
        ),
        "selected_count": len(
            {
                paper.canonical_id
                for section in topic_sections
                for paper in section["papers"]
                if paper.canonical_id
            }
            | {
                paper.canonical_id
                for section in baseline_sections
                for paper in [*section["citations"], *section["related"]]
                if paper.canonical_id
            }
        ),
        "new_scope_count": sum(len(section["papers"]) for section in topic_sections)
        + sum(len(section["citations"]) + len(section["related"]) for section in baseline_sections),
        "new_global_count": 0,
        "topic_sections": topic_sections,
        "baseline_sections": baseline_sections,
        "issues": ["Historical report reconstructed from saved state; collection-time errors are not available."],
    }


def write_report(path: Path, markdown: str) -> None:
    """Write a rendered report to disk."""
    dump_text(path, markdown)
