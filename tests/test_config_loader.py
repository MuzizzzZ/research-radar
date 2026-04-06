from __future__ import annotations

from pathlib import Path

from src.core.config_loader import load_app_config


def test_load_app_config_from_repo() -> None:
    root = Path(__file__).resolve().parents[1]
    config = load_app_config(root)

    assert config.settings.timezone == "Asia/Shanghai"
    assert len(config.topics) >= 2
    assert any(topic.id == "uav-ris" for topic in config.topics)
    assert any(baseline.id == "room-to-room" for baseline in config.baselines)
