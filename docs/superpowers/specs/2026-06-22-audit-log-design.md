# Audit Log — Design

**Date:** 2026-06-22
**Status:** Design (approved in brainstorming)
**Scope:** Full vertical — backend capture pipeline, query API, and a user-facing
"Activity log" page. Record every state-changing action a user performs with what changed,
when, and from which device.

## Problem

The app has ~22 backend modules (bookmarks, tasks, notes, passwords, environment manager,
api client, code snippets, sql/nosql/redis/s3 connections, url shortener, game scores,
feedback, user preferences, auth, etc.), all doing user-scoped CRUD via FastAPI services on
MongoDB. There is **no audit trail**. A user cannot see what they changed, when, or from
which device; there is no security/forensic record of writes or auth events.

## Goals

- Capture every state-changing action (writes + auth events) across the whole app.
- For each event record: actor, action, target entity, **what changed** (before/after),
  when, outcome, and **device** (IP + browser/OS).
- Surface it to the user as an "Activity log" page they can browse and filter.
- Never leak secrets/PII into the log.
- Never let audit capture slow down or break a real request.

## Non-Goals

- No logging of plain reads (GET). Most reads are noise; revisit later if needed.
- No geo-IP lookup this pass (IP + parsed User-Agent only).
- No admin/cross-user audit console — log is per-user, scoped to the actor.
- No external SIEM/export integration this pass.

## Decisions (from brainstorming)

| Question | Decision |
|----------|----------|
| Event scope | Writes (POST/PUT/PATCH/DELETE) + auth events. Skip GET. |
| Capture mechanism | Hybrid: HTTP middleware auto-envelope + service-level helper for entity/diff |
| Device info | Raw IP + parsed User-Agent (browser, OS, device type). No extra deps — small regex helper. |
| Secret handling | Field-name **allowlist**; everything else redacted (field noted as changed, value `[redacted]`). |
| Retention | 90-day Mongo TTL index. |
| UI scope | Full vertical — backend + query API + user-facing Activity log page. |

## Architecture

### 1. Data model

New collection constant `AUDIT_LOG = "audit_log"` in
[collection_name.py](../../../apps/backend/app/utils/collection_name.py).

Event document shape:

```
{
  _id: str,                       # new_id()
  uid: str | None,                # actor; null if auth failed / unauthenticated write attempt
  action: str,                    # dotted verb, e.g. "bookmark.create", "auth.login"
  module: str,                    # "bookmarks" (inferred from path; helper may override)
  entity_type: str | None,        # "bookmark"
  entity_id: str | None,          # affected document id, when known
  method: str,                    # "POST" | "PATCH" | "PUT" | "DELETE"
  path: str,                      # "/api/v1/bookmarks/{id}" (raw request path)
  status: int,                    # HTTP status code
  outcome: "success" | "failure", # derived from status (<400 = success)
  changes: [{ field, before, after }] | null,  # allowlisted fields only; sensitive => "[redacted]"
  summary: str | null,            # human-readable, e.g. "Created bookmark 'GitHub'"
  ip: str | null,                 # client IP
  ua_raw: str | null,             # raw User-Agent header
  device: { browser, os, device_type } | null,  # parsed from ua_raw
  latency_ms: int,                # request duration
  ts: int,                        # epoch ms (create_timestamp())
  expireAt: datetime              # BSON Date = now + 90d; TTL field
}
```

`ts` (epoch ms) mirrors the `createdAt` convention used elsewhere for ordering/display.
`expireAt` is a real BSON Date because Mongo TTL requires a Date field; it is the only
datetime in the doc.

Indexes (added to [indexes.py](../../../apps/backend/app/core/indexes.py)):

- `AUDIT_LOG` `[("uid", 1), ("ts", -1)]` — default per-user listing.
- `AUDIT_LOG` `[("uid", 1), ("module", 1), ("ts", -1)]` — module filter.
- `AUDIT_LOG` TTL index on `expireAt` (`expireAfterSeconds=0`).

