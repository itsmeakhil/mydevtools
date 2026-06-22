import pytest

from app.core.cache.keys import (
    NAMESPACES,
    args_hash,
    build_key,
    register_namespace,
    version_key,
)


def test_register_and_lookup():
    register_namespace("bookmarks_test", scope="user", default_ttl=120, default_strategy="simple")
    assert NAMESPACES["bookmarks_test"]["scope"] == "user"


def test_build_user_key():
    key = build_key(ns="bookmarks", scope="user", uid="u1", ver=7, op="list", args_hash="abcd1234")
    assert key == "cache:bookmarks:u:u1:v7:list:abcd1234"


def test_build_global_key_no_version():
    key = build_key(ns="urlshort", scope="global", uid=None, ver=None, op="resolve", args_hash="ff00ee11")
    assert key == "cache:urlshort:g:resolve:ff00ee11"


def test_version_key():
    assert version_key("bookmarks", "u1") == "cache:ver:bookmarks:u:u1"


def test_args_hash_deterministic():
    h1 = args_hash({"a": 1, "b": 2}, secret=b"k")
    h2 = args_hash({"b": 2, "a": 1}, secret=b"k")
    assert h1 == h2
    assert len(h1) == 16


def test_args_hash_changes_with_input():
    h1 = args_hash({"a": 1}, secret=b"k")
    h2 = args_hash({"a": 2}, secret=b"k")
    assert h1 != h2


def test_args_hash_changes_with_secret():
    h1 = args_hash({"a": 1}, secret=b"k1")
    h2 = args_hash({"a": 1}, secret=b"k2")
    assert h1 != h2
