"""Date helpers used by reporting and collection windows."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo


def today_in_timezone(timezone: str) -> date:
    """Return today's date in the configured timezone."""
    return datetime.now(ZoneInfo(timezone)).date()


def iso_date(value: date | datetime | str) -> str:
    """Normalize supported values into an ISO date string."""
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return value


def lookback_window(reference_date: date, lookback_days: int) -> tuple[date, date]:
    """Return the inclusive lookback date window for collection."""
    start = reference_date - timedelta(days=max(lookback_days - 1, 0))
    return start, reference_date


def parse_date(value: str | None) -> date | None:
    """Parse a YYYY-MM-DD string, returning None for empty values."""
    if not value:
        return None
    return date.fromisoformat(value)
