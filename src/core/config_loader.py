"""Configuration loading and validation."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from src.models.baseline import BaselineConfig
from src.models.settings import Settings
from src.models.topic import TopicConfig
from src.utils.io import load_yaml


@dataclass(slots=True)
class AppConfig:
    """Loaded application configuration."""

    root: Path
    config_dir: Path
    settings: Settings
    topics: list[TopicConfig]
    baselines: list[BaselineConfig]


def resolve_config_path(config_dir: Path, filename: str) -> Path:
    """Prefer real config files and fall back to committed examples."""
    path = config_dir / filename
    if path.exists():
        return path
    example_path = config_dir / filename.replace(".yaml", ".example.yaml")
    if example_path.exists():
        return example_path
    raise FileNotFoundError(f"Missing config file: {filename}")


def load_topics(path: Path) -> list[TopicConfig]:
    """Load topic configs from YAML."""
    payload = load_yaml(path)
    raw_topics = payload.get("topics", payload)
    return [TopicConfig.model_validate(item) for item in raw_topics]


def load_baselines(path: Path) -> list[BaselineConfig]:
    """Load baseline configs from YAML."""
    payload = load_yaml(path)
    raw_baselines = payload.get("baselines", payload)
    return [BaselineConfig.model_validate(item) for item in raw_baselines]


def load_settings(path: Path) -> Settings:
    """Load global settings from YAML."""
    payload = load_yaml(path)
    settings_payload = payload.get("settings", payload)
    return Settings.model_validate(settings_payload)


def load_app_config(root: Path) -> AppConfig:
    """Load the full application config bundle."""
    config_dir = root / "config"
    settings = load_settings(resolve_config_path(config_dir, "settings.yaml"))
    topics = load_topics(resolve_config_path(config_dir, "topics.yaml"))
    baselines = load_baselines(resolve_config_path(config_dir, "baselines.yaml"))
    validate_config(settings, topics, baselines)
    return AppConfig(root=root, config_dir=config_dir, settings=settings, topics=topics, baselines=baselines)


def validate_config(
    settings: Settings,
    topics: list[TopicConfig],
    baselines: list[BaselineConfig],
) -> None:
    """Raise ValueError if required config invariants are broken."""
    del settings  # kept for future invariant checks and clearer call sites.
    topic_ids = {topic.id for topic in topics}
    if len(topic_ids) != len(topics):
        raise ValueError("Topic ids must be unique.")
    baseline_ids = {baseline.id for baseline in baselines}
    if len(baseline_ids) != len(baselines):
        raise ValueError("Baseline ids must be unique.")
    for topic in topics:
        if not topic.queries:
            raise ValueError(f"Topic {topic.id} must define at least one query.")
    for baseline in baselines:
        if baseline.topic_id not in topic_ids:
            raise ValueError(f"Baseline {baseline.id} references unknown topic_id {baseline.topic_id}.")
