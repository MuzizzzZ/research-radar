"""Lightweight file-backed caches for incremental runs."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from src.utils.io import dump_json, load_json


class JsonCache:
    """A tiny JSON-backed cache wrapper."""

    def __init__(self, path: Path) -> None:
        self.path = path

    def load(self) -> dict[str, Any]:
        """Load the cache payload."""
        payload = load_json(self.path, {})
        return payload if isinstance(payload, dict) else {}

    def save(self, payload: dict[str, Any]) -> None:
        """Persist the cache payload."""
        dump_json(self.path, payload)
