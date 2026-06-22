"""Probabilistic early-expiration (XFetch).

Reference: "Optimal Probabilistic Cache Stampede Prevention" (Vattani et al., 2015).
"""
from __future__ import annotations

import math
from typing import Any


def should_refresh(
    *,
    computed_at: float,
    ttl: float,
    delta: float,
    beta: float,
    now: float,
    rand: float,
) -> bool:
    """Return True if the caller should refresh the cached value now."""
    if rand <= 0.0:
        rand = 1e-12
    if rand > 1.0:
        rand = 1.0
    threshold = computed_at + ttl + beta * delta * math.log(rand)
    return now >= threshold


def wrap_payload(value: Any, *, computed_at: float, delta: float) -> dict:
    return {"v": value, "ca": computed_at, "dt": delta}


def unwrap_payload(payload: dict) -> tuple[Any, float, float]:
    return payload["v"], float(payload["ca"]), float(payload["dt"])
