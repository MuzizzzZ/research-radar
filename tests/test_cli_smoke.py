from __future__ import annotations

from datetime import date
import json
import shutil
from pathlib import Path

from src import main as cli_main
from src.models.paper import Paper


REPO_ROOT = Path(__file__).resolve().parents[1]
FIXED_DATE = date(2026, 4, 7)


def make_temp_repo(tmp_path: Path) -> Path:
    root = tmp_path / "repo"
    (root / "src").mkdir(parents=True, exist_ok=True)
    shutil.copytree(REPO_ROOT / "config", root / "config")
    shutil.copytree(REPO_ROOT / "src" / "templates", root / "src" / "templates")
    (root / "data" / "state").mkdir(parents=True, exist_ok=True)
    (root / "data" / "site_data").mkdir(parents=True, exist_ok=True)
    (root / "reports" / "daily").mkdir(parents=True, exist_ok=True)
    (root / "reports" / "weekly").mkdir(parents=True, exist_ok=True)
    (root / "docs").mkdir(parents=True, exist_ok=True)

    for filename in ["seen.json", "papers.json", "topics_index.json", "baselines_index.json"]:
        (root / "data" / "state" / filename).write_text("{}\n", encoding="utf-8")
    return root


def install_fake_sources(monkeypatch) -> None:
    topic_paper = Paper(
        title="Vision Language Navigation in Dynamic Environments",
        abstract="A study on vision language navigation and instruction following in embodied environments.",
        authors=["Ada Lovelace"],
        year=2026,
        publication_date="2026-04-07",
        venue="NeurIPS",
        doi="10.1000/vln-topic",
        source_names=["openalex"],
    )
    citation_paper = Paper(
        title="Follow-up Advances for Vision-and-Language Navigation",
        abstract="This paper cites prior vision and language navigation work and improves instruction following.",
        authors=["Grace Hopper"],
        year=2026,
        publication_date="2026-04-07",
        venue="CVPR",
        doi="10.1000/vln-citation",
        semanticscholar_id="S2-CITATION",
        source_names=["semanticscholar"],
    )
    baseline_seeds = {
        "secure-uav-ris": Paper(
            title="Joint Trajectory and Passive Beamforming Design for Secure UAV-RIS Communication Systems",
            semanticscholar_id="S2-UAV",
            source_names=["semanticscholar"],
        ),
        "room-to-room": Paper(
            title="Vision-and-Language Navigation: Interpreting visually-grounded navigation instructions in real environments",
            semanticscholar_id="S2-ROOM",
            authors=["Ada Lovelace"],
            source_names=["semanticscholar"],
        ),
    }

    def fake_search_recent_works(self, query: str, since_date, until_date, max_results: int = 50):
        del self, since_date, until_date, max_results
        normalized = query.lower()
        if "vision" in normalized or "navigation" in normalized or "vln" in normalized:
            return [topic_paper.model_copy(deep=True)]
        return []

    def fake_resolve_baseline_seed(baseline, openalex_client, semanticscholar_client, cache_path=None):
        del openalex_client, semanticscholar_client, cache_path
        return baseline_seeds[baseline.id].model_copy(deep=True)

    def fake_get_new_citations(self, identifier: str, since_date, limit: int = 50):
        del self, since_date, limit
        if identifier == "S2-ROOM":
            return [citation_paper.model_copy(deep=True)]
        return []

    monkeypatch.setattr(cli_main, "today_in_timezone", lambda timezone: FIXED_DATE)
    monkeypatch.setattr(cli_main.OpenAlexClient, "search_recent_works", fake_search_recent_works)
    monkeypatch.setattr(cli_main, "resolve_baseline_seed", fake_resolve_baseline_seed)
    monkeypatch.setattr(cli_main.SemanticScholarClient, "search_papers", lambda *args, **kwargs: [])
    monkeypatch.setattr(cli_main.SemanticScholarClient, "get_paper", lambda *args, **kwargs: None)
    monkeypatch.setattr(cli_main.SemanticScholarClient, "get_new_citations", fake_get_new_citations)


