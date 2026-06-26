# Workspaces Foundation (Sub-project A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the Organization → Workspace hierarchy as plumbing only. Every authenticated request resolves an active workspace; every existing scoped tool's data gets stamped with `org_id` + `workspace_id`; every existing user is auto-joined to a system org "MyDevTools Cloud" and gets one Personal workspace. The visible UX delta is a single non-interactive "Personal" pill in the navbar.

**Architecture:** Backend FastAPI gains 4 new Mongo collections (`organizations`, `org_memberships`, `workspaces`, `workspace_memberships`), a `get_workspace_ctx` middleware dependency that resolves the active workspace from an HTTP-only cookie, a first-login hook that idempotently provisions each user's org membership + Personal workspace, and a per-user backfill background task that stamps `(org_id, workspace_id)` on every existing doc in the 14 workspace-scoped collections. Each existing scoped route gets its query filter widened to `(org_id, workspace_id, owner_uid filter when personal)`. The frontend adds a workspace Zustand store, a display-only switcher pill in the navbar, and re-keys the pinned-tools store by `workspace_id`.

**Tech Stack:** FastAPI, Pydantic v2, Motor (async Mongo via existing `db_manager`), Next.js 16 (App Router), React 19, Zustand (+ `persist` middleware), Jest (frontend tests), pytest (backend tests).

## Global Constraints

- Personal workspace name is the literal string `"Personal"`, locked. Never renameable, never deletable.
- System org name is the literal string `"MyDevTools Cloud"`, `slug="mydevtools-cloud"`, `kind="system"`, `owner_uid=None`.
- Personal-workspace invariant: every query against personal-workspace data MUST also filter `owner_uid == current_uid`. Enforced at the repo layer.
- No new dependencies (Python or JS). Use existing stdlib / already-installed packages only.
- No URL changes — implicit context via HTTP-only cookie `active_workspace`, `SameSite=Lax`, `Secure` in prod.
- Mark all transitional legacy-row-tolerance branches with a `# ponytail:` (Python) or `// ponytail:` (TS) comment that names the upgrade path.
- Field-name convention for the user-id stamp on existing scoped collections varies per route (`created_by`, `uid`, etc.) — keep the existing field, don't rename. The plan refers to it generically as "the user-id field" inside each task.
- The frontend hits `/api/backend/<route>`. The Next.js catch-all `app/api/backend/[...path]` proxies to FastAPI under `/api/v1/<route>`. New routes register under `/api/v1/workspaces` and `/api/v1/orgs`.
- TDD: every code task starts with a failing test, then the minimal implementation that makes it pass.
- One commit per task. Commit message follows existing convention: `<type>(<scope>): <short>` (e.g. `feat(workspaces): seed system org on startup`).
- `ponytail:` markers only in code, not commit messages or docs.

## File Structure

### Backend — new files

```
apps/backend/app/api/routes/workspaces/
    __init__.py
    api.py                    # 4 HTTP routes
    schema.py                 # Pydantic models
    services.py               # business logic (list-my-orgs, set-active, etc.)
    repo.py                   # Mongo accessors (find/insert/upsert)
    seed.py                   # ensure_system_org()
    middleware.py             # get_workspace_ctx + WorkspaceContext + helpers
    backfill.py               # per-user background backfill task
apps/backend/tests/
    test_workspaces_seed.py
    test_workspace_setup.py
    test_workspace_invariant.py
    test_workspace_ctx.py
    test_backfill.py
```

### Backend — modified

- `apps/backend/app/api/router.py` — include workspaces router
- `apps/backend/app/main.py` — call `ensure_system_org()` in `lifespan`
- `apps/backend/app/utils/collection_name.py` — add 4 new constants
- `apps/backend/app/core/indexes.py` — add indexes for the 4 new collections
- `apps/backend/app/api/routes/auth/users_repo.py` — extend user-doc fields (`workspace_setup_at`, `migrated_at`, `migration_status`, `migration_progress`)
- `apps/backend/app/api/routes/auth/api.py` — invoke first-login hook in `create_session`
- 14 scoped route modules — see Phase 4

### Frontend — new files

```
apps/web/src/store/workspace-store.ts
apps/web/src/store/__tests__/workspace-store.test.ts
apps/web/src/store/__tests__/pinned-tools-store.test.ts
apps/web/src/lib/workspace-api.ts
apps/web/src/lib/active-workspace.ts
apps/web/src/components/workspace-switcher.tsx
apps/web/src/components/migration-banner.tsx
apps/web/src/components/__tests__/workspace-switcher.test.tsx
```

### Frontend — modified

- `apps/web/src/store/pinned-tools-store.ts` — reshape to `pinnedByWorkspace`
- `apps/web/src/components/pinned-tools-preferences-sync.tsx` — keyed sync
- `apps/web/src/components/sidebar/app-sidebar.tsx` — per-workspace selector + clear workspace store on signout
- `apps/web/src/components/nav-bar.tsx` — mount switcher pill
- `apps/web/src/app/dashboard/dashboard-client-layout.tsx` — boot wiring (workspace store hydrate, migration banner)

---

## Phase 1 — Backend foundation (sequential)

### Task 1: Mongo schemas, repo, system-org seed, startup wiring

**Files:**
- Create: `apps/backend/app/api/routes/workspaces/__init__.py` (empty)
- Create: `apps/backend/app/api/routes/workspaces/schema.py`
- Create: `apps/backend/app/api/routes/workspaces/repo.py`
- Create: `apps/backend/app/api/routes/workspaces/seed.py`
- Modify: `apps/backend/app/utils/collection_name.py` (add 4 constants)
- Modify: `apps/backend/app/core/indexes.py` (add 4 index definitions)
- Modify: `apps/backend/app/main.py` (call `ensure_system_org()` inside `lifespan`)
- Test: `apps/backend/tests/test_workspaces_seed.py`

**Interfaces:**
- Consumes: existing `app.database.db_manager`, existing `app.utils.utils.create_timestamp`, existing `app.utils.utils.new_id`.
- Produces:
  - `SYSTEM_ORG_NAME = "MyDevTools Cloud"`, `SYSTEM_ORG_SLUG = "mydevtools-cloud"` constants in `seed.py`
  - `async def ensure_system_org() -> str` returning the ObjectId-string of the singleton system org. Idempotent.
  - `async def get_system_org_id() -> str | None` — cached read of the system-org `_id`
  - Repo functions:
    - `async def find_user_orgs(uid: str) -> list[dict]`
    - `async def find_user_workspaces(uid: str, org_id: str | None = None) -> list[dict]`
    - `async def find_workspace(workspace_id: str) -> dict | None`
    - `async def find_ws_membership(workspace_id: str, uid: str) -> dict | None`
    - `async def find_org_membership(org_id: str, uid: str) -> dict | None`
    - `async def upsert_org(name: str, slug: str, kind: str, owner_uid: str | None) -> str` — returns org_id
    - `async def upsert_org_membership(org_id: str, uid: str, org_role: str) -> None`
    - `async def upsert_personal_workspace(org_id: str, owner_uid: str) -> str` — returns workspace_id
    - `async def upsert_ws_membership(workspace_id: str, org_id: str, uid: str, ws_role: str) -> None`
  - New constants in `collection_name.py`:
    - `ORGANIZATIONS = "organizations"`
    - `ORG_MEMBERSHIPS = "org_memberships"`
    - `WORKSPACES = "workspaces"`
    - `WORKSPACE_MEMBERSHIPS = "workspace_memberships"`

- [ ] **Step 1: Write the failing test**

```python
# apps/backend/tests/test_workspaces_seed.py
import pytest
from app.api.routes.workspaces.seed import (
    SYSTEM_ORG_NAME,
    SYSTEM_ORG_SLUG,
    ensure_system_org,
)
from app.database import db_manager
from app.utils.collection_name import ORGANIZATIONS


@pytest.mark.asyncio
async def test_ensure_system_org_creates_singleton(clean_db):
    org_id_first = await ensure_system_org()
    org_id_second = await ensure_system_org()

    assert org_id_first == org_id_second

    docs = await db_manager.find_many(
        ORGANIZATIONS, {"slug": SYSTEM_ORG_SLUG}, limit=10
    )
    assert len(docs) == 1
    assert docs[0]["name"] == SYSTEM_ORG_NAME
    assert docs[0]["kind"] == "system"
    assert docs[0].get("owner_uid") is None
```

If `conftest.py` with `clean_db` fixture doesn't exist for the backend test suite yet, create it in `apps/backend/tests/conftest.py` with a fixture that drops the 4 new collections before/after the test. Mirror any existing test fixture conventions found in `apps/backend/tests/`.

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest apps/backend/tests/test_workspaces_seed.py -v
```

Expected: FAIL — `ImportError: cannot import name 'ensure_system_org'`.

- [ ] **Step 3: Add collection name constants**

Add to `apps/backend/app/utils/collection_name.py`:

```python
ORGANIZATIONS = "organizations"
ORG_MEMBERSHIPS = "org_memberships"
WORKSPACES = "workspaces"
WORKSPACE_MEMBERSHIPS = "workspace_memberships"
```

- [ ] **Step 4: Define Pydantic schemas**

Create `apps/backend/app/api/routes/workspaces/schema.py`:

```python
from typing import Literal
from pydantic import BaseModel, Field

OrgKind = Literal["system", "user"]
OrgRole = Literal["owner", "admin", "member", "viewer"]
WsKind = Literal["personal", "shared"]
WsRole = Literal["admin", "developer", "viewer"]


class OrgOut(BaseModel):
    id: str
    name: str
    slug: str
    kind: OrgKind
    org_role: OrgRole


class WorkspaceOut(BaseModel):
    id: str
    org_id: str
    name: str
    slug: str
    is_personal: bool
    kind: WsKind
    ws_role: WsRole


class SetActiveWorkspaceRequest(BaseModel):
    workspace_id: str = Field(min_length=1)


class SetActiveWorkspaceResponse(BaseModel):
    workspace_id: str
```

- [ ] **Step 5: Implement repo helpers**

Create `apps/backend/app/api/routes/workspaces/repo.py`:

```python
from typing import Any
from app.database import db_manager
from app.utils.collection_name import (
    ORGANIZATIONS,
    ORG_MEMBERSHIPS,
    WORKSPACES,
    WORKSPACE_MEMBERSHIPS,
)
from app.utils.utils import create_timestamp, new_id


async def find_user_orgs(uid: str) -> list[dict[str, Any]]:
    memberships = await db_manager.find_many(
        ORG_MEMBERSHIPS, {"uid": uid}, limit=100
    )
    if not memberships:
        return []
    org_ids = [m["org_id"] for m in memberships]
    orgs = await db_manager.find_many(
        ORGANIZATIONS, {"_id": {"$in": org_ids}}, limit=100
    )
    by_id = {o["_id"]: o for o in orgs}
    out: list[dict[str, Any]] = []
    for m in memberships:
        org = by_id.get(m["org_id"])
        if org:
            out.append({**org, "org_role": m["org_role"]})
    return out


