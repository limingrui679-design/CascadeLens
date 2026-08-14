"""Locale-independent JSON canonicalization and digests."""

from __future__ import annotations

import hashlib
import json
import math
from collections.abc import Mapping, Sequence
from typing import Any


def _sort_key(value: str) -> bytes:
    return value.encode("utf-8")


def canonicalize(value: Any, path: str = "$") -> Any:
    """Return a JSON-safe value with deterministic key order.

    Unsupported Python objects and non-finite numbers fail rather than being
    silently stringified. Negative zero is normalized to positive zero to
    match the browser implementation.
    """

    if value is None or isinstance(value, (str, bool, int)):
        return value
    if isinstance(value, float):
        if not math.isfinite(value):
            raise TypeError(f"Non-finite number at {path}")
        return 0 if value == 0 else value
    if isinstance(value, Mapping):
        output: dict[str, Any] = {}
        for key in sorted(value, key=lambda item: _sort_key(str(item))):
            if not isinstance(key, str):
                raise TypeError(f"Non-string object key at {path}: {key!r}")
            output[key] = canonicalize(value[key], f"{path}.{key}")
        return output
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        return [canonicalize(item, f"{path}[{index}]") for index, item in enumerate(value)]
    raise TypeError(f"Unsupported canonical value at {path}: {type(value).__name__}")


def stable_dumps(value: Any, *, indent: int | None = None) -> str:
    """Serialize canonical JSON without locale or platform dependence."""

    normalized = canonicalize(value)
    if indent is None:
        return json.dumps(
            normalized,
            ensure_ascii=False,
            allow_nan=False,
            separators=(",", ":"),
        )
    return json.dumps(
        normalized,
        ensure_ascii=False,
        allow_nan=False,
        indent=indent,
        separators=(",", ": "),
    )


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def digest_canonical(value: Any) -> str:
    return sha256_text(stable_dumps(value))
