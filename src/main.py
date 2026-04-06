"""CLI entrypoint for research-radar."""

from __future__ import annotations

import argparse
import logging
from pathlib import Path
from typing import Any

from src.clients.openalex import OpenAlexClient, OpenAlexError
from src.clients.semanticscholar import SemanticScholarClient, SemanticScholarError
from src.core.config_loader import load_app_config
from src.core.dedup import deduplicate_papers
from src.core.delta import StateStore
from src.core.enrich import attach_related_baseline_scopes, resolve_baseline_seed
from src.core.report_builder import build_daily_report_markdown, build_historical_report_context, write_report
from src.core.scoring import score_papers
from src.core.site_builder import build_site
from src.models.baseline import BaselineConfig
from src.models.paper import Paper, PaperScope
from src.models.topic import TopicConfig
from src.utils.dates import iso_date, lookback_window, today_in_timezone
from src.utils.io import dump_json, load_json
from src.utils.logging import setup_logging

LOGGER = logging.getLogger(__name__)
ROOT = Path(__file__).resolve().parent.parent


def _unique(items: list[str]) -> list[str]:
    return list(dict.fromkeys(item for item in items if item))


def _attach_topic_scope(paper: Paper, topic: TopicConfig, query: str) -> Paper:
    paper.source_names = _unique([*paper.source_names, "openalex"])
    paper.source_tags = _unique([*paper.source_tags, f"topic:{topic.id}:query:{query}"])
    paper.add_scope(
        PaperScope(
            scope_type="topic",
            scope_id=topic.id,
            relation_type="topic",
            reason=f"matched topic query '{query}'",
        )
    )
    return paper


def _attach_baseline_scope(paper: Paper, baseline: BaselineConfig, relation_type: str) -> Paper:
    paper.source_names = _unique([*paper.source_names, "semanticscholar"])
    paper.source_tags = _unique([*paper.source_tags, f"baseline:{baseline.id}:{relation_type}"])
    readable_reason = "new citing paper" if relation_type == "citation" else "baseline related paper"
    paper.add_scope(
        PaperScope(
            scope_type="baseline",
            scope_id=baseline.id,
            relation_type=relation_type,
            reason=f"{readable_reason} for '{baseline.title}'",
        )
    )
    return paper


def _baseline_citation_identifier(baseline: BaselineConfig, seed: Paper) -> str | None:
    if seed.semanticscholar_id:
        return seed.semanticscholar_id
    if baseline.semanticscholar_id:
        return baseline.semanticscholar_id
    if seed.doi:
        return f"DOI:{seed.doi}"
    if baseline.doi:
        return f"DOI:{baseline.doi}"
    if seed.arxiv_id:
        return f"ARXIV:{seed.arxiv_id}"
    if baseline.arxiv_id:
        return f"ARXIV:{baseline.arxiv_id}"
    return None


def _prune_filtered_scopes(papers: list[Paper]) -> list[Paper]:
    selected: list[Paper] = []
    for paper in papers:
        kept_scopes = [scope for scope in paper.scopes if scope.label != "filtered_out"]
        if not kept_scopes:
            continue
        paper.scopes = kept_scopes
        best_scope = max(kept_scopes, key=lambda scope: scope.score)
        paper.score = best_scope.score
        paper.label = best_scope.label
        paper.primary_reason = best_scope.reason
        paper.reasons = _unique([scope.reason for scope in kept_scopes if scope.reason])
        selected.append(paper)
    return selected


def _latest_run_path(root: Path) -> Path:
    return root / "data" / "site_data" / "latest_run.json"


