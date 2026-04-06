"""Best-effort enrichment and baseline-related candidate detection."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from logging import getLogger
from pathlib import Path

from src.clients.openalex import OpenAlexClient
from src.clients.semanticscholar import SemanticScholarClient, SemanticScholarRateLimitError
from src.core.cache import JsonCache
from src.core.dedup import title_similarity
from src.core.normalize import normalize_title
from src.models.baseline import BaselineConfig
from src.models.paper import Paper, PaperScope

LOGGER = getLogger(__name__)
DEFAULT_SEMANTIC_SCHOLAR_COOLDOWN_HOURS = 12


def _fallback_seed(baseline: BaselineConfig) -> Paper:
    return Paper(
        title=baseline.title,
        doi=baseline.doi,
        arxiv_id=baseline.arxiv_id,
        openalex_id=baseline.openalex_id,
        semanticscholar_id=baseline.semanticscholar_id,
        source_names=["config"],
        source_tags=[f"baseline:{baseline.id}:seed"],
    )


def _paper_from_cache(entry: dict[str, object]) -> Paper | None:
    payload = entry.get("paper")
    if isinstance(payload, dict):
        return Paper.model_validate(payload)
    return None


def _load_cache_entry(cache_path: Path | None, baseline_id: str) -> tuple[JsonCache | None, dict[str, object], dict[str, object] | None]:
    if cache_path is None:
        return None, {}, None
    cache = JsonCache(cache_path)
    payload = cache.load()
    raw_entry = payload.get(baseline_id)
    entry = raw_entry if isinstance(raw_entry, dict) else None
    return cache, payload, entry


def _cache_cooldown_active(entry: dict[str, object] | None) -> bool:
    if not entry:
        return False
    cooldown_until = entry.get("cooldown_until")
    if not isinstance(cooldown_until, str):
        return False
    try:
        return datetime.now(UTC) < datetime.fromisoformat(cooldown_until)
    except ValueError:
        return False


def _save_cache_entry(
    *,
    cache: JsonCache | None,
    payload: dict[str, object],
    baseline_id: str,
    paper: Paper | None = None,
    strategy: str | None = None,
    cooldown_hours: int | None = None,
    note: str | None = None,
) -> None:
    if cache is None:
        return
    entry: dict[str, object] = {
        "updated_at": datetime.now(UTC).isoformat(),
    }
    if strategy:
        entry["strategy"] = strategy
    if paper is not None:
        entry["paper"] = paper.model_dump(mode="json")
    if cooldown_hours is not None:
        entry["cooldown_until"] = (datetime.now(UTC) + timedelta(hours=cooldown_hours)).isoformat()
    if note:
        entry["note"] = note
    payload[baseline_id] = entry
    cache.save(payload)


def resolve_baseline_seed(
    baseline: BaselineConfig,
    openalex_client: OpenAlexClient,
    semanticscholar_client: SemanticScholarClient,
    cache_path: Path | None = None,
) -> Paper:
    """Resolve a baseline into a normalized paper, falling back to config only."""
    cache, cache_payload, cache_entry = _load_cache_entry(cache_path, baseline.id)
    cached_paper = _paper_from_cache(cache_entry) if cache_entry else None
    if cached_paper is not None:
        return cached_paper

    for identifier in baseline.identifier_candidates():
        try:
            paper = semanticscholar_client.get_paper(identifier)
            if paper:
                _save_cache_entry(
                    cache=cache,
                    payload=cache_payload,
                    baseline_id=baseline.id,
                    paper=paper,
                    strategy="semanticscholar_identifier",
                )
                return paper
        except Exception as exc:  # pragma: no cover - network path.
            LOGGER.warning("Failed to resolve baseline %s via Semantic Scholar (%s)", baseline.id, exc)

    if baseline.openalex_id:
        try:
            paper = openalex_client.get_work(baseline.openalex_id)
            if paper:
                _save_cache_entry(
                    cache=cache,
                    payload=cache_payload,
                    baseline_id=baseline.id,
                    paper=paper,
                    strategy="openalex_identifier",
                )
                return paper
        except Exception as exc:  # pragma: no cover - network path.
            LOGGER.warning("Failed to resolve baseline %s via OpenAlex (%s)", baseline.id, exc)

    if _cache_cooldown_active(cache_entry):
        return _fallback_seed(baseline)

    try:
        search_results = semanticscholar_client.search_papers(baseline.title, limit=3)
        if search_results:
            _save_cache_entry(
                cache=cache,
                payload=cache_payload,
                baseline_id=baseline.id,
                paper=search_results[0],
                strategy="semanticscholar_title_search",
            )
            return search_results[0]
    except SemanticScholarRateLimitError as exc:  # pragma: no cover - network path.
        retry_note = (
            f"rate_limited_retry_after={exc.retry_after_seconds}s"
            if exc.retry_after_seconds is not None
            else "rate_limited"
        )
        LOGGER.warning("Failed to resolve baseline %s by title search (%s)", baseline.id, exc)
        _save_cache_entry(
            cache=cache,
            payload=cache_payload,
            baseline_id=baseline.id,
            cooldown_hours=DEFAULT_SEMANTIC_SCHOLAR_COOLDOWN_HOURS,
            note=retry_note,
            strategy="semanticscholar_rate_limited",
        )
    except Exception as exc:  # pragma: no cover - network path.
        LOGGER.warning("Failed to resolve baseline %s by title search (%s)", baseline.id, exc)

    try:
        openalex_matches = openalex_client.search_works(baseline.title, max_results=3, sort="relevance_score:desc")
        if openalex_matches:
            _save_cache_entry(
                cache=cache,
                payload=cache_payload,
                baseline_id=baseline.id,
                paper=openalex_matches[0],
                strategy="openalex_title_search",
            )
            return openalex_matches[0]
    except Exception as exc:  # pragma: no cover - network path.
        LOGGER.warning("Failed to resolve baseline %s by OpenAlex title search (%s)", baseline.id, exc)

    return _fallback_seed(baseline)


def attach_related_baseline_scopes(
    papers: list[Paper],
    baselines: list[BaselineConfig],
    baseline_seeds: dict[str, Paper],
) -> list[Paper]:
    """Attach related-work scopes by comparing topic papers to baseline seeds."""
    for baseline in baselines:
        if not baseline.enabled or not baseline.track_related:
            continue
        seed = baseline_seeds.get(baseline.id)
        if not seed:
            continue
        baseline_title = normalize_title(seed.title)
        for paper in papers:
            if baseline_title == normalize_title(paper.title):
                continue
            if not any(scope.scope_type == "topic" and scope.scope_id == baseline.topic_id for scope in paper.scopes):
                continue
            if any(scope.scope_type == "baseline" and scope.scope_id == baseline.id for scope in paper.scopes):
                continue
            similarity = title_similarity(paper.title, seed.title)
            shared_authors = len(
                {normalize_title(author) for author in seed.authors}
                & {normalize_title(author) for author in paper.authors}
            )
            if similarity >= 72 or (similarity >= 64 and shared_authors > 0):
                paper.add_scope(
                    PaperScope(
                        scope_type="baseline",
                        scope_id=baseline.id,
                        relation_type="related",
                        reason=f"similar to baseline title ({similarity:.0f})",
                    )
                )
    return papers
