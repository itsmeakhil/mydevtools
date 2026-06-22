"""Cache serializer — orjson with Pydantic + datetime + bytes support."""
from __future__ import annotations

import base64
from typing import Any

import orjson
from pydantic import BaseModel


def _default(obj: Any) -> Any:
    if isinstance(obj, BaseModel):
        return obj.model_dump(mode="json")
    if isinstance(obj, bytes):
        return base64.b64encode(obj).decode("ascii")
    raise TypeError(f"Type {type(obj).__name__} not serializable")


def dumps(value: Any) -> bytes:
    return orjson.dumps(
        value,
        default=_default,
        option=orjson.OPT_NON_STR_KEYS | orjson.OPT_SERIALIZE_NUMPY,
    )


def loads(payload: bytes) -> Any:
    return orjson.loads(payload)