async def find_user_workspaces(
    uid: str, org_id: str | None = None
) -> list[dict[str, Any]]:
    flt: dict[str, Any] = {"uid": uid}
    if org_id is not None:
        flt["org_id"] = org_id
    memberships = await db_manager.find_many(
        WORKSPACE_MEMBERSHIPS, flt, limit=500
    )
    if not memberships:
        return []
    ws_ids = [m["workspace_id"] for m in memberships]
    workspaces = await db_manager.find_many(
        WORKSPACES, {"_id": {"$in": ws_ids}}, limit=500
    )
    by_id = {w["_id"]: w for w in workspaces}
    out: list[dict[str, Any]] = []
    for m in memberships:
        ws = by_id.get(m["workspace_id"])
        if ws:
            out.append({**ws, "ws_role": m["ws_role"]})
    return out


async def find_workspace(workspace_id: str) -> dict[str, Any] | None:
    return await db_manager.find_one(WORKSPACES, {"_id": workspace_id})


async def find_org_membership(org_id: str, uid: str) -> dict[str, Any] | None:
    return await db_manager.find_one(
        ORG_MEMBERSHIPS, {"org_id": org_id, "uid": uid}
    )


async def find_ws_membership(
    workspace_id: str, uid: str
) -> dict[str, Any] | None:
    return await db_manager.find_one(
        WORKSPACE_MEMBERSHIPS, {"workspace_id": workspace_id, "uid": uid}
    )


async def upsert_org(
    name: str, slug: str, kind: str, owner_uid: str | None
) -> str:
    existing = await db_manager.find_one(ORGANIZATIONS, {"slug": slug})
    if existing:
        return existing["_id"]
    ts = create_timestamp()
    doc = {
        "_id": new_id(),
        "name": name,
        "slug": slug,
        "kind": kind,
        "owner_uid": owner_uid,
        "settings": {},
        "createdAt": ts,
        "updatedAt": ts,
    }
    await db_manager.insert_one(ORGANIZATIONS, doc)
    return doc["_id"]


async def upsert_org_membership(
    org_id: str, uid: str, org_role: str
) -> None:
    existing = await db_manager.find_one(
        ORG_MEMBERSHIPS, {"org_id": org_id, "uid": uid}
    )
    if existing:
        return
    await db_manager.insert_one(
        ORG_MEMBERSHIPS,
        {
            "_id": new_id(),
            "org_id": org_id,
            "uid": uid,
            "org_role": org_role,
            "createdAt": create_timestamp(),
        },
    )


def _personal_slug(uid: str) -> str:
    return f"personal-{uid[:12]}"


async def upsert_personal_workspace(org_id: str, owner_uid: str) -> str:
    existing = await db_manager.find_one(
        WORKSPACES,
        {
            "org_id": org_id,
            "owner_uid": owner_uid,
            "is_personal": True,
        },
    )
    if existing:
        return existing["_id"]
    ts = create_timestamp()
    doc = {
        "_id": new_id(),
        "org_id": org_id,
        "name": "Personal",
        "slug": _personal_slug(owner_uid),
        "is_personal": True,
        "owner_uid": owner_uid,
        "kind": "personal",
        "settings": {"encryption": None},
        "createdAt": ts,
        "updatedAt": ts,
    }
    await db_manager.insert_one(WORKSPACES, doc)
    return doc["_id"]


async def upsert_ws_membership(
    workspace_id: str, org_id: str, uid: str, ws_role: str
) -> None:
    existing = await db_manager.find_one(
        WORKSPACE_MEMBERSHIPS,
        {"workspace_id": workspace_id, "uid": uid},
    )
    if existing:
        return
    await db_manager.insert_one(
        WORKSPACE_MEMBERSHIPS,
        {
            "_id": new_id(),
            "workspace_id": workspace_id,
            "org_id": org_id,
            "uid": uid,
            "ws_role": ws_role,
            "createdAt": create_timestamp(),
        },
    )
```

If `db_manager.insert_one` or `find_many` don't exist with those exact signatures, mirror the calls used in `apps/backend/app/api/routes/passwords/services.py` (which uses `db_manager.find_one`) and `apps/backend/app/utils/crud.py` (`safe_insert`). Use whichever helper the existing routes use; do not invent a new accessor.

- [ ] **Step 6: Implement system-org seed**

Create `apps/backend/app/api/routes/workspaces/seed.py`:

```python
from app.api.routes.workspaces.repo import upsert_org

SYSTEM_ORG_NAME = "MyDevTools Cloud"
SYSTEM_ORG_SLUG = "mydevtools-cloud"


async def ensure_system_org() -> str:
    """Idempotently create the system org. Returns its id."""
    return await upsert_org(
        name=SYSTEM_ORG_NAME,
        slug=SYSTEM_ORG_SLUG,
        kind="system",
        owner_uid=None,
    )
```

- [ ] **Step 7: Wire seed into FastAPI lifespan**

Modify `apps/backend/app/main.py`, inside `async def lifespan`, after `await ensure_indexes()`:

```python
    try:
        from app.api.routes.workspaces.seed import ensure_system_org
        await ensure_system_org()
    except Exception as exc:
        logging.getLogger(__name__).warning("System org seed failed: %s", exc)
```

- [ ] **Step 8: Add Mongo indexes**

Modify `apps/backend/app/core/indexes.py` — add to `ensure_indexes` (mirroring existing index-definition style in the file):

```python
from app.utils.collection_name import (
    ORGANIZATIONS, ORG_MEMBERSHIPS, WORKSPACES, WORKSPACE_MEMBERSHIPS,
)

# Inside ensure_indexes(...):
await db_manager.create_index(ORGANIZATIONS, [("slug", 1)], unique=True)
await db_manager.create_index(
    ORG_MEMBERSHIPS, [("org_id", 1), ("uid", 1)], unique=True
)
await db_manager.create_index(ORG_MEMBERSHIPS, [("uid", 1)])
await db_manager.create_index(
    WORKSPACES,
    [("org_id", 1), ("owner_uid", 1), ("is_personal", 1)],
)
await db_manager.create_index(
    WORKSPACE_MEMBERSHIPS,
    [("workspace_id", 1), ("uid", 1)],
    unique=True,
)
await db_manager.create_index(WORKSPACE_MEMBERSHIPS, [("uid", 1)])
```

If `db_manager.create_index` is not the existing helper, mirror whatever helper is already used inside the file.

- [ ] **Step 9: Run test to verify it passes**

```bash
pytest apps/backend/tests/test_workspaces_seed.py -v
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add apps/backend/app/api/routes/workspaces/__init__.py \
        apps/backend/app/api/routes/workspaces/schema.py \
        apps/backend/app/api/routes/workspaces/repo.py \
        apps/backend/app/api/routes/workspaces/seed.py \
        apps/backend/app/utils/collection_name.py \
        apps/backend/app/core/indexes.py \
        apps/backend/app/main.py \
        apps/backend/tests/test_workspaces_seed.py \
        apps/backend/tests/conftest.py
git commit -m "feat(workspaces): mongo schemas + repo + system-org seed"
```

---

### Task 2: WorkspaceContext + `get_workspace_ctx` middleware

**Files:**
- Create: `apps/backend/app/api/routes/workspaces/middleware.py`
- Test: `apps/backend/tests/test_workspace_ctx.py`

**Interfaces:**
- Consumes: `find_workspace`, `find_ws_membership`, `find_user_workspaces` from `repo.py`; `get_current_uid` from `app.api.routes.auth.services`.
- Produces:
  - `class WorkspaceContext(BaseModel)`: `uid: str`, `org_id: str`, `workspace_id: str`, `ws_role: WsRole`, `is_personal: bool`, `owner_uid: str | None`.
  - `ACTIVE_WS_COOKIE = "active_workspace"` constant.
  - `async def default_personal_ws_id(uid: str) -> str | None` — returns the user's Personal workspace_id if it exists.
  - `async def get_workspace_ctx(request: Request, uid: str = Depends(get_current_uid)) -> WorkspaceContext` FastAPI dependency.
  - `def apply_workspace_filter(ctx: WorkspaceContext, base_filter: dict) -> dict` — merges `{org_id, workspace_id}` plus `{owner_uid: ctx.uid}` when `ctx.is_personal`.
  - `def apply_legacy_or_filter(ctx: WorkspaceContext, base_filter: dict, *, user_field: str) -> dict` — returns the transitional OR-shape (workspace_id-stamped OR uid-only legacy) for read paths during backfill. `user_field` is the existing user-id field name on the target collection (`"created_by"` for passwords, `"uid"` for most others). Marked with `# ponytail:` comment.

- [ ] **Step 1: Write failing test**

```python
# apps/backend/tests/test_workspace_ctx.py
import pytest
from fastapi import HTTPException
from app.api.routes.workspaces.middleware import (
    WorkspaceContext,
    apply_legacy_or_filter,
    apply_workspace_filter,
    default_personal_ws_id,
    get_workspace_ctx,
)
from app.api.routes.workspaces.repo import (
    upsert_org,
    upsert_org_membership,
    upsert_personal_workspace,
    upsert_ws_membership,
)


@pytest.mark.asyncio
async def test_get_workspace_ctx_rejects_non_member(make_request, clean_db):
    org_id = await upsert_org("Acme", "acme", "user", "owner-uid")
    await upsert_org_membership(org_id, "owner-uid", "owner")
    ws_id = await upsert_personal_workspace(org_id, "owner-uid")
    await upsert_ws_membership(ws_id, org_id, "owner-uid", "admin")

    req = make_request(cookies={"active_workspace": ws_id})
    with pytest.raises(HTTPException) as exc:
        await get_workspace_ctx(req, uid="someone-else")
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_default_personal_ws_id_returns_personal_ws(clean_db):
    org_id = await upsert_org("MyDevTools Cloud", "mydevtools-cloud", "system", None)
    await upsert_org_membership(org_id, "u1", "member")
    ws_id = await upsert_personal_workspace(org_id, "u1")
    await upsert_ws_membership(ws_id, org_id, "u1", "admin")

    assert await default_personal_ws_id("u1") == ws_id


def test_apply_workspace_filter_personal_adds_owner_uid():
    ctx = WorkspaceContext(
        uid="u1",
        org_id="o1",
        workspace_id="w1",
        ws_role="admin",
        is_personal=True,
        owner_uid="u1",
    )
    out = apply_workspace_filter(ctx, {"foo": "bar"})
    assert out == {
        "foo": "bar",
        "org_id": "o1",
        "workspace_id": "w1",
        "owner_uid": "u1",
    }


def test_apply_legacy_or_filter_bounds_by_user_field():
    ctx = WorkspaceContext(
        uid="u1",
        org_id="o1",
        workspace_id="w1",
        ws_role="admin",
        is_personal=True,
        owner_uid="u1",
    )
    out = apply_legacy_or_filter(ctx, {"foo": "bar"}, user_field="created_by")
    assert out["$or"] == [
        {"org_id": "o1", "workspace_id": "w1", "owner_uid": "u1"},
        {"workspace_id": {"$exists": False}, "created_by": "u1"},
    ]
    assert out["foo"] == "bar"
```