def test_validate_config_cli_smoke(tmp_path, monkeypatch, capsys) -> None:
    root = make_temp_repo(tmp_path)
    monkeypatch.setattr(cli_main, "ROOT", root)
    monkeypatch.setattr(
        cli_main.argparse.ArgumentParser,
        "parse_args",
        lambda self: cli_main.argparse.Namespace(command="validate-config"),
    )

    exit_code = cli_main.main()
    output = capsys.readouterr().out

    assert exit_code == 0
    assert "Config valid" in output


def test_run_dry_run_cli_smoke(tmp_path, monkeypatch, capsys) -> None:
    root = make_temp_repo(tmp_path)
    monkeypatch.setattr(cli_main, "ROOT", root)
    install_fake_sources(monkeypatch)
    monkeypatch.setattr(
        cli_main.argparse.ArgumentParser,
        "parse_args",
        lambda self: cli_main.argparse.Namespace(command="run", dry_run=True),
    )

    exit_code = cli_main.main()
    output = capsys.readouterr().out
    payload = json.loads(output)

    assert exit_code == 0
    assert payload["dry_run"] is True
    assert payload["selected_count"] >= 1
    assert payload["new_scope_count"] >= 1


def test_build_site_cli_smoke(tmp_path, monkeypatch, capsys) -> None:
    root = make_temp_repo(tmp_path)
    monkeypatch.setattr(cli_main, "ROOT", root)
    monkeypatch.setattr(
        cli_main.argparse.ArgumentParser,
        "parse_args",
        lambda self: cli_main.argparse.Namespace(command="build-site"),
    )

    exit_code = cli_main.main()
    output = capsys.readouterr().out

    assert exit_code == 0
    assert "Static site rebuilt" in output
    assert (root / "docs" / "index.html").exists()
    assert (root / "docs" / "topics.html").exists()
    assert (root / "docs" / "data" / "index.json").exists()


def test_run_cli_writes_state_reports_and_site(tmp_path, monkeypatch, capsys) -> None:
    root = make_temp_repo(tmp_path)
    monkeypatch.setattr(cli_main, "ROOT", root)
    install_fake_sources(monkeypatch)
    monkeypatch.setattr(
        cli_main.argparse.ArgumentParser,
        "parse_args",
        lambda self: cli_main.argparse.Namespace(command="run", dry_run=False),
    )

    exit_code = cli_main.main()
    output = capsys.readouterr().out
    payload = json.loads(output)

    assert exit_code == 0
    assert payload["dry_run"] is False
    assert payload["selected_count"] >= 2
    assert payload["new_scope_count"] >= 2

    seen_payload = json.loads((root / "data" / "state" / "seen.json").read_text(encoding="utf-8"))
    papers_payload = json.loads((root / "data" / "state" / "papers.json").read_text(encoding="utf-8"))
    report_path = root / "reports" / "daily" / "2026-04-07.md"

    assert seen_payload
    assert papers_payload
    assert report_path.exists()
    assert "Vision Language Navigation in Dynamic Environments" in report_path.read_text(encoding="utf-8")
    assert (root / "data" / "site_data" / "latest_run.json").exists()
    assert (root / "docs" / "index.html").exists()
    assert (root / "docs" / "reports" / "daily" / "2026-04-07.md").exists()


def test_build_report_cli_smoke(tmp_path, monkeypatch, capsys) -> None:
    root = make_temp_repo(tmp_path)
    monkeypatch.setattr(cli_main, "ROOT", root)
    install_fake_sources(monkeypatch)

    cli_main.run_update(root, dry_run=False)
    report_path = root / "reports" / "daily" / "2026-04-07.md"
    report_path.unlink()

    monkeypatch.setattr(
        cli_main.argparse.ArgumentParser,
        "parse_args",
        lambda self: cli_main.argparse.Namespace(command="build-report", date="2026-04-07"),
    )

    exit_code = cli_main.main()
    output = capsys.readouterr().out

    assert exit_code == 0
    assert "Report rebuilt" in output
    assert report_path.exists()
    report_text = report_path.read_text(encoding="utf-8")
    assert "Research Radar Daily Report - 2026-04-07" in report_text
    assert "Follow-up Advances for Vision-and-Language Navigation" in report_text
