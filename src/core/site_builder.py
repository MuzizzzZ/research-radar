"""Static site and JSON payload generation for GitHub Pages."""

from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

from src.models.baseline import BaselineConfig
from src.models.paper import Paper
from src.models.state import StateSnapshot
from src.models.topic import TopicConfig
from src.utils.io import dump_json, dump_text, ensure_parent


def _paper_view(paper: Paper, reason: str | None = None, relation_type: str | None = None) -> dict[str, Any]:
    return {
        "canonical_id": paper.canonical_id,
        "title": paper.title,
        "authors": paper.authors[:5],
        "year": paper.year,
        "publication_date": paper.publication_date,
        "venue": paper.venue,
        "score": paper.score,
        "label": paper.label,
        "reason": reason or paper.primary_reason,
        "relation_type": relation_type,
        "abstract": paper.abstract,
        "doi": paper.doi,
        "arxiv_id": paper.arxiv_id,
        "openalex_id": paper.openalex_id,
        "semanticscholar_id": paper.semanticscholar_id,
        "best_url": paper.best_external_url(),
        "topic_ids": paper.topic_ids(),
        "baseline_ids": paper.baseline_ids(),
    }


def _report_records(reports_dir: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    daily_dir = reports_dir / "daily"
    if not daily_dir.exists():
        return records
    for path in sorted(daily_dir.glob("*.md"), reverse=True):
        lines = path.read_text(encoding="utf-8").splitlines()
        preview = ""
        for line in lines[1:]:
            if line.strip():
                preview = line.strip()
                break
        records.append({"date": path.stem, "path": f"reports/daily/{path.name}", "preview": preview})
    return records


def _latest_report_date(snapshot: StateSnapshot, latest_run: dict[str, Any]) -> str | None:
    if latest_run.get("report_date"):
        return latest_run["report_date"]
    dates = []
    for events in snapshot.topics_index.values():
        dates.extend(event.date for event in events)
    for events in snapshot.baselines_index.values():
        dates.extend(event.date for event in events)
    return max(dates) if dates else None


def build_site(
    *,
    root: Path,
    topics: list[TopicConfig],
    baselines: list[BaselineConfig],
    snapshot: StateSnapshot,
    latest_run: dict[str, Any] | None = None,
) -> None:
    """Generate docs/ pages plus machine-readable JSON payloads."""
    latest_run = latest_run or {}
    docs_dir = root / "docs"
    data_dir = root / "data" / "site_data"
    docs_data_dir = docs_dir / "data"
    assets_dir = docs_dir / "assets"

    template_dir = root / "src" / "templates"
    env = Environment(
        loader=FileSystemLoader(str(template_dir)),
        autoescape=select_autoescape(["html", "xml"]),
    )

    latest_date = _latest_report_date(snapshot, latest_run)
    topic_lookup = {topic.id: topic for topic in topics}
    baseline_lookup = {baseline.id: baseline for baseline in baselines}

    topic_rows: list[dict[str, Any]] = []
    for topic in topics:
        events = sorted(snapshot.topics_index.get(topic.id, []), key=lambda event: (event.date, event.score), reverse=True)
        papers = []
        for event in events:
            payload = snapshot.papers.get(event.canonical_id)
            if not payload:
                continue
            papers.append(_paper_view(Paper.model_validate(payload), reason=event.reason, relation_type=event.relation_type))
        topic_rows.append(
            {
                "id": topic.id,
                "name": topic.name,
                "queries": topic.queries,
                "total_papers": len(papers),
                "today_count": sum(1 for event in events if event.date == latest_date),
                "papers": papers,
            }
        )

    baseline_rows: list[dict[str, Any]] = []
    for baseline in baselines:
        events = sorted(snapshot.baselines_index.get(baseline.id, []), key=lambda event: (event.date, event.score), reverse=True)
        citations = []
        related = []
        for event in events:
            payload = snapshot.papers.get(event.canonical_id)
            if not payload:
                continue
            paper_view = _paper_view(Paper.model_validate(payload), reason=event.reason, relation_type=event.relation_type)
            if event.relation_type == "citation":
                citations.append(paper_view)
            else:
                related.append(paper_view)
        baseline_rows.append(
            {
                "id": baseline.id,
                "title": baseline.title,
                "topic_id": baseline.topic_id,
                "today_citations": sum(1 for event in events if event.date == latest_date and event.relation_type == "citation"),
                "today_related": sum(1 for event in events if event.date == latest_date and event.relation_type == "related"),
                "citations": citations,
                "related": related,
            }
        )

    recent_papers = []
    if latest_date:
        canonical_ids = []
        for events in snapshot.topics_index.values():
            canonical_ids.extend(event.canonical_id for event in events if event.date == latest_date)
        for events in snapshot.baselines_index.values():
            canonical_ids.extend(event.canonical_id for event in events if event.date == latest_date)
        unique_ids = list(dict.fromkeys(canonical_ids))
        for canonical_id in unique_ids[:12]:
            payload = snapshot.papers.get(canonical_id)
            if payload:
                recent_papers.append(_paper_view(Paper.model_validate(payload)))

    reports = _report_records(root / "reports")
    docs_reports_dir = docs_dir / "reports" / "daily"
    docs_reports_dir.mkdir(parents=True, exist_ok=True)
    for path in sorted((root / "reports" / "daily").glob("*.md")):
        shutil.copy2(path, docs_reports_dir / path.name)

    summary_payload = {
        "project_name": "research-radar",
        "latest_report_date": latest_date,
        "generated_at": latest_run.get("generated_at", latest_date),
        "today_new_total": latest_run.get("new_scope_count", len(recent_papers)),
        "today_new_global": latest_run.get("new_global_count", 0),
        "issues": latest_run.get("issues", []),
        "topics": [{"id": row["id"], "name": row["name"], "today_count": row["today_count"], "total_papers": row["total_papers"]} for row in topic_rows],
        "baselines": [
            {
                "id": row["id"],
                "title": row["title"],
                "topic_id": row["topic_id"],
                "today_citations": row["today_citations"],
                "today_related": row["today_related"],
            }
            for row in baseline_rows
        ],
        "recent_papers": recent_papers,
    }
    about_payload = {
        "project_name": "research-radar",
        "architecture": "GitHub Actions + repository-backed JSON/Markdown state + GitHub Pages static site",
        "data_sources": ["OpenAlex", "Semantic Scholar"],
        "limitations": [
            "The system relies on public metadata availability and API uptime.",
            "Title-based fallback resolution can miss or over-match some baseline papers.",
            "Rule-based relevance scoring is intentionally transparent but not exhaustive.",
        ],
    }
    config_payload = {
        "schema_version": 1,
        "topics": [topic.model_dump(mode="json", exclude_none=True) for topic in topics],
        "baselines": [baseline.model_dump(mode="json", exclude_none=True) for baseline in baselines],
        "meta": {
            "topics_path": "config/topics.yaml",
            "baselines_path": "config/baselines.yaml",
            "editing_mode": "browser",
        },
    }

    payloads = {
        "index.json": summary_payload,
        "topics.json": {"topics": topic_rows},
        "baselines.json": {"baselines": baseline_rows},
        "reports.json": {"reports": reports},
        "about.json": about_payload,
        "config.json": config_payload,
    }

    for filename, payload in payloads.items():
        dump_json(data_dir / filename, payload)
        dump_json(docs_data_dir / filename, payload)

    template_context = {
        "summary": summary_payload,
        "topics": topic_rows,
        "baselines": baseline_rows,
        "reports": reports,
        "about": about_payload,
        "config_payload": config_payload,
    }

    for template_name, output_name in [
        ("index.html.j2", "index.html"),
        ("topics.html.j2", "topics.html"),
        ("baselines.html.j2", "baselines.html"),
        ("reports.html.j2", "reports.html"),
        ("about.html.j2", "about.html"),
        ("config.html.j2", "config.html"),
    ]:
        template = env.get_template(template_name)
        dump_text(docs_dir / output_name, template.render(page_title="Research Radar", **template_context))

    styles = (template_dir / "styles.css").read_text(encoding="utf-8")
    script = (template_dir / "app.js").read_text(encoding="utf-8")
    config_script = (template_dir / "config_studio.js").read_text(encoding="utf-8")
    dump_text(assets_dir / "styles.css", styles)
    dump_text(assets_dir / "app.js", script)
    dump_text(assets_dir / "config_studio.js", config_script)

    ensure_parent(docs_dir / ".nojekyll")
    dump_text(docs_dir / ".nojekyll", "")