Add `make_request` fixture in `conftest.py` returning a `starlette.requests.Request`-like mock with `.cookies` access.

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest apps/backend/tests/test_workspace_ctx.py -v
```

Expected: FAIL — `ImportError`.

- [ ] **Step 3: Implement middleware**

Create `apps/backend/app/api/routes/workspaces/middleware.py`:

```python
from typing import Annotated, Any
from fastapi import Depends, HTTPException, Request, status
from pydantic import BaseModel
from app.api.routes.auth.services import get_current_uid
from app.api.routes.workspaces.repo import (
    find_user_workspaces,
    find_workspace,
    find_ws_membership,
)
from app.api.routes.workspaces.schema import WsRole

ACTIVE_WS_COOKIE = "active_workspace"


class WorkspaceContext(BaseModel):
    uid: str
    org_id: str
    workspace_id: str
    ws_role: WsRole
    is_personal: bool
    owner_uid: str | None = None


async def default_personal_ws_id(uid: str) -> str | None:
    workspaces = await find_user_workspaces(uid)
    for w in workspaces:
        if w.get("is_personal"):
            return w["_id"]
    return None


async def get_workspace_ctx(
    request: Request,
    uid: Annotated[str, Depends(get_current_uid)],
) -> WorkspaceContext:
    ws_id = request.cookies.get(ACTIVE_WS_COOKIE)
    if not ws_id:
        ws_id = await default_personal_ws_id(uid)
    if not ws_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No accessible workspace.",
        )

    mem = await find_ws_membership(ws_id, uid)
    if not mem:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this workspace.",
        )

    ws = await find_workspace(ws_id)
    if not ws:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Workspace not found.",
        )

    return WorkspaceContext(
        uid=uid,
        org_id=ws["org_id"],
        workspace_id=ws_id,
        ws_role=mem["ws_role"],
        is_personal=bool(ws.get("is_personal")),
        owner_uid=ws.get("owner_uid"),
    )


def apply_workspace_filter(
    ctx: WorkspaceContext, base_filter: dict[str, Any]
) -> dict[str, Any]:
    flt = {**base_filter, "org_id": ctx.org_id, "workspace_id": ctx.workspace_id}
    if ctx.is_personal:
        flt["owner_uid"] = ctx.uid
    return flt


def apply_legacy_or_filter(
    ctx: WorkspaceContext,
    base_filter: dict[str, Any],
    *,
    user_field: str,
) -> dict[str, Any]:
    """Read-path tolerance during pending backfill.

    ponytail: transitional OR-branch. Remove in a follow-up PR after all
    live users have user.migrated_at set. The OR is bounded by `user_field`
    so it cannot leak across users.
    """
    stamped: dict[str, Any] = {
        "org_id": ctx.org_id,
        "workspace_id": ctx.workspace_id,
    }
    if ctx.is_personal:
        stamped["owner_uid"] = ctx.uid
    legacy: dict[str, Any] = {
        "workspace_id": {"$exists": False},
        user_field: ctx.uid,
    }
    return {**base_filter, "$or": [stamped, legacy]}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pytest apps/backend/tests/test_workspace_ctx.py -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/app/api/routes/workspaces/middleware.py \
        apps/backend/tests/test_workspace_ctx.py \
        apps/backend/tests/conftest.py
git commit -m "feat(workspaces): WorkspaceContext + get_workspace_ctx middleware"
```

---

### Task 3: First-login hook (`ensure_user_workspace_setup`)

**Files:**
- Modify: `apps/backend/app/api/routes/workspaces/services.py` (new file — create it)
- Modify: `apps/backend/app/api/routes/auth/users_repo.py` — add `mark_workspace_setup`, `get_workspace_setup_at`, `mark_migration_pending`, `mark_migrated`, `get_migration_status` helpers (or whatever the existing pattern in that file already does for setting user-doc fields).
- Modify: `apps/backend/app/api/routes/auth/api.py` — invoke hook inside `create_session` after `upsert_user_from_firebase_claims`.
- Test: `apps/backend/tests/test_workspace_setup.py`

**Interfaces:**
- Consumes: `ensure_system_org` from `seed.py`; `upsert_org_membership`, `upsert_personal_workspace`, `upsert_ws_membership` from `repo.py`; user-repo helpers above.
- Produces:
  - `async def ensure_user_workspace_setup(uid: str) -> str` — returns the user's Personal workspace_id. Idempotent. Sets `user.workspace_setup_at` on first run; subsequent calls short-circuit on this flag.
  - Side effect: enqueues backfill (via `mark_migration_pending`) if `user.migrated_at` is null. The actual backfill task dispatch lives in Task 4 — for Task 3 the hook just sets `migration_status="pending"`; the dispatch wiring lands in Task 4.

- [ ] **Step 1: Write failing test**

```python
# apps/backend/tests/test_workspace_setup.py
import pytest
from app.api.routes.workspaces.repo import (
    find_org_membership, find_ws_membership, find_user_workspaces,
)
from app.api.routes.workspaces.seed import ensure_system_org
from app.api.routes.workspaces.services import ensure_user_workspace_setup


@pytest.mark.asyncio
async def test_first_call_creates_membership_and_personal_workspace(clean_db):
    org_id = await ensure_system_org()
    ws_id = await ensure_user_workspace_setup("u1")

    assert await find_org_membership(org_id, "u1") is not None
    assert await find_ws_membership(ws_id, "u1") is not None

    workspaces = await find_user_workspaces("u1")
    assert len(workspaces) == 1
    assert workspaces[0]["is_personal"] is True
    assert workspaces[0]["owner_uid"] == "u1"
    assert workspaces[0]["name"] == "Personal"


@pytest.mark.asyncio
async def test_second_call_is_no_op(clean_db, count_inserts):
    await ensure_system_org()
    await ensure_user_workspace_setup("u1")
    before = count_inserts()
    await ensure_user_workspace_setup("u1")
    after = count_inserts()
    assert after == before
```

The `count_inserts` fixture wraps `db_manager.insert_one` with a call counter; add to `conftest.py`.

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest apps/backend/tests/test_workspace_setup.py -v
```

Expected: FAIL — `ImportError`.

- [ ] **Step 3: Implement service**

Create `apps/backend/app/api/routes/workspaces/services.py`:

```python
from app.api.routes.auth import users_repo
from app.api.routes.workspaces.repo import (
    upsert_org_membership,
    upsert_personal_workspace,
    upsert_ws_membership,
)
from app.api.routes.workspaces.seed import ensure_system_org


async def ensure_user_workspace_setup(uid: str) -> str:
    """Idempotently create the user's MyDevTools Cloud membership and
    Personal workspace. Returns the user's Personal workspace_id.
    """
    setup_at = await users_repo.get_workspace_setup_at(uid)
    if setup_at:
        ws_id = await users_repo.get_personal_workspace_id(uid)
        if ws_id:
            return ws_id

    org_id = await ensure_system_org()
    await upsert_org_membership(org_id, uid, "member")
    ws_id = await upsert_personal_workspace(org_id, uid)
    await upsert_ws_membership(ws_id, org_id, uid, "admin")

    await users_repo.mark_workspace_setup(uid, ws_id)

    migrated_at = await users_repo.get_migrated_at(uid)
    if not migrated_at:
        await users_repo.mark_migration_pending(uid)

    return ws_id
```

- [ ] **Step 4: Add user-repo helpers**

Add to `apps/backend/app/api/routes/auth/users_repo.py` (use whatever Mongo helper the file already uses):

```python
async def mark_workspace_setup(uid: str, personal_workspace_id: str) -> None:
    await db_manager.update_one(
        USERS,
        {"_id": uid},
        {"$set": {
            "workspace_setup_at": create_timestamp(),
            "personal_workspace_id": personal_workspace_id,
        }},
    )


async def get_workspace_setup_at(uid: str) -> int | None:
    doc = await db_manager.find_one(USERS, {"_id": uid})
    if not doc:
        return None
    return doc.get("workspace_setup_at")


async def get_personal_workspace_id(uid: str) -> str | None:
    doc = await db_manager.find_one(USERS, {"_id": uid})
    if not doc:
        return None
    return doc.get("personal_workspace_id")


async def mark_migration_pending(uid: str) -> None:
    await db_manager.update_one(
        USERS, {"_id": uid}, {"$set": {"migration_status": "pending"}}
    )


async def get_migrated_at(uid: str) -> int | None:
    doc = await db_manager.find_one(USERS, {"_id": uid})
    if not doc:
        return None
    return doc.get("migrated_at")
```

If the `USERS` collection in this app uses a different primary-key field (e.g. `uid` instead of `_id`), mirror the existing helper signatures already in the file.

- [ ] **Step 5: Run test to verify it passes**

```bash
pytest apps/backend/tests/test_workspace_setup.py -v
```

Expected: PASS.

- [ ] **Step 6: Wire into `create_session`**

Modify `apps/backend/app/api/routes/auth/api.py`, inside `create_session`, after `await upsert_user_from_firebase_claims(decoded)`:

```python
    from app.api.routes.workspaces.services import ensure_user_workspace_setup
    await ensure_user_workspace_setup(uid)
```

- [ ] **Step 7: Commit**

```bash
git add apps/backend/app/api/routes/workspaces/services.py \
        apps/backend/app/api/routes/auth/users_repo.py \
        apps/backend/app/api/routes/auth/api.py \
        apps/backend/tests/test_workspace_setup.py \
        apps/backend/tests/conftest.py
git commit -m "feat(workspaces): first-login hook ensures Personal workspace"
```

---

### Task 4: Backfill background task

**Files:**
- Modify: `apps/backend/app/api/routes/workspaces/backfill.py` (new file — create it)
- Modify: `apps/backend/app/api/routes/workspaces/services.py` — dispatch backfill from `ensure_user_workspace_setup`.
- Modify: `apps/backend/app/api/routes/auth/users_repo.py` — add `mark_migrated`, `get_migration_progress`, `set_migration_progress` helpers; add `pinned_tools_by_workspace` rewrite helper for `user_preferences`.
- Modify: `apps/backend/app/api/routes/auth/api.py` — pass `BackgroundTasks` to `ensure_user_workspace_setup`.
- Test: `apps/backend/tests/test_backfill.py`

**Interfaces:**
- Consumes: collection-name constants, `apply_workspace_filter` (only for verification asserts, not the backfill itself).
- Produces:
  - `BACKFILL_COLLECTIONS: list[BackfillSpec]` — list of `{collection, user_field}` pairs. Includes the 14 scoped collections.
  - `async def run_user_backfill(uid: str, personal_workspace_id: str, org_id: str) -> None` — per-user, idempotent. For each collection, `update_many({user_field: uid, workspace_id: {$exists: False}}, {$set: {org_id, workspace_id, owner_uid: uid (if collection has owner_uid semantics)}})`. Records progress in `users.migration_progress`. Final step: rewrite `user_preferences.pinned_tools` → `pinned_tools_by_workspace`. Sets `users.migrated_at` when complete.
  - `def schedule_backfill(background_tasks: BackgroundTasks, uid: str, ws_id: str, org_id: str) -> None`.

- [ ] **Step 1: Write failing test**