`db_manager.create_index` currently takes `unique`/`sparse` flags only. Add an
`expire_after_seconds` passthrough (or a dedicated `create_ttl_index` helper) so the TTL
index can be declared without breaking existing callers.

### 2. Capture pipeline — `app/core/audit.py`

A per-request `contextvars.ContextVar[AuditContext]` carries detail set by services back up
to the middleware that writes the event.

```python
@dataclass
class AuditContext:
    action: str | None = None
    entity_type: str | None = None
    entity_id: str | None = None
    module: str | None = None
    changes: list[dict] | None = None
    summary: str | None = None
```

Helper API services call (all no-ops if no active context — safe to call anywhere):

- `audit.set_entity(entity_type, entity_id)`
- `audit.set_action(action)`
- `audit.set_summary(text)`
- `audit.set_changes(changes)` / `audit.add_change(field, before, after)`
- `audit.diff(before: dict, after: dict, allow_fields) -> list[dict]` — compares two docs,
  emits a `changes` list. Fields **not** in the global safe allowlist are still reported as
  changed but their `before`/`after` values become the literal `"[redacted]"`.

**Redaction (allowlist):** a module-level `SAFE_FIELDS` set of non-sensitive field names
(e.g. `title, name, tags, folderId, parentId, status, statusOrder, color, icon, description,
url, isExpanded, projectId, createdAt, updatedAt`). Any field outside the set is redacted.
Default-deny: a new field is redacted until explicitly added to the allowlist. Sensitive
keys (`password, secret, encryptedData, iv, connectionString, value, token`, etc.) are never
in the allowlist by construction.

**UA parsing:** small internal regex helper `parse_user_agent(ua: str) -> dict` returning
`{browser, os, device_type}`. No third-party dependency. Falls back to `{browser:"Unknown",
os:"Unknown", device_type:"desktop"}` on unparseable input.

### 3. `AuditMiddleware`

Registered in [main.py](../../../apps/backend/app/main.py) (after CORS, around the request).

Flow per request:

1. **Skip** non-auditable: method in `{GET, HEAD, OPTIONS}`, or path not under `/api/v1`, or
   health endpoints. Return early (no overhead).
2. Initialize a fresh `AuditContext` and set it on the ContextVar.
3. Resolve `uid`: reuse the token-extraction logic from `get_current_uid`
   (Authorization bearer / `mdt_at` cookie) + `decode_access_token`. Wrapped in try/except —
   on failure `uid = None` (the request itself will 401, but we still record the attempt).
   This is independent of route dependencies, so coverage does not depend on each route.
4. `response = await call_next(request)`; measure `latency_ms`; read `status`.
5. Capture `ip` (client host, honoring `X-Forwarded-For` first hop if present) and `ua_raw`;
   `device = parse_user_agent(ua_raw)`.
6. Read the ContextVar back — services may have set entity/changes/summary/action. If
   `action`/`module` weren't set, infer `module` from the first path segment after `/api/v1`
   and synthesize a generic `action` like `"bookmarks.update"` from module + method.
7. Build the event doc and **fire-and-forget** write it via `asyncio.create_task`, wrapped in
   try/except that logs and swallows any error.

**Safety invariant:** the entire audit path (uid decode, context read, write) is wrapped so
that no audit failure can alter or delay the user's response. The write is scheduled as a
background task; an exception in it is logged, never raised.

### 4. Auth events + module coverage

- **Auth events** are not entity CRUD, so [auth/services.py](../../../apps/backend/app/api/routes/auth/services.py)
  (and the auth API handlers) call the helper explicitly:
  `audit.set_action("auth.login" | "auth.logout" | "auth.token_refresh" | "auth.register" |
  "auth.password_change" | "auth.account_disable")` with a summary. The middleware still
  supplies device/ip/outcome/latency.
