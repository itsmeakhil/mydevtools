import math

import pytest

from app.core.cache.xfetch import should_refresh, unwrap_payload, wrap_payload


def test_beta_zero_never_refreshes_early():
    # beta=0 reduces to: now > computed_at + ttl  → only after TTL
    assert should_refresh(computed_at=0, ttl=100, delta=5, beta=0, now=50, rand=0.001) is False
    assert should_refresh(computed_at=0, ttl=100, delta=5, beta=0, now=101, rand=0.5) is True


def test_high_beta_refreshes_earlier():
    # With rand → 0, ln(rand) → -inf, refresh fires very early when beta > 0
    fires_at_t50 = should_refresh(computed_at=0, ttl=100, delta=5, beta=10, now=50, rand=1e-9)
    assert fires_at_t50 is True


def test_rand_near_one_no_early_refresh():
    # rand close to 1 → ln(rand) close to 0 → only past TTL
    assert should_refresh(computed_at=0, ttl=100, delta=5, beta=1, now=80, rand=0.999) is False


def test_wrap_unwrap_round_trip():
    p = wrap_payload({"x": 1}, computed_at=12345.0, delta=2.5)
    val, ca, dt = unwrap_payload(p)
    assert val == {"x": 1}
    assert ca == 12345.0
    assert dt == 2.5