```python
# apps/backend/tests/test_backfill.py
import pytest
from app.api.routes.auth import users_repo
from app.api.routes.workspaces.backfill import BACKFILL_COLLECTIONS, run_user_backfill
from app.api.routes.workspaces.seed import ensure_system_org
from app.database import db_manager
from app.utils.collection_name import PASSWORD_ENTRIES, NOTES, USER_PREFERENCES


@pytest.mark.asyncio
async def test_backfill_stamps_legacy_rows(clean_db, seed_legacy_user_data):
    org_id = await ensure_system_org()
    # seed_legacy_user_data inserts a few rows in PASSWORD_ENTRIES + NOTES
    # for uid="u1" with no workspace_id
    ws_id = "ws-1"

    await run_user_backfill("u1", ws_id, org_id)

    for entry in await db_manager.find_many(PASSWORD_ENTRIES, {"created_by": "u1"}, limit=100):
        assert entry["org_id"] == org_id
        assert entry["workspace_id"] == ws_id

    for note in await db_manager.find_many(NOTES, {"uid": "u1"}, limit=100):
        assert note["org_id"] == org_id
        assert note["workspace_id"] == ws_id

    assert await users_repo.get_migrated_at("u1") is not None


@pytest.mark.asyncio
async def test_backfill_is_idempotent(clean_db, seed_legacy_user_data):
    org_id = await ensure_system_org()
    ws_id = "ws-1"
    await run_user_backfill("u1", ws_id, org_id)
    migrated_first = await users_repo.get_migrated_at("u1")
    await run_user_backfill("u1", ws_id, org_id)
    migrated_second = await users_repo.get_migrated_at("u1")
    assert migrated_first == migrated_second


@pytest.mark.asyncio
async def test_backfill_rewrites_pinned_tools(clean_db):
    org_id = await ensure_system_org()
    ws_id = "ws-1"
    await db_manager.insert_one(
        USER_PREFERENCES,
        {"_id": "u1", "uid": "u1", "pinned_tools": ["/app/passwords", "/app/notes"]},
    )

    await run_user_backfill("u1", ws_id, org_id)

    pref = await db_manager.find_one(USER_PREFERENCES, {"_id": "u1"})
    assert pref["pinned_tools_by_workspace"] == {ws_id: ["/app/passwords", "/app/notes"]}
    assert "pinned_tools" not in pref
```

Add `seed_legacy_user_data` fixture in `conftest.py` that inserts legacy rows in PASSWORD_ENTRIES (with `created_by="u1"`, no `workspace_id`) and NOTES (with `uid="u1"`, no `workspace_id`).

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest apps/backend/tests/test_backfill.py -v
```

Expected: FAIL — `ImportError`.

- [ ] **Step 3: Implement backfill**

Create `apps/backend/app/api/routes/workspaces/backfill.py`:

```python
from dataclasses import dataclass
from typing import Any

from fastapi import BackgroundTasks

from app.api.routes.auth import users_repo
from app.database import db_manager
from app.utils.collection_name import (
    API_CLIENT_COLLECTIONS, API_CLIENT_ENVIRONMENTS, API_CLIENT_HISTORY,
    API_CLIENT_WORKSPACES, API_KEY_VAULT_ENTRIES, BOOKMARKS, BOOKMARK_FOLDERS,
    CODE_SNIPPETS, ENV_MANAGER_ENTRIES, JSON_FORMATTER_DOCUMENTS, NOSQL_CONNECTIONS,
    NOSQL_QUERY_HISTORY, NOTES, PASSWORD_ENTRIES, PASSWORD_VAULTS, PROJECTS,
    REDIS_CONNECTIONS, S3_CONNECTIONS, SQL_CONNECTIONS, TASKS, URL_LINKS,
    USER_PREFERENCES,
)


@dataclass(frozen=True)
class BackfillSpec:
    collection: str
    user_field: str          # existing field that holds the uid stamp
    stamp_owner_uid: bool    # whether to add owner_uid alongside org_id/workspace_id


BACKFILL_COLLECTIONS: list[BackfillSpec] = [
    BackfillSpec(PASSWORD_VAULTS,           "created_by", True),
    BackfillSpec(PASSWORD_ENTRIES,          "created_by", True),
    BackfillSpec(ENV_MANAGER_ENTRIES,       "created_by", True),
    BackfillSpec(API_KEY_VAULT_ENTRIES,     "created_by", True),
    BackfillSpec(NOTES,                     "uid",        True),
    BackfillSpec(TASKS,                     "uid",        True),
    BackfillSpec(PROJECTS,                  "uid",        True),
    BackfillSpec(BOOKMARKS,                 "uid",        True),
    BackfillSpec(BOOKMARK_FOLDERS,          "uid",        True),
    BackfillSpec(CODE_SNIPPETS,             "uid",        True),
    BackfillSpec(NOSQL_CONNECTIONS,         "uid",        True),
    BackfillSpec(NOSQL_QUERY_HISTORY,       "uid",        True),
    BackfillSpec(API_CLIENT_COLLECTIONS,    "uid",        True),
    BackfillSpec(API_CLIENT_ENVIRONMENTS,   "uid",        True),
    BackfillSpec(API_CLIENT_HISTORY,        "uid",        True),
    BackfillSpec(API_CLIENT_WORKSPACES,     "uid",        True),
    BackfillSpec(SQL_CONNECTIONS,           "uid",        True),
    BackfillSpec(S3_CONNECTIONS,            "uid",        True),
    BackfillSpec(REDIS_CONNECTIONS,         "uid",        True),
    BackfillSpec(URL_LINKS,                 "uid",        True),
    BackfillSpec(JSON_FORMATTER_DOCUMENTS,  "uid",        True),
]


async def _stamp_collection(spec: BackfillSpec, uid: str, ws_id: str, org_id: str) -> int:
    update: dict[str, Any] = {"org_id": org_id, "workspace_id": ws_id}
    if spec.stamp_owner_uid:
        update["owner_uid"] = uid
    res = await db_manager.update_many(
        spec.collection,
        {spec.user_field: uid, "workspace_id": {"$exists": False}},
        {"$set": update},
    )
    return getattr(res, "modified_count", 0)


async def _rewrite_pinned_tools(uid: str, ws_id: str) -> None:
    pref = await db_manager.find_one(USER_PREFERENCES, {"_id": uid})
    if not pref:
        return
    legacy = pref.get("pinned_tools")
    if legacy is None:
        return
    keyed = pref.get("pinned_tools_by_workspace") or {}
    keyed[ws_id] = list(legacy)
    await db_manager.update_one(
        USER_PREFERENCES,
        {"_id": uid},
        {
            "$set": {"pinned_tools_by_workspace": keyed},
            "$unset": {"pinned_tools": ""},
        },
    )


async def run_user_backfill(uid: str, personal_workspace_id: str, org_id: str) -> None:
    progress = await users_repo.get_migration_progress(uid) or {}
    for spec in BACKFILL_COLLECTIONS:
        if progress.get(spec.collection) == "done":
            continue
        await _stamp_collection(spec, uid, personal_workspace_id, org_id)
        progress[spec.collection] = "done"
        await users_repo.set_migration_progress(uid, progress)

    await _rewrite_pinned_tools(uid, personal_workspace_id)
    await users_repo.mark_migrated(uid)


def schedule_backfill(
    background_tasks: BackgroundTasks,
    uid: str,
    personal_workspace_id: str,
    org_id: str,
) -> None:
    background_tasks.add_task(run_user_backfill, uid, personal_workspace_id, org_id)
```

- [ ] **Step 4: Add user-repo migration helpers**

Add to `apps/backend/app/api/routes/auth/users_repo.py`:

```python
async def get_migration_progress(uid: str) -> dict | None:
    doc = await db_manager.find_one(USERS, {"_id": uid})
    return (doc or {}).get("migration_progress")


async def set_migration_progress(uid: str, progress: dict) -> None:
    await db_manager.update_one(
        USERS, {"_id": uid}, {"$set": {"migration_progress": progress}}
    )


async def mark_migrated(uid: str) -> None:
    await db_manager.update_one(
        USERS,
        {"_id": uid},
        {"$set": {
            "migrated_at": create_timestamp(),
            "migration_status": "done",
        }},
    )
```

- [ ] **Step 5: Wire `schedule_backfill` into the auth-session path**

Modify `apps/backend/app/api/routes/workspaces/services.py` — update `ensure_user_workspace_setup` to also dispatch the backfill when `migration_status` is pending. Signature change:

```python
from fastapi import BackgroundTasks
from app.api.routes.workspaces.backfill import schedule_backfill

async def ensure_user_workspace_setup(
    uid: str,
    background_tasks: BackgroundTasks | None = None,
) -> str:
    # ... existing body unchanged through the upserts ...
    ws_id = ...  # the Personal workspace_id as before
    org_id = ...  # the system org id as before

    migrated_at = await users_repo.get_migrated_at(uid)
    if not migrated_at:
        await users_repo.mark_migration_pending(uid)
        if background_tasks is not None:
            schedule_backfill(background_tasks, uid, ws_id, org_id)

    return ws_id
```

Modify `apps/backend/app/api/routes/auth/api.py` — pass `BackgroundTasks` in:

```python
from fastapi import BackgroundTasks

@router.post(...)  # existing decorator
async def create_session(
    request: Request,
    payload: SessionRequest,
    response: Response,
    background_tasks: BackgroundTasks,
) -> UserProfileResponse:
    # ...existing body...
    await ensure_user_workspace_setup(uid, background_tasks=background_tasks)
```

- [ ] **Step 6: Run test to verify it passes**

```bash
pytest apps/backend/tests/test_backfill.py -v
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/app/api/routes/workspaces/backfill.py \
        apps/backend/app/api/routes/workspaces/services.py \
        apps/backend/app/api/routes/auth/users_repo.py \
        apps/backend/app/api/routes/auth/api.py \
        apps/backend/tests/test_backfill.py \
        apps/backend/tests/conftest.py
git commit -m "feat(workspaces): per-user lazy backfill background task"
```

---

## Phase 2 — Workspace API

### Task 5: Workspace HTTP routes + wire into api_router

**Files:**
- Modify: `apps/backend/app/api/routes/workspaces/api.py` (new file — create it)
- Modify: `apps/backend/app/api/router.py` — include the new router
- Test: add to `apps/backend/tests/test_workspaces_seed.py` OR create `apps/backend/tests/test_workspace_routes.py`

**Interfaces:**
- Consumes: `find_user_orgs`, `find_user_workspaces`, `find_workspace`, `find_ws_membership` from `repo.py`; `get_current_uid`; `ACTIVE_WS_COOKIE`.
- Produces:
  - `GET /workspaces-api/orgs` → `list[OrgOut]`
  - `GET /workspaces-api/workspaces?org_id=...` → `list[WorkspaceOut]`
  - `GET /workspaces-api/workspaces/{workspace_id}` → `WorkspaceOut`
  - `POST /workspaces-api/workspaces/active` body `SetActiveWorkspaceRequest` → `SetActiveWorkspaceResponse` + sets `active_workspace` cookie
  - Note: router `prefix="/workspaces-api"` to avoid string collision with `/api/v1/workspaces` (which would shadow the per-`workspace_id` path); keep the frontend-facing URL stable at `/api/backend/workspaces-api/...`.

- [ ] **Step 1: Write failing test**

```python
# apps/backend/tests/test_workspace_routes.py
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_orgs_returns_mydevtools_cloud(authed_client: AsyncClient):
    res = await authed_client.get("/api/v1/workspaces-api/orgs")
    assert res.status_code == 200
    orgs = res.json()
    assert len(orgs) == 1
    assert orgs[0]["slug"] == "mydevtools-cloud"
    assert orgs[0]["org_role"] == "member"


