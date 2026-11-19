from datetime import datetime, timezone


def utc_now() -> datetime:
    """Return the current datetime in UTC (timezone-aware)."""
    return datetime.now(timezone.utc)