- **Failed writes** (4xx/5xx) are logged with `outcome:"failure"`; `uid` is null when the
  request was unauthenticated. Useful security signal (e.g. repeated 401 writes).
- **Diff enrichment priority** — services get the auto-envelope for free; entity+diff is added
  first to the high-value modules:
  - bookmarks, bookmark-folders, tasks, projects, notes, code snippets (full safe diffs)
  - passwords, environment manager (entity + action only; values redacted)
  - sql/nosql/redis/s3 connections (entity + action; connection strings redacted)
  - remaining modules rely on the auto-envelope until enriched later.

### 5. Query API — `app/api/routes/audit_log/`

`GET /audit-log` (router wired in [router.py](../../../apps/backend/app/api/router.py)),
`Depends(get_current_uid)`, scoped to the actor's `uid`.

Query params:

- `skip` (≥0), `limit` (1–100, default 50)
- `module`, `action`, `outcome` (optional exact filters)
- `from`, `to` (epoch ms range on `ts`)
- `search` (substring match on `summary`)

Response: `{ items: AuditEventOut[], total, skip, limit }`. `AuditEventOut` mirrors the
document minus internal fields (`expireAt`). Sorted `ts` desc.

### 6. Web UI — Activity log page

- New page under the dashboard (e.g. `apps/web/src/app/dashboard` activity section or a
  dedicated route), fetching through the existing `/api/backend/[...path]` proxy.
- Enterprise-flat style matching the current dashboard (solid surfaces, theme tokens,
  `prefers-reduced-motion`, accessible).
- Layout: a filter bar (module, action, outcome, date range, search) above a timeline list.
- Each row: action badge · `summary` · device ("Chrome on macOS") · relative time. Expandable
  to reveal the field-level `changes` diff (before → after, redacted values shown as
  `[redacted]`).
- i18n labels for all static text, consistent with existing analytics i18n work.
- Empty/loading/error states consistent with existing dashboard panels.

## Component boundaries

| Unit | Does | Depends on |
|------|------|-----------|
| `audit.py` (helper) | Per-request context, diff + redaction, UA parse | contextvars, stdlib |
| `AuditMiddleware` | Build + fire-and-forget write the event envelope | audit helper, db_manager, auth token decode |
| `audit_log` route | Paginated, filtered per-user query API | db_manager, get_current_uid |
| Activity log page | Render filterable timeline + diffs | backend proxy, audit API |
| Service `audit.*` calls | Attach entity/diff/summary where valuable | audit helper |

## Error handling

- Audit write runs as a background task; failure is logged and swallowed.
- uid decode failure → `uid=null`, request proceeds normally.
- Unparseable UA → fallback device object.
- The query API treats malformed filters as 422 (FastAPI validation), never 500.

## Testing

- **Unit:** `audit.diff` allowlist redaction (safe field passes through, sensitive field →
  `[redacted]`, new/unknown field → redacted); `parse_user_agent` for common UAs + fallback;
  contextvar set/merge round-trip.
- **Integration:** a create request produces exactly one audit doc with correct
  action/module/entity/device/outcome and redacted sensitive fields; a failed write records
  `outcome:"failure"`; a GET produces **no** doc; auth login/logout emit records.
- **Safety:** simulate a write failure in the audit task and assert the user response is
  unaffected.
- **Manual:** Activity log page at 375 / 768 / 1024 / 1440 px, light + dark; verify diffs
  expand and secrets show as `[redacted]`.

## Risks

- **Middleware uid decode duplicates auth logic** — mitigated by reusing the existing
  extraction + `decode_access_token`; factor the token-extraction into a shared helper so it
  is not copy-pasted.
- **Write volume / storage** — bounded by 90d TTL; indexes keep queries cheap.
- **Background-task writes under high concurrency** — acceptable; ties into the existing
  backend-scale plan. If `create_task` proves too lossy under load, swap to a bounded queue
  later (out of scope now).
- **Allowlist drift** — default-deny means the failure mode is over-redaction (safe), not
  leakage.
