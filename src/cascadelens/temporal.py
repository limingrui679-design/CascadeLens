"""Bitemporal parsing and visibility helpers."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any


def parse_datetime(value: str) -> datetime:
    if not isinstance(value, str) or not value:
        raise ValueError("Expected an ISO-8601 date-time with timezone")
    normalized = value[:-1] + "+00:00" if value.endswith("Z") else value
    parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("Expected an ISO-8601 date-time with timezone")
    return parsed.astimezone(UTC)


def is_datetime(value: Any) -> bool:
    try:
        parse_datetime(value)
    except (TypeError, ValueError):
        return False
    return True


def isoformat(value: datetime) -> str:
    return value.astimezone(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


def is_known_at(record: dict[str, Any], known_at: str) -> bool:
    point = parse_datetime(known_at)
    observed = parse_datetime(record["observedAt"])
    superseded = record.get("supersededAt")
    return observed <= point and (superseded is None or point < parse_datetime(superseded))


def is_valid_at(record: dict[str, Any], valid_at: str) -> bool:
    point = parse_datetime(valid_at)
    start = parse_datetime(record["validFrom"])
    end = record.get("validTo")
    return start <= point and (end is None or point < parse_datetime(end))


def is_visible_at(record: dict[str, Any], valid_at: str, known_at: str) -> bool:
    return is_known_at(record, known_at) and is_valid_at(record, valid_at)