def run_update(root: Path, dry_run: bool = False) -> dict[str, Any]:
    """Execute one incremental update cycle."""
    app_config = load_app_config(root)
    settings = app_config.settings
    setup_logging(settings.log_level)

    report_date = today_in_timezone(settings.timezone)
    window_start, window_end = lookback_window(report_date, settings.lookback_days)
    run_date = iso_date(report_date)
    issues: list[str] = []

    openalex_client = OpenAlexClient(
        email=settings.openalex_email,
        timeout=settings.request_timeout_seconds,
        user_agent=settings.user_agent,
    )
    semanticscholar_client = SemanticScholarClient(
        timeout=settings.request_timeout_seconds,
        user_agent=settings.user_agent,
        api_key_env=settings.semanticscholar_api_key_env,
    )

    enabled_topics = [topic for topic in app_config.topics if topic.enabled]
    enabled_baselines = [baseline for baseline in app_config.baselines if baseline.enabled]
    candidates: list[Paper] = []

    for topic in enabled_topics:
        per_query = max(1, settings.max_results_per_topic // max(len(topic.queries), 1))
        for query in topic.queries:
            try:
                papers = openalex_client.search_recent_works(
                    query=query,
                    since_date=window_start,
                    until_date=window_end,
                    max_results=per_query,
                )
                candidates.extend(_attach_topic_scope(paper, topic, query) for paper in papers)
            except OpenAlexError as exc:
                issues.append(f"OpenAlex topic fetch failed for {topic.id} / '{query}': {exc}")

    baseline_seeds: dict[str, Paper] = {}
    baseline_seed_cache_path = root / "data" / "cache" / "baseline_seeds.json"
    for baseline in enabled_baselines:
        baseline_seeds[baseline.id] = resolve_baseline_seed(
            baseline,
            openalex_client,
            semanticscholar_client,
            cache_path=baseline_seed_cache_path,
        )

    for baseline in enabled_baselines:
        if not baseline.track_new_citations:
            continue
        identifier = _baseline_citation_identifier(baseline, baseline_seeds[baseline.id])
        if not identifier:
            issues.append(f"Baseline {baseline.id} could not be resolved to a citation-capable identifier.")
            continue
        try:
            citation_papers = semanticscholar_client.get_new_citations(
                identifier=identifier,
                since_date=window_start,
                limit=settings.max_results_per_topic,
            )
            candidates.extend(_attach_baseline_scope(paper, baseline, "citation") for paper in citation_papers)
        except SemanticScholarError as exc:
            issues.append(f"Semantic Scholar citation fetch failed for baseline {baseline.id}: {exc}")

    deduped = deduplicate_papers(candidates)
    deduped = attach_related_baseline_scopes(deduped, enabled_baselines, baseline_seeds)
    scored = score_papers(
        papers=deduped,
        topics={topic.id: topic for topic in enabled_topics},
        baselines={baseline.id: baseline for baseline in enabled_baselines},
        baseline_seeds=baseline_seeds,
    )
    selected = _prune_filtered_scopes(scored)

    state_store = StateStore(root / "data" / "state")
    snapshot = state_store.load()
    delta = state_store.compute_delta(snapshot, selected, run_date)
    new_scope_count = sum(len(papers) for papers in delta.topic_new_papers.values())
    new_scope_count += sum(len(papers) for papers in delta.baseline_new_citations.values())
    new_scope_count += sum(len(papers) for papers in delta.baseline_new_related.values())

    topic_sections = [
        {"topic": topic, "papers": sorted(delta.topic_new_papers.get(topic.id, []), key=lambda paper: paper.score, reverse=True)}
        for topic in enabled_topics
    ]
    baseline_sections = [
        {
            "baseline": baseline,
            "citations": sorted(delta.baseline_new_citations.get(baseline.id, []), key=lambda paper: paper.score, reverse=True),
            "related": sorted(delta.baseline_new_related.get(baseline.id, []), key=lambda paper: paper.score, reverse=True),
        }
        for baseline in enabled_baselines
    ]

    report_context = {
        "report_date": run_date,
        "window_start": window_start.isoformat(),
        "window_end": window_end.isoformat(),
        "candidates_collected": len(candidates),
        "deduped_count": len(deduped),
        "selected_count": len(selected),
        "new_scope_count": new_scope_count,
        "new_global_count": len(delta.new_global_papers),
        "topic_sections": topic_sections,
        "baseline_sections": baseline_sections,
        "issues": issues,
    }

    LOGGER.info(
        "Run summary: %s raw candidates, %s deduped, %s selected, %s new scope discoveries",
        len(candidates),
        len(deduped),
        len(selected),
        new_scope_count,
    )

    if dry_run:
        return report_context

    updated_snapshot = state_store.apply_delta(snapshot, selected, run_date)
    state_store.save(updated_snapshot)

    report_markdown = build_daily_report_markdown(report_context)
    write_report(root / "reports" / "daily" / f"{run_date}.md", report_markdown)

    latest_run = {
        "report_date": run_date,
        "generated_at": run_date,
        "window_start": window_start.isoformat(),
        "window_end": window_end.isoformat(),
        "candidates_collected": len(candidates),
        "deduped_count": len(deduped),
        "selected_count": len(selected),
        "new_scope_count": new_scope_count,
        "new_global_count": len(delta.new_global_papers),
        "issues": issues,
    }
    dump_json(_latest_run_path(root), latest_run)
    build_site(
        root=root,
        topics=app_config.topics,
        baselines=app_config.baselines,
        snapshot=updated_snapshot,
        latest_run=latest_run,
    )
    return report_context


def build_report(root: Path, report_date: str) -> Path:
    """Rebuild a report from persisted state for a specific date."""
    app_config = load_app_config(root)
    state_store = StateStore(root / "data" / "state")
    snapshot = state_store.load()
    context = build_historical_report_context(report_date, snapshot, app_config.topics, app_config.baselines)
    output_path = root / "reports" / "daily" / f"{report_date}.md"
    write_report(output_path, build_daily_report_markdown(context))
    return output_path


def rebuild_site(root: Path) -> None:
    """Regenerate docs/ using the current saved state."""
    app_config = load_app_config(root)
    state_store = StateStore(root / "data" / "state")
    snapshot = state_store.load()
    latest_run = load_json(_latest_run_path(root), {})
    build_site(
        root=root,
        topics=app_config.topics,
        baselines=app_config.baselines,
        snapshot=snapshot,
        latest_run=latest_run,
    )


def validate_config_command(root: Path) -> str:
    """Load config and return a human-readable validation summary."""
    app_config = load_app_config(root)
    enabled_topics = sum(1 for topic in app_config.topics if topic.enabled)
    enabled_baselines = sum(1 for baseline in app_config.baselines if baseline.enabled)
    return (
        f"Config valid: {len(app_config.topics)} topics ({enabled_topics} enabled), "
        f"{len(app_config.baselines)} baselines ({enabled_baselines} enabled)."
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="python -m src.main", description="research-radar CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("validate-config", help="Validate the repository config files.")

    run_parser = subparsers.add_parser("run", help="Run one incremental update cycle.")
    run_parser.add_argument("--dry-run", action="store_true", help="Run without writing reports, site output, or state.")

    subparsers.add_parser("build-site", help="Rebuild the static site from saved state.")

    report_parser = subparsers.add_parser("build-report", help="Rebuild a daily report from saved state.")
    report_parser.add_argument("--date", required=True, help="Report date in YYYY-MM-DD format.")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    try:
        if args.command == "validate-config":
            print(validate_config_command(ROOT))
            return 0
        if args.command == "run":
            summary = run_update(ROOT, dry_run=args.dry_run)
            print(
                json_safe(
                    {
                        "report_date": summary["report_date"],
                        "candidates_collected": summary["candidates_collected"],
                        "deduped_count": summary["deduped_count"],
                        "selected_count": summary["selected_count"],
                        "new_scope_count": summary["new_scope_count"],
                        "new_global_count": summary["new_global_count"],
                        "issues": summary["issues"],
                        "dry_run": args.dry_run,
                    }
                )
            )
            return 0
        if args.command == "build-site":
            rebuild_site(ROOT)
            print("Static site rebuilt in docs/.")
            return 0
        if args.command == "build-report":
            path = build_report(ROOT, args.date)
            print(f"Report rebuilt: {path}")
            return 0
    except Exception as exc:  # pragma: no cover - CLI guard.
        LOGGER.exception("Command failed: %s", exc)
        print(f"ERROR: {exc}")
        return 1

    return 1


def json_safe(payload: dict[str, Any]) -> str:
    """Pretty-print JSON for CLI output."""
    import json

    return json.dumps(payload, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    raise SystemExit(main())
