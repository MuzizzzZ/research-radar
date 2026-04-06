"""Application settings models."""

from __future__ import annotations

from pathlib import Path

from pydantic import BaseModel, ConfigDict


class Settings(BaseModel):
    """Runtime settings shared by local runs and GitHub Actions."""

    model_config = ConfigDict(extra="ignore")

    lookback_days: int = 7
    timezone: str = "UTC"
    output_dir: str = "data"
    site_dir: str = "docs"
    reports_dir: str = "reports"
    log_level: str = "INFO"
    openalex_email: str | None = None
    semanticscholar_api_key_env: str = "SEMANTIC_SCHOLAR_API_KEY"
    max_results_per_topic: int = 50
    request_timeout_seconds: int = 30
    user_agent: str = "research-radar/0.1"

    def output_path(self, root: Path) -> Path:
        """Return the resolved output directory."""
        return root / self.output_dir

    def site_path(self, root: Path) -> Path:
        """Return the resolved static site directory."""
        return root / self.site_dir

    def reports_path(self, root: Path) -> Path:
        """Return the resolved reports directory."""
        return root / self.reports_dir
