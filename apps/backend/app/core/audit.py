from __future__ import annotations

import re
from contextvars import ContextVar
from dataclasses import dataclass

# Field names whose values are safe to record verbatim in the audit diff.
# Anything NOT in this set is recorded as "[redacted]" (default-deny).
SAFE_FIELDS: set[str] = {
    "title", "name", "tags", "folderId", "parentId", "status", "statusOrder",
    "color", "icon", "description", "url", "isExpanded", "projectId",
    "priority", "dueDate", "completed", "language", "createdAt", "updatedAt",
}

REDACTED = "[redacted]"


@dataclass
class AuditContext:
    action: str | None = None
    module: str | None = None
    entity_type: str | None = None
    entity_id: str | None = None
    changes: list[dict] | None = None
    summary: str | None = None


_audit_ctx: ContextVar[AuditContext | None] = ContextVar("audit_ctx", default=None)


def current_context() -> AuditContext | None:
    return _audit_ctx.get()


def set_action(action: str) -> None:
    ctx = _audit_ctx.get()
    if ctx is not None:
        ctx.action = action


def set_entity(entity_type: str, entity_id: str | None) -> None:
    ctx = _audit_ctx.get()
    if ctx is not None:
        ctx.entity_type = entity_type
        ctx.entity_id = entity_id


def set_summary(text: str) -> None:
    ctx = _audit_ctx.get()
    if ctx is not None:
        ctx.summary = text


def set_changes(changes: list[dict]) -> None:
    ctx = _audit_ctx.get()
    if ctx is not None:
        ctx.changes = changes


def add_change(field_name: str, before, after) -> None:
    ctx = _audit_ctx.get()
    if ctx is None:
        return
    if ctx.changes is None:
        ctx.changes = []
    ctx.changes.append({"field": field_name, "before": before, "after": after})


def _redact(field_name: str, value, allow_fields: set[str]):
    return value if field_name in allow_fields else REDACTED


def diff(before: dict | None, after: dict | None, allow_fields: set[str] | None = None) -> list[dict]:
    allow = SAFE_FIELDS if allow_fields is None else allow_fields
    before = before or {}
    after = after or {}
    changes: list[dict] = []
    for key in sorted(set(before) | set(after)):
        if key in ("_id", "created_by"):
            continue
        b = before.get(key)
        a = after.get(key)
        if b == a:
            continue
        changes.append({
            "field": key,
            "before": _redact(key, b, allow),
            "after": _redact(key, a, allow),
        })
    return changes


_BROWSERS = [
    ("Edg", "Edge"), ("OPR", "Opera"), ("Chrome", "Chrome"),
    ("Firefox", "Firefox"), ("Safari", "Safari"),
]


def parse_user_agent(ua: str | None) -> dict:
    fallback = {"browser": "Unknown", "os": "Unknown", "device_type": "desktop"}
    if not ua:
        return fallback
    browser = "Unknown"
    for token, name in _BROWSERS:
        if token in ua:
            browser = name
            break
    if "Windows" in ua:
        os_name = "Windows"
    elif "Mac OS X" in ua or "Macintosh" in ua:
        os_name = "macOS"
    elif "Android" in ua:
        os_name = "Android"
    elif "iPhone" in ua or "iPad" in ua or "iOS" in ua:
        os_name = "iOS"
    elif "Linux" in ua:
        os_name = "Linux"
    else:
        os_name = "Unknown"
    if re.search(r"Mobi|iPhone|Android.*Mobile", ua):
        device_type = "mobile"
    elif "iPad" in ua or ("Android" in ua and "Mobile" not in ua):
        device_type = "tablet"
    else:
        device_type = "desktop"
    return {"browser": browser, "os": os_name, "device_type": device_type}
