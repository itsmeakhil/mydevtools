from datetime import datetime, timezone

import pytest
from pydantic import BaseModel

from app.core.cache.serializer import dumps, loads


class Sample(BaseModel):
    id: str
    when: datetime
    tags: list[str]


def test_round_trip_dict():
    payload = {"a": 1, "b": "two", "c": [1, 2, 3]}
    assert loads(dumps(payload)) == payload


def test_pydantic_round_trip():
    s = Sample(id="x", when=datetime(2026, 1, 1, tzinfo=timezone.utc), tags=["a", "b"])
    raw = dumps(s)
    parsed = loads(raw)
    assert parsed["id"] == "x"
    assert parsed["tags"] == ["a", "b"]
    assert parsed["when"].startswith("2026-01-01")


def test_list_of_pydantic():
    items = [Sample(id=str(i), when=datetime(2026, 1, 1, tzinfo=timezone.utc), tags=[]) for i in range(3)]
    parsed = loads(dumps(items))
    assert isinstance(parsed, list)
    assert parsed[0]["id"] == "0"


def test_none_round_trip():
    assert loads(dumps(None)) is None


def test_bytes_round_trip():
    raw = dumps({"k": b"\x00\xff"})
    # bytes auto-serialized as base64 string by orjson default
    parsed = loads(raw)
    assert "k" in parsed
