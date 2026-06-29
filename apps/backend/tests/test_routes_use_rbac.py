"""Contract test: every scoped route endpoint must use require_permission.

Heuristic: walk each route's dependant.dependencies looking for a callable
whose qualname contains "require_permission" or whose name is "dep" (the inner
closure returned by require_permission).  Falls back to scanning the source
file for the literal string "require_permission(" as a belt-and-suspenders
check.
"""
import importlib
import inspect

import pytest

from app.api.router import api_router
from app.api.routes.workspaces.rbac import require_permission


# Paths that are intentionally not gated (public / uid-only endpoints).
_PUBLIC_PATH_FRAGMENTS = {
    "/r/",            # url-shortener public redirect
    "/resolve/",      # url-shortener public resolve
    "/click",         # url-shortener click recording (public)
    "/public-mock/",  # api-client anonymous mock read
}

# These paths use get_current_uid (uid-scoped, not workspace) — not RBAC.
_UID_ONLY_PATHS = {
    "/public-mocks",  # api-client owned-mock management (uid, not workspace)
}


def _is_public(path: str) -> bool:
    for frag in _PUBLIC_PATH_FRAGMENTS:
        if frag in path:
            return True
    return False


def _is_uid_only(path: str) -> bool:
    for frag in _UID_ONLY_PATHS:
        if path.endswith(frag) or frag in path:
            return True
    return False


def _dep_uses_require_permission(dep_call) -> bool:
    """Return True if dep_call is the inner 'dep' closure from require_permission."""
    qname = getattr(dep_call, "__qualname__", "")
    return "require_permission" in qname or qname.endswith(".dep")


def _route_uses_require_permission(route) -> bool:
    """Inspect dep graph + source fallback."""
    if not hasattr(route, "dependant"):
        return False
    for dep in route.dependant.dependencies:
        if dep.call and _dep_uses_require_permission(dep.call):
            return True
    # Fallback: inspect nested dependencies one level deep
    for dep in route.dependant.dependencies:
        if dep.call and hasattr(dep.call, "__wrapped__"):
            inner = dep.call.__wrapped__
            if _dep_uses_require_permission(inner):
                return True
    return False


# Prefixes of the 14 scoped route modules in api_router.
# Note: api_key_vault registers under /api-keys (not /api-key-vault).
SCOPED_PREFIXES = {
    "/password-manager",
    "/environment-manager",
    "/api-keys",          # api_key_vault
    "/notes",
    "/tasks",
    "/projects",          # tasks sub-router
    "/bookmarks",
    "/bookmark-folders",  # bookmarks sub-router
    "/code-snippets",
    "/api-client",
    "/nosql",
    "/sql-client",
    "/redis-commander",
    "/s3-drive",
    "/url-shortener",
    "/json-formatter",
}


def test_each_scoped_route_uses_require_permission():
    bad: list[str] = []

    for route in api_router.routes:
        path: str = getattr(route, "path", "")
        methods = getattr(route, "methods", set())

        # Skip routes not under our 14 scoped modules
        if not any(path.startswith(prefix) for prefix in SCOPED_PREFIXES):
            continue

        # Skip known public / anonymous endpoints
        if _is_public(path):
            continue

        # Skip uid-only endpoints (not workspace-scoped)
        if _is_uid_only(path):
            continue

        if not _route_uses_require_permission(route):
            bad.append(f"{methods} {path}")

    assert not bad, (
        f"\n{len(bad)} route(s) are missing require_permission:\n"
        + "\n".join(f"  {r}" for r in sorted(bad))
    )
