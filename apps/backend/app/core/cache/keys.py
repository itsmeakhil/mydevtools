"""Cache key builders + namespace registry."""
from __future__ import annotations

import hashlib
from typing import Literal, TypedDict

import orjson


class NamespaceSpec(TypedDict):
    scope: Literal["user", "global"]
    default_ttl: int
    default_strategy: Literal["simple", "xfetch"]


NAMESPACES: dict[str, NamespaceSpec] = {}


def register_namespace(
    name: str,
    *,
    scope: Literal["user", "global"],
    default_ttl: int,
    default_strategy: Literal["simple", "xfetch"] = "simple",
) -> None:
    if scope == "user" and default_strategy == "xfetch":
        raise ValueError("xfetch requires scope='global'")
    NAMESPACES[name] = {"scope": scope, "default_ttl": default_ttl, "default_strategy": default_strategy}


def build_key(
    *,
    ns: str,
    scope: str,
    uid: str | None,
    ver: int | None,
    op: str,
    args_hash: str,
) -> str:
    if scope == "user":
        if uid is None or ver is None:
            raise ValueError("user-scoped key requires uid and ver")
        return f"cache:{ns}:u:{uid}:v{ver}:{op}:{args_hash}"
    return f"cache:{ns}:g:{op}:{args_hash}"


def version_key(ns: str, uid: str) -> str:
    return f"cache:ver:{ns}:u:{uid}"


def args_hash(kwargs: dict, *, secret: bytes) -> str:
    payload = orjson.dumps(kwargs, option=orjson.OPT_SORT_KEYS)
    return hashlib.blake2b(payload, digest_size=8, key=secret[:64]).hexdigest()


# --- spec-locked namespaces ---
register_namespace("auth_token", scope="global", default_ttl=300)
register_namespace("auth_user", scope="user", default_ttl=60)
register_namespace("bookmarks", scope="user", default_ttl=120)
register_namespace("notes", scope="user", default_ttl=120)
register_namespace("code_snippets", scope="user", default_ttl=120)
register_namespace("tasks", scope="user", default_ttl=60)
register_namespace("passwords", scope="user", default_ttl=60)
register_namespace("api_client", scope="user", default_ttl=300)
register_namespace("user_preferences", scope="user", default_ttl=600)
register_namespace("url_shortener_resolve", scope="global", default_ttl=600, default_strategy="xfetch")
register_namespace("url_shortener_owner", scope="user", default_ttl=120)
register_namespace("analytics_aggregate", scope="global", default_ttl=300, default_strategy="xfetch")
register_namespace("dns_lookup", scope="global", default_ttl=3600)
