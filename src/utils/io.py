"""Filesystem and serialization helpers."""

from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

import yaml


def ensure_parent(path: Path) -> None:
    """Create the parent directory for a file path."""
    path.parent.mkdir(parents=True, exist_ok=True)


def load_json(path: Path, default: Any) -> Any:
    """Load JSON if it exists, otherwise return a deep copy of the default."""
    if not path.exists():
        return copy.deepcopy(default)
    return json.loads(path.read_text(encoding="utf-8"))


def dump_json(path: Path, data: Any) -> None:
    """Write JSON with stable formatting."""
    ensure_parent(path)
    path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def load_yaml(path: Path) -> Any:
    """Load YAML data from disk."""
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def dump_text(path: Path, content: str) -> None:
    """Write UTF-8 text to disk."""
    ensure_parent(path)
    path.write_text(content, encoding="utf-8")
