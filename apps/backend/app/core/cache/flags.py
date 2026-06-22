"""Per-namespace cache enable flags."""
from __future__ import annotations

from functools import lru_cache

from app.core import config


@lru_cache(maxsize=1)
def _parsed_namespaces() -> frozenset[str]:
    raw = config.get_settings().CACHE_NAMESPACES or ""
    return frozenset(p.strip() for p in raw.split(",") if p.strip())


def is_namespace_enabled(ns: str) -> bool:
    s = config.get_settings()
    if not s.CACHE_ENABLED:
        return False
    return ns in _parsed_namespaces()