@pytest.mark.asyncio
async def test_list_workspaces_returns_personal(authed_client: AsyncClient):
    res = await authed_client.get("/api/v1/workspaces-api/workspaces")
    assert res.status_code == 200
    workspaces = res.json()
    assert len(workspaces) == 1
    assert workspaces[0]["is_personal"] is True
    assert workspaces[0]["name"] == "Personal"
    assert workspaces[0]["ws_role"] == "admin"


@pytest.mark.asyncio
async def test_set_active_workspace_validates_membership(authed_client: AsyncClient):
    res = await authed_client.post(
        "/api/v1/workspaces-api/workspaces/active",
        json={"workspace_id": "bogus-id"},
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_set_active_workspace_sets_cookie(authed_client: AsyncClient, personal_ws_id: str):
    res = await authed_client.post(
        "/api/v1/workspaces-api/workspaces/active",
        json={"workspace_id": personal_ws_id},
    )
    assert res.status_code == 200
    assert res.cookies.get("active_workspace") == personal_ws_id
```

Add `authed_client` + `personal_ws_id` fixtures (a fixture that builds a test FastAPI client with a stubbed Firebase-auth dependency, plus a fixture that calls `ensure_user_workspace_setup` and returns the resulting workspace id). Mirror conftest patterns already in `apps/backend/tests/`.

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest apps/backend/tests/test_workspace_routes.py -v
```

Expected: FAIL — `404 Not Found` on the routes.

- [ ] **Step 3: Implement routes**

Create `apps/backend/app/api/routes/workspaces/api.py`:

```python
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from app.api.routes.auth.services import get_current_uid
from app.api.routes.workspaces.middleware import ACTIVE_WS_COOKIE
from app.api.routes.workspaces.repo import (
    find_user_orgs, find_user_workspaces, find_workspace, find_ws_membership,
)
from app.api.routes.workspaces.schema import (
    OrgOut, SetActiveWorkspaceRequest, SetActiveWorkspaceResponse, WorkspaceOut,
)
from app.core.config import get_settings

router = APIRouter(prefix="/workspaces-api", tags=["workspaces"])


def _org_to_out(org: dict) -> OrgOut:
    return OrgOut(
        id=org["_id"],
        name=org["name"],
        slug=org["slug"],
        kind=org["kind"],
        org_role=org["org_role"],
    )


def _ws_to_out(ws: dict) -> WorkspaceOut:
    return WorkspaceOut(
        id=ws["_id"],
        org_id=ws["org_id"],
        name=ws["name"],
        slug=ws["slug"],
        is_personal=bool(ws.get("is_personal")),
        kind=ws.get("kind", "personal"),
        ws_role=ws["ws_role"],
    )


@router.get("/orgs", response_model=list[OrgOut])
async def list_orgs(uid: Annotated[str, Depends(get_current_uid)]) -> list[OrgOut]:
    orgs = await find_user_orgs(uid)
    return [_org_to_out(o) for o in orgs]


@router.get("/workspaces", response_model=list[WorkspaceOut])
async def list_workspaces(
    uid: Annotated[str, Depends(get_current_uid)],
    org_id: str | None = Query(default=None),
) -> list[WorkspaceOut]:
    workspaces = await find_user_workspaces(uid, org_id=org_id)
    return [_ws_to_out(w) for w in workspaces]


@router.get("/workspaces/{workspace_id}", response_model=WorkspaceOut)
async def get_workspace(
    workspace_id: str,
    uid: Annotated[str, Depends(get_current_uid)],
) -> WorkspaceOut:
    ws = await find_workspace(workspace_id)
    mem = await find_ws_membership(workspace_id, uid)
    if not ws or not mem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return _ws_to_out({**ws, "ws_role": mem["ws_role"]})


@router.post("/workspaces/active", response_model=SetActiveWorkspaceResponse)
async def set_active_workspace(
    body: SetActiveWorkspaceRequest,
    response: Response,
    uid: Annotated[str, Depends(get_current_uid)],
) -> SetActiveWorkspaceResponse:
    mem = await find_ws_membership(body.workspace_id, uid)
    if not mem:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this workspace.",
        )
    settings = get_settings()
    response.set_cookie(
        key=ACTIVE_WS_COOKIE,
        value=body.workspace_id,
        httponly=True,
        samesite="lax",
        secure=settings.APP_ENV == "production",
        path="/",
    )
    return SetActiveWorkspaceResponse(workspace_id=body.workspace_id)
```

- [ ] **Step 4: Wire router**

Modify `apps/backend/app/api/router.py`:

```python
from app.api.routes.workspaces.api import router as workspaces_router
# ...
api_router.include_router(workspaces_router)
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pytest apps/backend/tests/test_workspace_routes.py -v
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/app/api/routes/workspaces/api.py \
        apps/backend/app/api/router.py \
        apps/backend/tests/test_workspace_routes.py
git commit -m "feat(workspaces): GET orgs/workspaces + POST active route"
```

---

## Phase 3 — Reference scoped-route refactor

### Task 6: Refactor `passwords` route as the reference pattern

**Files:**
- Modify: `apps/backend/app/api/routes/passwords/api.py`
- Modify: `apps/backend/app/api/routes/passwords/services.py`
- Test: `apps/backend/tests/test_workspace_invariant.py` (new), plus extend any existing `tests/test_passwords*.py` if present.

**Interfaces:**
- Consumes: `WorkspaceContext`, `get_workspace_ctx`, `apply_workspace_filter`, `apply_legacy_or_filter` from `workspaces/middleware.py`.
- Produces: the reference pattern that Tasks 7–20 will mirror. Specifically:
  - Every `Depends(get_current_uid)` swap → `Depends(get_workspace_ctx)`.
  - Every service-layer call swaps `uid: str` for `ctx: WorkspaceContext`; reads use `apply_legacy_or_filter(ctx, base_filter, user_field=...)`; writes use `apply_workspace_filter(ctx, base_filter)` for the find-side filter and stamp `{org_id, workspace_id, owner_uid: ctx.uid (if personal)}` on inserts.
  - One unit test that proves cross-user isolation under two distinct Personal workspaces.

- [ ] **Step 1: Write failing isolation test**

```python
# apps/backend/tests/test_workspace_invariant.py
import pytest
from app.api.routes.passwords import services as pw_svc
from app.api.routes.passwords.schema import PasswordEntryCreate
from app.api.routes.workspaces.middleware import WorkspaceContext


def _ctx(uid: str, ws_id: str, org_id: str) -> WorkspaceContext:
    return WorkspaceContext(
        uid=uid, org_id=org_id, workspace_id=ws_id, ws_role="admin",
        is_personal=True, owner_uid=uid,
    )


@pytest.mark.asyncio
async def test_password_entries_are_isolated_across_personal_workspaces(
    clean_db, system_org_id, personal_ws_for,
):
    org_id = system_org_id
    ws_u1 = await personal_ws_for("u1")
    ws_u2 = await personal_ws_for("u2")

    ctx_u1 = _ctx("u1", ws_u1, org_id)
    ctx_u2 = _ctx("u2", ws_u2, org_id)

    await pw_svc.create_entry(
        ctx_u1, PasswordEntryCreate(encryptedData="enc-u1", iv="iv-u1"),
    )

    entries_u1 = await pw_svc.list_entries(ctx=ctx_u1)
    entries_u2 = await pw_svc.list_entries(ctx=ctx_u2)

    assert len(entries_u1) == 1
    assert len(entries_u2) == 0


@pytest.mark.asyncio
async def test_forged_workspace_id_cannot_cross_user_data(
    clean_db, system_org_id, personal_ws_for,
):
    org_id = system_org_id
    ws_u1 = await personal_ws_for("u1")
    await personal_ws_for("u2")

    await pw_svc.create_entry(
        _ctx("u1", ws_u1, org_id),
        PasswordEntryCreate(encryptedData="enc-u1", iv="iv-u1"),
    )

    forged_ctx = _ctx("u2", ws_u1, org_id)  # u2 forges u1's workspace_id
    entries = await pw_svc.list_entries(ctx=forged_ctx)
    assert entries == []  # owner_uid filter saves us
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest apps/backend/tests/test_workspace_invariant.py -v
```

Expected: FAIL — services still take `uid: str`, no `ctx` param yet.

- [ ] **Step 3: Refactor `passwords/services.py`**

For every function in `apps/backend/app/api/routes/passwords/services.py` that currently accepts `uid: str` and performs a Mongo query against `PASSWORD_VAULTS` or `PASSWORD_ENTRIES`:

1. Change the signature: replace `uid: str` (positional or keyword) with `ctx: WorkspaceContext`.
2. Add imports:
   ```python
   from app.api.routes.workspaces.middleware import (
       WorkspaceContext, apply_legacy_or_filter, apply_workspace_filter,
   )
   ```
3. For **read paths**, replace the existing `{"created_by": uid}` filter with `apply_legacy_or_filter(ctx, {}, user_field="created_by")`.
4. For **write paths** (insert), stamp `org_id=ctx.org_id`, `workspace_id=ctx.workspace_id`, `owner_uid=ctx.uid` onto the doc, alongside the existing `created_by=ctx.uid`.
5. For **update / delete** paths, use `apply_workspace_filter(ctx, {"_id": entry_id, "created_by": ctx.uid})` as the find-side filter so the predicate is `(workspace_id stamped) AND (owner_uid==ctx.uid) AND (_id==entry_id) AND (created_by==ctx.uid)`.

Example diff for `list_entries`:

```python
async def list_entries(
    *,
    ctx: WorkspaceContext,
    limit: int = 200,
    offset: int = 0,
) -> list[PasswordEntryOut]:
    flt = apply_legacy_or_filter(ctx, {}, user_field="created_by")
    docs = await db_manager.find_many(
        PASSWORD_ENTRIES,
        flt,
        sort=[("createdAt", -1)],
        limit=limit,
        skip=offset,
    )
    return [_entry_doc_to_out(d, entry_id=d["_id"]) for d in docs]
```

Example diff for `create_entry`:

```python
async def create_entry(
    ctx: WorkspaceContext,
    body: PasswordEntryCreate,
) -> PasswordEntryOut:
    doc = {
        "_id": new_id(),
        "created_by": ctx.uid,
        "org_id": ctx.org_id,
        "workspace_id": ctx.workspace_id,
        "owner_uid": ctx.uid,
        "encryptedData": body.encryptedData,
        "iv": body.iv,
        "createdAt": create_timestamp(),
        "updatedAt": create_timestamp(),
    }
    await safe_insert(PASSWORD_ENTRIES, doc)
    return _entry_doc_to_out(doc, entry_id=doc["_id"])
```

Apply the same transform to every service-layer function. Remove every direct read of `uid` — services should only use `ctx`.

- [ ] **Step 4: Refactor `passwords/api.py`**

Replace every `uid: str = Depends(get_current_uid)` with `ctx: WorkspaceContext = Depends(get_workspace_ctx)`, and pass `ctx` (not `uid`) to `pw_svc.*`. Example:

```python
from app.api.routes.workspaces.middleware import WorkspaceContext, get_workspace_ctx

@router.get("/entries", response_model=list[PasswordEntryOut])
async def list_entries(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
) -> list[PasswordEntryOut]:
    return await pw_svc.list_entries(ctx=ctx, limit=limit, offset=offset)
```

Note: the vault setup/lookup endpoints (`/vault`, `/vault/setup`, `/vault/clear`) operate on `PASSWORD_VAULTS` which is per-user, per-workspace by the invariant. They get the same `ctx` treatment — the vault is now per `(uid, workspace_id)`. In A this is still effectively per-uid because every user has exactly one workspace.

- [ ] **Step 5: Run test to verify it passes**

```bash
pytest apps/backend/tests/test_workspace_invariant.py -v
```

Expected: PASS.

- [ ] **Step 6: Run the full passwords suite to confirm no regressions**

```bash
pytest apps/backend/tests/ -k password -v
```

Expected: PASS for all existing password tests (some may need updating to construct a `WorkspaceContext` instead of a bare uid; if so, update them in this same commit).

- [ ] **Step 7: Commit**

```bash
git add apps/backend/app/api/routes/passwords/api.py \
        apps/backend/app/api/routes/passwords/services.py \
        apps/backend/tests/test_workspace_invariant.py \
        apps/backend/tests/  # any modified existing password tests
git commit -m "refactor(passwords): scope queries by workspace context"
```

---

## Phase 4 — Parallel scoped-route refactors

The following 14 tasks all follow the **exact same pattern** as Task 6. They are dispatched in parallel by the subagent-driven-development workflow — each task is independent (different files, different test names) and can be reviewed independently. Each subagent gets one task's worth of context: the target route module + the reference diff from Task 6.

Each task in this phase shares the same step structure:

1. Identify the route module's collection name(s) and the existing user-id field name (`created_by`, `uid`, etc.). Inspect `apps/backend/app/api/routes/<module>/services.py` to confirm.
2. Apply the Task 6 transforms to `api.py` and `services.py` of that module:
   - Swap `Depends(get_current_uid)` for `Depends(get_workspace_ctx)` everywhere.
   - Swap service signatures from `uid: str` to `ctx: WorkspaceContext`.
   - Reads → `apply_legacy_or_filter(ctx, base_filter, user_field=<existing-field>)`.
   - Writes → stamp `org_id`, `workspace_id`, `owner_uid` on the doc.
   - Updates / deletes → `apply_workspace_filter(ctx, base_filter)` for the find filter.
3. Add a per-module isolation test in `apps/backend/tests/test_<module>_workspace_isolation.py` that constructs two Personal workspaces (uids `u1`, `u2`) and confirms `u2` cannot see `u1`'s data via either a legit ctx or a forged-workspace-id ctx.
4. Run that test → FAIL → run module's existing tests after the refactor → PASS.
5. Commit `refactor(<module>): scope queries by workspace context`.

### Task 7: `bookmarks` route

Collections: `BOOKMARKS`, `BOOKMARK_FOLDERS`. User-id field: confirm by reading `apps/backend/app/api/routes/bookmarks/services.py`.

Commit: `refactor(bookmarks): scope queries by workspace context`.

### Task 8: `tasks` route

Collections: `TASKS`, `PROJECTS`. User-id field: confirm.

Commit: `refactor(tasks): scope queries by workspace context`.

### Task 9: `notes` route

Collection: `NOTES`. User-id field: confirm.

Commit: `refactor(notes): scope queries by workspace context`.

### Task 10: `environment_manager` route

Collection: `ENV_MANAGER_ENTRIES`. User-id field: `created_by` (mirror passwords).

Commit: `refactor(environment-manager): scope queries by workspace context`.

### Task 11: `api_key_vault` route

Collection: `API_KEY_VAULT_ENTRIES`. User-id field: `created_by`.

Commit: `refactor(api-key-vault): scope queries by workspace context`.

### Task 12: `code_snippets` route

Collection: `CODE_SNIPPETS`. User-id field: confirm.

Commit: `refactor(code-snippets): scope queries by workspace context`.

### Task 13: `nosql` route

Collections: `NOSQL_CONNECTIONS`, `NOSQL_QUERY_HISTORY`. User-id field: confirm.

Commit: `refactor(nosql): scope queries by workspace context`.

### Task 14: `api_client` route

Collections: `API_CLIENT_COLLECTIONS`, `API_CLIENT_ENVIRONMENTS`, `API_CLIENT_HISTORY`, `API_CLIENT_WORKSPACES`. User-id field: confirm. (Note: `API_CLIENT_WORKSPACES` is the api-client tool's own internal "workspace" concept — unrelated to our global Workspace. It still needs `org_id`+`workspace_id` stamping because it's user data inside one of our workspaces.) Mocks (`API_CLIENT_PUBLIC_MOCKS`) — if this collection is publicly shareable / not user-scoped, leave it unstamped and document in the commit message why.

Commit: `refactor(api-client): scope queries by workspace context`.

### Task 15: `sql_client` route

Collection: `SQL_CONNECTIONS`. User-id field: confirm.

Commit: `refactor(sql-client): scope queries by workspace context`.

### Task 16: `s3_drive` route

Collection: `S3_CONNECTIONS`. User-id field: confirm.

Commit: `refactor(s3-drive): scope queries by workspace context`.

### Task 17: `redis_commander` route

Collection: `REDIS_CONNECTIONS`. User-id field: confirm.

Commit: `refactor(redis-commander): scope queries by workspace context`.

### Task 18: `url_shortener` route

Collections: `URL_LINKS`. `URL_CLICK_EVENTS` is an append-only event log — stamp it the same way (so cross-workspace analytics aggregation works in B/C) but skip the owner_uid filter on reads of it (events are written by the URL_LINK's owner anyway). User-id field: confirm.

Commit: `refactor(url-shortener): scope queries by workspace context`.

### Task 19: `json_formatter` route

Collection: `JSON_FORMATTER_DOCUMENTS`. User-id field: confirm. If this route turns out to be stateless (no per-user persistence), skip the refactor and instead add a comment in `api.py` saying "no workspace scope: stateless tool" — make this an explicit decision in the commit message.

Commit: `refactor(json-formatter): scope queries by workspace context` (or `chore(json-formatter): document stateless-tool exemption from workspace scope`).

### Task 20: `dns_lookup` route

Inspect `apps/backend/app/api/routes/dns_lookup/services.py` first. If it persists results per-user, scope them. If not (pure RPC), document the exemption like Task 19.

Commit: `refactor(dns-lookup): scope queries by workspace context` (or chore variant).

**Dispatch note for the orchestrator:** Tasks 7–20 can be dispatched in three batches of ~5 each to keep parallel review manageable. Each task touches only its module's files; merge conflicts in `api/router.py` are not in scope (the router was already updated in Task 5).

---

## Phase 5 — Frontend

### Task 21: Workspace API client + Zustand store

**Files:**
- Create: `apps/web/src/lib/workspace-api.ts`
- Create: `apps/web/src/store/workspace-store.ts`
- Create: `apps/web/src/store/__tests__/workspace-store.test.ts`

**Interfaces:**
- Consumes: existing `backendFetch` helper in `apps/web/src/lib/backend-auth.ts`.
- Produces:
  - `workspace-api.ts`: `listOrgs()`, `listWorkspaces(orgId?: string)`, `getWorkspace(id: string)`, `setActiveWorkspace(id: string)`. All return Promise of the matching Pydantic-shaped types (`Org`, `Workspace[]`, etc.).
  - `workspace-store.ts`: `useWorkspaceStore()` Zustand store as specified in the spec. Selectors `useActiveWorkspace()`, `useActiveOrg()`, `useWorkspaceById(id)`.

- [ ] **Step 1: Write failing test**

```ts
// apps/web/src/store/__tests__/workspace-store.test.ts
import { act } from "react"
import { useWorkspaceStore } from "../workspace-store"

jest.mock("@/lib/workspace-api", () => ({
  listOrgs: jest.fn(),
  listWorkspaces: jest.fn(),
  setActiveWorkspace: jest.fn(),
}))

import * as api from "@/lib/workspace-api"

describe("workspace-store", () => {
  beforeEach(() => {
    useWorkspaceStore.getState().clear()
    jest.clearAllMocks()
  })

  it("loadFromBackend hydrates orgs + workspaces + defaults active to first workspace", async () => {
    ;(api.listOrgs as jest.Mock).mockResolvedValue([
      { id: "o1", name: "MyDevTools Cloud", slug: "mydevtools-cloud", kind: "system", org_role: "member" },
    ])
    ;(api.listWorkspaces as jest.Mock).mockResolvedValue([
      { id: "w1", org_id: "o1", name: "Personal", slug: "personal-u1", is_personal: true, kind: "personal", ws_role: "admin" },
    ])

    await act(async () => {
      await useWorkspaceStore.getState().loadFromBackend()
    })

    const state = useWorkspaceStore.getState()
    expect(state.hydrated).toBe(true)
    expect(state.orgs).toHaveLength(1)
    expect(state.workspaces).toHaveLength(1)
    expect(state.activeWorkspaceId).toBe("w1")
  })

  it("setActiveWorkspace posts to backend, updates state", async () => {
    ;(api.setActiveWorkspace as jest.Mock).mockResolvedValue(undefined)
    useWorkspaceStore.setState({
      orgs: [], workspaces: [{ id: "w1" } as any, { id: "w2" } as any],
      activeWorkspaceId: "w1", hydrated: true,
    })

    await act(async () => {
      await useWorkspaceStore.getState().setActiveWorkspace("w2")
    })

    expect(api.setActiveWorkspace).toHaveBeenCalledWith("w2")
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe("w2")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter web test -- workspace-store.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `workspace-api.ts`**

```ts
// apps/web/src/lib/workspace-api.ts
import { backendFetch } from "./backend-auth"

export type Org = {
  id: string
  name: string
  slug: string
  kind: "system" | "user"
  org_role: "owner" | "admin" | "member" | "viewer"
}

export type Workspace = {
  id: string
  org_id: string
  name: string
  slug: string
  is_personal: boolean
  kind: "personal" | "shared"
  ws_role: "admin" | "developer" | "viewer"
}

const BASE = "/api/backend/workspaces-api"

export async function listOrgs(): Promise<Org[]> {
  const res = await backendFetch(`${BASE}/orgs`)
  if (!res.ok) throw new Error(`listOrgs failed (${res.status})`)
  return res.json()
}

export async function listWorkspaces(orgId?: string): Promise<Workspace[]> {
  const url = orgId ? `${BASE}/workspaces?org_id=${encodeURIComponent(orgId)}` : `${BASE}/workspaces`
  const res = await backendFetch(url)
  if (!res.ok) throw new Error(`listWorkspaces failed (${res.status})`)
  return res.json()
}

export async function getWorkspace(id: string): Promise<Workspace> {
  const res = await backendFetch(`${BASE}/workspaces/${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error(`getWorkspace failed (${res.status})`)
  return res.json()
}

export async function setActiveWorkspace(id: string): Promise<void> {
  const res = await backendFetch(`${BASE}/workspaces/active`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspace_id: id }),
  })
  if (!res.ok) throw new Error(`setActiveWorkspace failed (${res.status})`)
}
```

- [ ] **Step 4: Implement store**

```ts
// apps/web/src/store/workspace-store.ts
import { create } from "zustand"
import { listOrgs, listWorkspaces, setActiveWorkspace as setActiveAPI, type Org, type Workspace } from "@/lib/workspace-api"

type State = {
  orgs: Org[]
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  hydrated: boolean
}

type Actions = {
  loadFromBackend: () => Promise<void>
  setActiveWorkspace: (workspaceId: string) => Promise<void>
  clear: () => void
}

function pickDefault(workspaces: Workspace[]): string | null {
  const personal = workspaces.find((w) => w.is_personal)
  return personal?.id ?? workspaces[0]?.id ?? null
}

export const useWorkspaceStore = create<State & Actions>((set, get) => ({
  orgs: [],
  workspaces: [],
  activeWorkspaceId: null,
  hydrated: false,

  async loadFromBackend() {
    const [orgs, workspaces] = await Promise.all([listOrgs(), listWorkspaces()])
    const current = get().activeWorkspaceId
    const stillValid = current && workspaces.some((w) => w.id === current)
    set({
      orgs,
      workspaces,
      activeWorkspaceId: stillValid ? current : pickDefault(workspaces),
      hydrated: true,
    })
  },

  async setActiveWorkspace(workspaceId: string) {
    await setActiveAPI(workspaceId)
    set({ activeWorkspaceId: workspaceId })
  },

  clear() {
    set({ orgs: [], workspaces: [], activeWorkspaceId: null, hydrated: false })
  },
}))

export const useActiveWorkspace = (): Workspace | null => {
  return useWorkspaceStore((s) => {
    if (!s.activeWorkspaceId) return null
    return s.workspaces.find((w) => w.id === s.activeWorkspaceId) ?? null
  })
}

export const useActiveOrg = (): Org | null => {
  return useWorkspaceStore((s) => {
    const ws = s.workspaces.find((w) => w.id === s.activeWorkspaceId)
    if (!ws) return null
    return s.orgs.find((o) => o.id === ws.org_id) ?? null
  })
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm --filter web test -- workspace-store.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/workspace-api.ts \
        apps/web/src/store/workspace-store.ts \
        apps/web/src/store/__tests__/workspace-store.test.ts
git commit -m "feat(workspaces): web API client + Zustand store"
```

---

### Task 22: Workspace switcher pill + mount in NavBar

**Files:**
- Create: `apps/web/src/components/workspace-switcher.tsx`
- Create: `apps/web/src/components/__tests__/workspace-switcher.test.tsx`
- Modify: `apps/web/src/components/nav-bar.tsx`

**Interfaces:**
- Consumes: `useActiveWorkspace`, `useActiveOrg` from `workspace-store.ts`.
- Produces: `<WorkspaceSwitcher />` — display-only label pill. Renders `null` until store is hydrated.

- [ ] **Step 1: Write failing test**

```tsx
// apps/web/src/components/__tests__/workspace-switcher.test.tsx
import { render, screen } from "@testing-library/react"
import { useWorkspaceStore } from "@/store/workspace-store"
import { WorkspaceSwitcher } from "../workspace-switcher"

describe("WorkspaceSwitcher", () => {
  beforeEach(() => useWorkspaceStore.getState().clear())

  it("returns null until hydrated", () => {
    const { container } = render(<WorkspaceSwitcher />)
    expect(container.firstChild).toBeNull()
  })

  it("renders the active workspace name when hydrated", () => {
    useWorkspaceStore.setState({
      orgs: [{ id: "o1", name: "MyDevTools Cloud", slug: "mydevtools-cloud", kind: "system", org_role: "member" }],
      workspaces: [{
        id: "w1", org_id: "o1", name: "Personal", slug: "personal-u1",
        is_personal: true, kind: "personal", ws_role: "admin",
      }],
      activeWorkspaceId: "w1",
      hydrated: true,
    })
    render(<WorkspaceSwitcher />)
    expect(screen.getByText("Personal")).toBeInTheDocument()
  })

  it("does NOT render a dropdown chevron in sub-project A", () => {
    useWorkspaceStore.setState({
      orgs: [{ id: "o1", name: "MyDevTools Cloud", slug: "mydevtools-cloud", kind: "system", org_role: "member" }],
      workspaces: [{
        id: "w1", org_id: "o1", name: "Personal", slug: "personal-u1",
        is_personal: true, kind: "personal", ws_role: "admin",
      }],
      activeWorkspaceId: "w1", hydrated: true,
    })
    const { container } = render(<WorkspaceSwitcher />)
    expect(container.querySelector('[data-role="chevron"]')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter web test -- workspace-switcher.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement component**

```tsx
// apps/web/src/components/workspace-switcher.tsx
"use client"

import { Briefcase } from "lucide-react"
import { useActiveOrg, useActiveWorkspace, useWorkspaceStore } from "@/store/workspace-store"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function WorkspaceSwitcher() {
  const hydrated = useWorkspaceStore((s) => s.hydrated)
  const ws = useActiveWorkspace()
  const org = useActiveOrg()

  if (!hydrated || !ws) return null

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="hidden md:inline-flex items-center gap-1.5 h-9 rounded-lg border border-border/60 bg-muted/40 px-2.5 text-sm font-medium text-foreground/90"
            data-testid="workspace-switcher"
          >
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <span className="truncate max-w-[140px]">{ws.name}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="text-xs">
          <div className="font-medium">{ws.name}</div>
          {org && <div className="text-muted-foreground">{org.name}</div>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
```

- [ ] **Step 4: Mount in NavBar**

Modify `apps/web/src/components/nav-bar.tsx`, inside the rendered `<header>`, between the page-title block and `CommandTrigger`:

```tsx
import { WorkspaceSwitcher } from "@/components/workspace-switcher"
// ...
<CommandTrigger />
<div className="flex flex-1 shrink-0 items-center justify-end gap-2">
  <WorkspaceSwitcher />
  <ModeToggle />
</div>
```

Do this in both the "fallback header for /app routes without routeConfig match" branch and the main routeConfig-matched branch.

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm --filter web test -- workspace-switcher.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/workspace-switcher.tsx \
        apps/web/src/components/__tests__/workspace-switcher.test.tsx \
        apps/web/src/components/nav-bar.tsx
git commit -m "feat(workspaces): display-only switcher pill in navbar"
```

---

### Task 23: Pinned-tools store reshape + migrate

**Files:**
- Modify: `apps/web/src/store/pinned-tools-store.ts`
- Create: `apps/web/src/store/__tests__/pinned-tools-store.test.ts`

**Interfaces:**
- Consumes: `useWorkspaceStore` (for `activeWorkspaceId`), `normalizePinnedToolPath`, `normalizePinnedToolsList`.
- Produces:
  - New store shape `{ pinnedByWorkspace: Record<string, string[]> }`
  - `setPinnedTools(workspaceId: string, tools: string[])`
  - `togglePin(workspaceId: string, toolUrl: string)`
  - Hook `usePinnedToolsForActiveWorkspace(): string[]`
  - Persist `version` bumped to `2` with a `migrate` callback that converts the legacy shape.

- [ ] **Step 1: Write failing test**

```ts
// apps/web/src/store/__tests__/pinned-tools-store.test.ts
import { usePinnedToolsStore } from "../pinned-tools-store"

describe("pinned-tools-store v2 shape", () => {
  beforeEach(() => {
    usePinnedToolsStore.setState({ pinnedByWorkspace: {} })
  })

  it("toggle adds and removes a pin under the workspace key", () => {
    usePinnedToolsStore.getState().togglePin("w1", "/app/json-formatter")
    expect(usePinnedToolsStore.getState().pinnedByWorkspace["w1"]).toEqual(["/app/json-formatter"])
    usePinnedToolsStore.getState().togglePin("w1", "/app/json-formatter")
    expect(usePinnedToolsStore.getState().pinnedByWorkspace["w1"]).toEqual([])
  })

  it("setPinnedTools normalizes paths", () => {
    usePinnedToolsStore.getState().setPinnedTools("w1", ["json-formatter", "/app/passwords/"])
    expect(usePinnedToolsStore.getState().pinnedByWorkspace["w1"]).toEqual([
      "/app/json-formatter",
      "/app/passwords",
    ])
  })

  it("pins are isolated across workspaces", () => {
    usePinnedToolsStore.getState().togglePin("w1", "/app/passwords")
    usePinnedToolsStore.getState().togglePin("w2", "/app/notes")
    expect(usePinnedToolsStore.getState().pinnedByWorkspace["w1"]).toEqual(["/app/passwords"])
    expect(usePinnedToolsStore.getState().pinnedByWorkspace["w2"]).toEqual(["/app/notes"])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter web test -- pinned-tools-store.test.ts
```

Expected: FAIL — store shape mismatch.

- [ ] **Step 3: Reshape store**

Rewrite `apps/web/src/store/pinned-tools-store.ts` (preserve existing exports `usePinnedToolsStore`, `usePinnedToolsHydrated`):

```ts
import { useEffect, useState } from "react"
import { create } from "zustand"
import { persist } from "zustand/middleware"
import { useWorkspaceStore } from "@/store/workspace-store"
import {
  normalizePinnedToolPath,
  normalizePinnedToolsList,
} from "@/lib/pinned-tools-path"

interface PinnedToolsStore {
  pinnedByWorkspace: Record<string, string[]>
  setPinnedTools: (workspaceId: string, tools: string[]) => void
  togglePin: (workspaceId: string, toolUrl: string) => void
}

export const usePinnedToolsStore = create<PinnedToolsStore>()(
  persist(
    (set) => ({
      pinnedByWorkspace: {},
      setPinnedTools: (workspaceId, tools) =>
        set((state) => ({
          pinnedByWorkspace: {
            ...state.pinnedByWorkspace,
            [workspaceId]: normalizePinnedToolsList(tools),
          },
        })),
      togglePin: (workspaceId, toolUrl) =>
        set((state) => {
          const current = normalizePinnedToolsList(
            state.pinnedByWorkspace[workspaceId] ?? []
          )
          const key = normalizePinnedToolPath(toolUrl)
          const has = current.includes(key)
          return {
            pinnedByWorkspace: {
              ...state.pinnedByWorkspace,
              [workspaceId]: has
                ? current.filter((u) => u !== key)
                : [...current, key],
            },
          }
        }),
    }),
    {
      name: "pinned-tools-storage",
      version: 2,
      // ponytail: server backfill is source of truth; this migrate just
      // bumps shape locally. Drop the legacy branch in a follow-up PR
      // after all users have user.migrated_at set.
      migrate: (persistedState, fromVersion) => {
        const p = (persistedState ?? {}) as Record<string, unknown>
        if (fromVersion < 2 || !p) {
          return { pinnedByWorkspace: {} } as never
        }
        return {
          pinnedByWorkspace:
            (p as { pinnedByWorkspace?: Record<string, string[]> }).pinnedByWorkspace ?? {},
        } as never
      },
    }
  )
)

export function usePinnedToolsHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() =>
    usePinnedToolsStore.persist.hasHydrated()
  )
  useEffect(() => {
    if (usePinnedToolsStore.persist.hasHydrated()) {
      setHydrated(true)
      return
    }
    const unsub = usePinnedToolsStore.persist.onFinishHydration(() => setHydrated(true))
    return unsub
  }, [])
  return hydrated
}

export function usePinnedToolsForActiveWorkspace(): string[] {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  return usePinnedToolsStore(
    (s) => (activeWorkspaceId ? s.pinnedByWorkspace[activeWorkspaceId] ?? [] : [])
  )
}
```

- [ ] **Step 4: Update sidebar to use the new selector**

Modify `apps/web/src/components/sidebar/app-sidebar.tsx`:

```ts
// Replace
import { usePinnedToolsStore } from '@/store/pinned-tools-store'
// with
import { usePinnedToolsForActiveWorkspace } from '@/store/pinned-tools-store'
import { useWorkspaceStore } from '@/store/workspace-store'

// Replace
const pinnedTools = usePinnedToolsStore((s) => s.pinnedTools)
// with
const pinnedTools = usePinnedToolsForActiveWorkspace()

// And in the signout handler, after the existing clear calls, also:
const clearWorkspaceStore = useWorkspaceStore((s) => s.clear)
// ... inside handleSignOut, alongside the others:
clearWorkspaceStore()
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm --filter web test -- pinned-tools-store.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/store/pinned-tools-store.ts \
        apps/web/src/store/__tests__/pinned-tools-store.test.ts \
        apps/web/src/components/sidebar/app-sidebar.tsx
git commit -m "feat(workspaces): re-key pinned tools by workspace"
```

---

### Task 24: Pinned-tools preferences sync update

**Files:**
- Modify: `apps/web/src/components/pinned-tools-preferences-sync.tsx`

**Interfaces:**
- Consumes: `usePinnedToolsStore` (new shape), `useWorkspaceStore`, the existing backend `user_preferences` API client.

- [ ] **Step 1: Read existing implementation**

Open `apps/web/src/components/pinned-tools-preferences-sync.tsx`. It currently watches `pinnedTools: string[]` and pushes to `/api/backend/user-preferences/...`. Identify the GET and PUT/POST endpoints it uses.

- [ ] **Step 2: Update to sync the keyed map**

Replace the watched value `pinnedTools` with `pinnedByWorkspace`, and update the request payload to send `{ pinned_tools_by_workspace: { ...map } }` instead of `{ pinned_tools: [...] }`. Backend already accepts the new shape after the Task 4 backfill rewrites the user-preferences doc — extend the existing user-preferences POST/PUT handler to accept `pinned_tools_by_workspace` if it does not already.

If the existing endpoint contract requires updating, also edit the corresponding FastAPI route (`apps/backend/app/api/routes/user_preferences/*.py`) so the field is accepted. Keep the `pinned_tools` field accepted as legacy input for one release (write it to `pinned_tools_by_workspace[<active_ws_id>]` server-side) — the frontend stops sending it after this task.

- [ ] **Step 3: Hand-test**

Run `pnpm dev`, log in, pin a tool, reload, confirm the pin survives. Repeat with the dev tools showing a Mongo query against `user_preferences` to confirm the field name changed.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/pinned-tools-preferences-sync.tsx \
        apps/backend/app/api/routes/user_preferences  # if edited
git commit -m "feat(workspaces): sync pinned tools as keyed map"
```

---

### Task 25: App-boot wiring + migration banner

**Files:**
- Modify: `apps/web/src/app/dashboard/dashboard-client-layout.tsx` (or the highest-level client layout that wraps every `/app/*` page — find the actual file by inspecting current boot sequence)
- Create: `apps/web/src/components/migration-banner.tsx`

**Interfaces:**
- Consumes: `useWorkspaceStore`, `usePinnedToolsHydrated`, existing master-key bootstrapping.
- Produces:
  - Boot effect: after Firebase auth resolves AND the backend session is established, call `useWorkspaceStore.getState().loadFromBackend()` exactly once.
  - `<MigrationBanner />` — polls `/api/backend/users/me` every 2s while `user.migration_status === "pending"`. Hides itself when `user.migrated_at` is set.

- [ ] **Step 1: Add boot effect**

Inside the layout (where existing `useEffect` listens for `onAuthStateChanged`), add:

```tsx
import { useWorkspaceStore } from "@/store/workspace-store"

// ...inside the existing auth-resolved effect, after backend session is established:
await useWorkspaceStore.getState().loadFromBackend()
```

If there's no obvious "backend session established" hook, gate the load on the `useMasterKeyStore` going to `vaultStatus !== "restoring"` — at that point the backend session is alive.

- [ ] **Step 2: Implement migration banner**

```tsx
// apps/web/src/components/migration-banner.tsx
"use client"

import { useEffect, useState } from "react"
import { backendFetch } from "@/lib/backend-auth"

export function MigrationBanner() {
  const [status, setStatus] = useState<"pending" | "done" | null>(null)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    async function tick() {
      try {
        const res = await backendFetch("/api/backend/users/me")
        if (!res.ok) return
        const me = await res.json()
        if (cancelled) return
        if (me.migrated_at) {
          setStatus("done")
          return
        }
        if (me.migration_status === "pending") {
          setStatus("pending")
          timer = setTimeout(tick, 2000)
        } else {
          setStatus("done")
        }
      } catch {
        // ignore — try again next tick
        timer = setTimeout(tick, 2000)
      }
    }

    tick()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [])

  if (status !== "pending") return null
  return (
    <div className="w-full bg-primary/10 border-b border-primary/20 px-4 py-2 text-xs text-foreground/80">
      Setting up your workspace…
    </div>
  )
}
```

- [ ] **Step 3: Mount the banner**

In the same layout, render `<MigrationBanner />` just below the top navbar so it sits above the page content.

- [ ] **Step 4: Verify `/api/backend/users/me` returns `migration_status` + `migrated_at`**

Check `apps/backend/app/api/routes/users/api.py` and `schema.py`. If the `me` endpoint's response model doesn't already include those two fields, add them to the schema and the underlying repo read. Include this small change in the same task.

- [ ] **Step 5: Hand-test**

Run `pnpm dev`, log in as a fresh test user, observe the banner show for a brief moment then disappear. Check the network tab for the `/api/backend/users/me` polls.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/dashboard/dashboard-client-layout.tsx \
        apps/web/src/components/migration-banner.tsx \
        apps/backend/app/api/routes/users  # if edited
git commit -m "feat(workspaces): boot wiring + first-login migration banner"
```

---

## Phase 6 — Manual verification

### Task 26: Local dev verification + migration dry-run + isolation gate

**Files:** none — gating step.

- [ ] **Step 1: Fresh-user verification**

```bash
pnpm dev:backend &
pnpm dev
```

1. Log in as a brand-new Firebase user.
2. In `mongosh`, confirm:
   - `db.organizations.find({slug: "mydevtools-cloud"}).count()` → 1
   - `db.org_memberships.find({uid: "<new-user-uid>"}).count()` → 1
   - `db.workspaces.find({owner_uid: "<new-user-uid>", is_personal: true}).count()` → 1
   - `db.workspace_memberships.find({uid: "<new-user-uid>"}).count()` → 1
3. Confirm the navbar shows "Personal" in the switcher.
4. Pin a tool from the sidebar. Reload. Confirm the pin survives and lives at `db.user_preferences.findOne({_id: "<uid>"}).pinned_tools_by_workspace`.

- [ ] **Step 2: Existing-user backfill verification**

1. Pick an existing test user (with passwords, notes, etc. already saved) on a staging DB clone.
2. Log them in. Observe `migration_status: "pending"` briefly in `users.findOne({_id: "<uid>"})`.
3. Wait. Confirm `migrated_at` gets set.
4. Confirm every doc in PASSWORD_ENTRIES / NOTES / TASKS / BOOKMARKS for that user now has `org_id` and `workspace_id` set.
5. Open the Password Manager UI. Confirm entries decrypt correctly with the existing master key.

- [ ] **Step 3: Cross-user isolation verification**

1. Create two test users.
2. Each logs in, each saves one password.
3. In `mongosh`, confirm that `db.password_entries.find({owner_uid: "<u1>"})` returns only u1's entry and `find({owner_uid: "<u2>"})` returns only u2's.
4. With u2 logged in, manually edit cookies to forge `active_workspace=<u1's-personal-ws-id>` and refresh the password page. Expected: backend returns 403 (membership check) — no data leak.

- [ ] **Step 4: Run the full test suite**

```bash
pnpm --filter web test
pytest apps/backend/tests
```

Expected: all green.

- [ ] **Step 5: Open PR**

```bash
gh pr create --title "Workspaces foundation (sub-project A)" --body "$(cat <<'EOF'
## Summary
- Adds Organization → Workspace data model (4 new Mongo collections)
- Seeds "MyDevTools Cloud" system org; auto-creates Personal workspace per user on first login
- Stamps `org_id`/`workspace_id` on every workspace-scoped doc; lazy first-login backfill for existing users
- Refactors 15 scoped routes to use `WorkspaceContext` filter
- Adds non-interactive "Personal" pill in the navbar

Spec: docs/superpowers/specs/2026-06-26-workspaces-foundation-design.md

## Test plan
- [ ] Fresh-user login auto-provisions Personal workspace
- [ ] Existing-user backfill stamps all workspace-scoped docs
- [ ] Pinned tools survive reload, scoped per workspace
- [ ] Cross-user isolation (forged workspace_id returns 403)
- [ ] Password Manager decryption still works post-backfill
- [ ] Full backend + frontend test suites green

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review Summary

- **Spec coverage:** every spec section maps to at least one task. Data model + seed → T1. Middleware + invariant → T2 + T6. First-login + backfill → T3 + T4. Workspace routes → T5. Existing-route refactor → T6–T20. Frontend store/switcher/pinned/banner → T21–T25. Verification → T26. Encryption boundary explicitly unchanged in A and noted in T6's commit message (no crypto code touched).
- **Placeholder scan:** no TBDs, no "implement later", every code step shows the code. Two intentionally-instructive notes: T19/T20 instruct the implementer to inspect whether the route persists user data, and either apply the refactor or document the exemption — this is decision capture, not a placeholder.
- **Type consistency:** `WorkspaceContext`, `apply_workspace_filter`, `apply_legacy_or_filter` signatures match between T2's definitions and T6's usage. `OrgOut`/`WorkspaceOut` schema matches across T1 (schema), T5 (routes), T21 (frontend).
- **One commit per task:** every task ends with a single git commit producing an independently-reviewable slice.
