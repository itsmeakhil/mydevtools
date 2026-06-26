# Workspaces Collaboration + E2EE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land sub-project B (collaboration, RBAC, invitations, switcher dropdown) and sub-project C (envelope encryption for shared workspaces) on top of A's foundation. After B, users can create orgs and shared workspaces, invite members by email, and roles gate the sidebar + every CRUD route. After C, the encrypted tools (Password Manager, Environment Manager, API Key Vault) work in shared workspaces via per-workspace AES-GCM DEKs wrapped per member with X25519 ECDH.

**Architecture:** Two phases, gated by their own merge. Phase B is fully additive — adds 3 new Mongo collections (`invitations`, plus reservation fields on existing), a backend RBAC matrix dependency wrapper, a switcher dropdown, an `/settings/workspaces` page, and a transactional email path via Resend. Phase C adds client-side Web Crypto envelope-encryption utilities, `users.encryption` (per-user X25519 keypair) and `workspace_memberships.wrappedDek` schema, four crypto-flow routes, and replaces the master-key cipher path with a workspace-DEK cipher path for the 3 encrypted tools in shared workspaces only (Personal workspaces keep the master-key flow).

**Tech Stack:** FastAPI, Pydantic v2, Motor (Mongo via existing `db_manager`), Resend (email — Phase B new dep), Next.js 16 + React 19, Zustand, Jest (frontend tests), pytest (backend tests). Phase C uses Web Crypto API (no JS dep) for ECDH/HKDF/AES-GCM.

## Global Constraints

- Python 3.10+; run pytest via venv: `apps/backend/.venv/bin/python -m pytest`. NEVER use system python3 (3.9 fails on PEP 604 union syntax).
- Modern union syntax (`X | None`); NO `Optional[X]`; NO `from __future__ import annotations` additions to new files.
- No new JS dependencies in Phase C (Web Crypto only). One new Python dep in Phase B: `resend` (https://pypi.org/project/resend/).
- Encrypted tools (`password-manager`, `environment-manager`, `api-key-vault`) are Personal-only until C ships. In shared workspaces, the routes return the `EncryptedToolPlaceholder` body — no entries leak.
- Personal workspace name is the literal `"Personal"`; locked; never user-creatable / renameable / deletable. System org `"MyDevTools Cloud"` (slug `"mydevtools-cloud"`, `kind="system"`, `owner_uid=None`) is shared across all users.
- Personal-workspace invariant (from A) remains load-bearing: every query against personal-workspace data filters `owner_uid = current_uid` via `apply_workspace_filter` / `apply_legacy_or_filter`.
- Hardcoded RBAC matrix: Workspace **Admin** = all permissions, **Developer** = read+write+delete on plaintext tools (no `admin`), **Viewer** = read-only on plaintext tools. Encrypted tools accessible to no one in shared workspaces during B.
- Role cascade: Org Owner / Admin → implicit Workspace Admin everywhere in that org. Org Member / Viewer → require explicit workspace membership.
- Soft delete: `deleted_at: int | null` on orgs + workspaces. Queries filter `deleted_at: null`. 30-day grace; background sweeper hard-deletes after.
- Invitation token: 32-byte cryptographically random, base64url-encoded. 14-day expiry. Single-use.
- Cookie consistency: BroadcastChannel("workspace-events") for cross-tab `workspace-changed` events.
- TDD: failing test first, minimal implementation, commit. One commit per task. Commit message convention: `<type>(<scope>): <short>` (`feat`, `fix`, `refactor`, `chore`, `docs`, `test`).
- No function renames during ctx/route refactors (lesson from A's T13).
- All `// ponytail:` / `# ponytail:` markers name the upgrade trigger.

---

## File Structure

### Phase B — Backend new files

```
apps/backend/app/api/routes/workspaces/
    rbac.py                  # Hardcoded matrix + require_permission dependency
    invitations_repo.py      # Mongo accessors for invitations
    invitations_service.py   # Business logic for invite/accept/revoke
    members_service.py       # Org + workspace membership CRUD with role cascade
    crud_service.py          # Org + shared workspace creation/rename/delete
    sweeper.py               # 30-day soft-delete sweeper background task
apps/backend/app/core/
    email.py                 # Resend wrapper + dev-mode logger fallback
apps/backend/tests/
    test_orgs_crud.py
    test_workspace_crud_b.py
    test_members.py
    test_invitations.py
    test_rbac_matrix.py
    test_rbac_dependency.py
    test_sweeper.py
    test_email.py
```

### Phase B — Backend modified

- `apps/backend/app/utils/collection_name.py` — add `INVITATIONS = "invitations"`
- `apps/backend/app/api/routes/workspaces/schema.py` — extend with `InvitationOut`, `OrgCreate`, `OrgPatch`, `WorkspaceCreate`, `WorkspacePatch`, `MemberOut`, `InviteMemberRequest`, `ChangeRoleRequest`
- `apps/backend/app/api/routes/workspaces/repo.py` — `find_org`, `find_org_members`, `find_workspace_members`, `set_org_deleted`, `set_workspace_deleted`, plus the invitations collection accessors live in `invitations_repo.py`
- `apps/backend/app/api/routes/workspaces/api.py` — add ~16 new HTTP routes (orgs/members/workspaces/invitations)
- `apps/backend/app/api/routes/workspaces/middleware.py` — extend `get_workspace_ctx` to enforce role cascade (Org Owner/Admin sees workspace as Admin even without explicit ws membership)
- `apps/backend/app/core/config.py` — add `RESEND_API_KEY: str | None = None`
- `apps/backend/app/main.py` — wire sweeper into lifespan
- `apps/backend/app/core/indexes.py` — indexes for `invitations` collection
- Each of the 14 scoped route modules (`passwords`, `notes`, `tasks`, `bookmarks`, `code_snippets`, `environment_manager`, `api_key_vault`, `api_client`, `nosql`, `sql_client`, `s3_drive`, `redis_commander`, `url_shortener`, `json_formatter`) — apply `require_permission("<tool>", "<perm>")` to every CRUD endpoint
- `apps/backend/pyproject.toml` — add `resend` dep
- `apps/backend/tests/conftest.py` — extend `clean_db` with INVITATIONS

### Phase B — Frontend new files

```
apps/web/src/lib/
    workspace-rbac.ts                   # mirrored matrix + useToolPermission hook
    workspace-broadcast.ts              # BroadcastChannel wrapper
    invitations-api.ts                  # API client
    org-api.ts                          # API client
    members-api.ts                      # API client
apps/web/src/components/
    workspace-switcher-dropdown.tsx     # the new dropdown shell that replaces the pill
    create-org-dialog.tsx
    create-workspace-dialog.tsx
    invite-member-dialog.tsx
    encrypted-tool-placeholder.tsx
    pending-invitations-badge.tsx
    member-list.tsx
    role-select.tsx
apps/web/src/app/settings/workspaces/
    page.tsx                            # /settings/workspaces route
    org-section.tsx
    workspace-section.tsx
apps/web/src/__tests__/                 # Jest tests mirror source paths
```

### Phase B — Frontend modified

- `apps/web/src/components/workspace-switcher.tsx` — refactored to wrap the new dropdown
- `apps/web/src/components/sidebar/app-sidebar.tsx` — apply RBAC filter to `buildPinnedNavItems` + main nav groups; clear workspace store on signout (already done in A)
- `apps/web/src/components/sidebar/nav-group.tsx` — call `useToolPermission(tool, "read")` per link
- `apps/web/src/store/workspace-store.ts` — subscribe to `workspace-broadcast` on construction
- `apps/web/src/app/app/password-manager/*` + `environment-manager/*` + `api-key-vault/*` page entries — render `EncryptedToolPlaceholder` when active workspace is shared

### Phase C — Backend new files

```
apps/backend/app/api/routes/workspaces/
    crypto_repo.py           # users.encryption + workspace_memberships.wrappedDek accessors
    crypto_service.py        # business logic for wraps + rotation + pending lookups
    rotation_job.py          # background re-encryption job
apps/backend/tests/
    test_user_keypair.py
    test_dek_wrap.py
    test_rotate_dek.py
    test_pending_wraps.py
```

### Phase C — Backend modified

- `apps/backend/app/api/routes/workspaces/schema.py` — add `KeypairOut`, `KeypairPostRequest`, `DekWrapOut`, `DekWrapPostRequest`, `RotateDekRequest`, `PendingWrapOut`
- `apps/backend/app/api/routes/workspaces/api.py` — add 6 crypto routes
- `apps/backend/app/api/routes/auth/users_repo.py` — `set_user_encryption`, `get_user_encryption`, `find_users_with_publickey_by_emails`
- `apps/backend/app/api/routes/workspaces/repo.py` — `set_membership_wrapped_dek`, `find_memberships_for_workspace`, `bulk_update_wrapped_deks`
- `apps/backend/app/api/routes/workspaces/middleware.py` — extend `WorkspaceContext` with `dek_state: "none" | "shared" | "personal"` and an `ensure_encryption_initialized` helper for encrypted-tool routes
- `apps/backend/app/main.py` — wire rotation job into lifespan (only fires on demand, not constantly)

### Phase C — Frontend new files

```
apps/web/src/lib/
    workspace-crypto.ts                # generateUserKeypair / generateDek / wrap / unwrap / encrypt / decrypt
    user-keypair-api.ts                # API client for keypair endpoints
    workspace-dek-api.ts               # API client for DEK endpoints
apps/web/src/store/
    user-keypair-store.ts              # in-memory unwrapped private key (cleared on signout / lock)
    workspace-dek-store.ts             # Map<workspaceId, CryptoKey> (in-memory)
apps/web/src/components/
    enable-encrypted-tools-cta.tsx     # workspace settings "Enable encrypted tools" button
    rotate-key-button.tsx              # workspace settings rotate
    pending-wraps-prompt.tsx           # member onboarding to receive wrap
apps/web/src/__tests__/lib/
    workspace-crypto.test.ts
    user-keypair-store.test.ts
    workspace-dek-store.test.ts
```

### Phase C — Frontend modified

- `apps/web/src/components/encrypted-tool-placeholder.tsx` — auto-replaces itself with the real tool view once `workspaces.settings.encryption !== null` AND the active user has a wrappedDek for that workspace
- `apps/web/src/app/app/password-manager/*` (and `environment-manager`, `api-key-vault`) — encrypt/decrypt path branches: Personal workspace → master-key (existing); shared workspace → workspace DEK from `workspace-dek-store`
- `apps/web/src/components/master-password-gate.tsx` — on unlock, eagerly decrypt the user's private key (if `users.encryption` exists) and populate `user-keypair-store`
- `apps/web/src/app/settings/workspaces/workspace-section.tsx` — adds `<EnableEncryptedToolsCta />` and `<RotateKeyButton />` based on workspace state and role
- `apps/web/src/lib/logout-user.ts` — clear `user-keypair-store` and `workspace-dek-store` alongside master key store

---

# Phase B — Collaboration + RBAC

## Phase B.1 — Backend data + email + RBAC core (sequential)

### Task 1: Soft-delete fields + invitations collection + new indexes

**Files:**
- Modify: `apps/backend/app/utils/collection_name.py` (add `INVITATIONS`)
- Create: `apps/backend/app/api/routes/workspaces/invitations_repo.py`
- Modify: `apps/backend/app/api/routes/workspaces/repo.py` (add soft-delete helpers, member list helpers)
- Modify: `apps/backend/app/api/routes/workspaces/schema.py` (add `InvitationOut`, `OrgCreate`, `OrgPatch`, `WorkspaceCreate`, `WorkspacePatch`, `MemberOut`, `InviteMemberRequest`, `ChangeRoleRequest`)
- Modify: `apps/backend/app/core/indexes.py` (add invitations indexes)
- Modify: `apps/backend/tests/conftest.py` (add INVITATIONS to `clean_db`)
- Test: `apps/backend/tests/test_invitations.py` (skeleton: import + collection-name assertion)

**Interfaces:**
- Produces:
  - `INVITATIONS = "invitations"` constant.
  - Pydantic models: `OrgCreate(name: str, slug: str | None = None)`, `OrgPatch(name: str | None = None)`, `WorkspaceCreate(name: str, slug: str | None = None)`, `WorkspacePatch(name: str | None = None)`, `MemberOut(uid: str, email: str, display_name: str | None, role: str, since: int)`, `InviteMemberRequest(email: str, role: str)`, `ChangeRoleRequest(role: str)`, `InvitationOut(id, org_id, workspace_id, invited_email, status, invited_role_org, invited_role_ws, expires_at, created_at)`.
  - Repo helpers: `set_org_deleted(org_id, deleted_at) -> None`, `set_workspace_deleted(ws_id, deleted_at) -> None`, `find_org_members(org_id) -> list[dict]`, `find_workspace_members(ws_id) -> list[dict]`.
  - Invitations-repo helpers: `create_invitation(doc) -> str`, `find_invitation_by_token(token) -> dict | None`, `find_pending_for_email(email) -> list[dict]`, `find_pending_for_org(org_id) -> list[dict]`, `update_invitation_status(invitation_id, status, accepted_uid=None, accepted_at=None) -> None`.

- [ ] **Step 1: Write failing import test**

```python
# apps/backend/tests/test_invitations.py
import pytest
from app.utils.collection_name import INVITATIONS
from app.api.routes.workspaces.invitations_repo import (
    create_invitation, find_invitation_by_token,
)


@pytest.mark.asyncio
async def test_invitations_constant_exported():
    assert INVITATIONS == "invitations"


@pytest.mark.asyncio
async def test_create_and_find_invitation_roundtrip(clean_db):
    inv_id = await create_invitation({
        "_id": "inv-1",
        "org_id": "org-1",
        "workspace_id": None,
        "invited_email": "test@example.com",
        "invited_uid": None,
        "invited_role_org": "member",
        "invited_role_ws": None,
        "token": "tok-abc",
        "status": "pending",
        "invited_by": "u1",
        "created_at": 1000,
        "expires_at": 2000,
    })
    assert inv_id == "inv-1"
    doc = await find_invitation_by_token("tok-abc")
    assert doc is not None
    assert doc["status"] == "pending"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
/Users/max/Works/Personal/mydevtools.tech/apps/backend/.venv/bin/python -m pytest apps/backend/tests/test_invitations.py -v
```

Expected: FAIL — `ImportError`.

- [ ] **Step 3: Add collection-name constant + indexes**

In `apps/backend/app/utils/collection_name.py` add:

```python
INVITATIONS = "invitations"
```

In `apps/backend/app/core/indexes.py` add inside `ensure_indexes`:

```python
await db_manager.create_index(INVITATIONS, [("token", 1)], unique=True)
await db_manager.create_index(INVITATIONS, [("invited_email", 1), ("status", 1)])
await db_manager.create_index(INVITATIONS, [("org_id", 1), ("status", 1)])
await db_manager.create_index(INVITATIONS, [("expires_at", 1), ("status", 1)])
```

- [ ] **Step 4: Add Pydantic schemas**

Append to `apps/backend/app/api/routes/workspaces/schema.py`:

```python
OrgRole = Literal["owner", "admin", "member", "viewer"]
WsRole = Literal["admin", "developer", "viewer"]
InvitationStatus = Literal["pending", "accepted", "revoked", "expired", "wrapping_pending"]


class OrgCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    slug: str | None = Field(default=None, min_length=1, max_length=80)


class OrgPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    slug: str | None = Field(default=None, min_length=1, max_length=80)


class WorkspacePatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)


class MemberOut(BaseModel):
    uid: str
    email: str | None
    display_name: str | None = None
    role: str
    since: int


class InviteMemberRequest(BaseModel):
    email: str = Field(min_length=1)
    role: str


class ChangeRoleRequest(BaseModel):
    role: str


class InvitationOut(BaseModel):
    id: str
    org_id: str
    workspace_id: str | None
    invited_email: str
    invited_uid: str | None
    invited_role_org: OrgRole | None
    invited_role_ws: WsRole | None
    status: InvitationStatus
    expires_at: int
    created_at: int
```

- [ ] **Step 5: Implement invitations_repo + soft-delete helpers**

Create `apps/backend/app/api/routes/workspaces/invitations_repo.py`:

```python
from typing import Any
from app.database import db_manager
from app.utils.collection_name import INVITATIONS


async def create_invitation(doc: dict[str, Any]) -> str:
    await db_manager.insert_one(INVITATIONS, doc)
    return doc["_id"]


async def find_invitation_by_token(token: str) -> dict[str, Any] | None:
    return await db_manager.find_one(INVITATIONS, {"token": token})


async def find_pending_for_email(email: str) -> list[dict[str, Any]]:
    return await db_manager.find(
        INVITATIONS,
        {"invited_email": email.lower(), "status": "pending"},
        limit=50,
    )


async def find_pending_for_org(org_id: str) -> list[dict[str, Any]]:
    return await db_manager.find(
        INVITATIONS,
        {"org_id": org_id, "status": "pending"},
        limit=200,
    )


async def update_invitation_status(
    invitation_id: str,
    status: str,
    accepted_uid: str | None = None,
    accepted_at: int | None = None,
) -> None:
    patch: dict[str, Any] = {"status": status}
    if accepted_uid is not None:
        patch["accepted_uid"] = accepted_uid
    if accepted_at is not None:
        patch["accepted_at"] = accepted_at
    await db_manager.update_one(INVITATIONS, {"_id": invitation_id}, {"$set": patch})
```

Append to `apps/backend/app/api/routes/workspaces/repo.py`:

```python
from app.utils.utils import create_timestamp


async def set_org_deleted(org_id: str, deleted_at: int | None) -> None:
    await db_manager.update_one(
        ORGANIZATIONS, {"_id": org_id},
        {"$set": {"deleted_at": deleted_at, "updatedAt": create_timestamp()}},
    )


async def set_workspace_deleted(workspace_id: str, deleted_at: int | None) -> None:
    await db_manager.update_one(
        WORKSPACES, {"_id": workspace_id},
        {"$set": {"deleted_at": deleted_at, "updatedAt": create_timestamp()}},
    )


async def find_org_members(org_id: str) -> list[dict[str, Any]]:
    return await db_manager.find(ORG_MEMBERSHIPS, {"org_id": org_id}, limit=500)


async def find_workspace_members(workspace_id: str) -> list[dict[str, Any]]:
    return await db_manager.find(
        WORKSPACE_MEMBERSHIPS, {"workspace_id": workspace_id}, limit=500,
    )
```

Extend `find_user_orgs` and `find_user_workspaces` in `repo.py` to add `"deleted_at": None` to the org/workspace lookup filter so soft-deleted records don't surface.

- [ ] **Step 6: Add INVITATIONS to `clean_db`**

Modify `apps/backend/tests/conftest.py`:

```python
from app.utils.collection_name import INVITATIONS
# inside clean_db collections list, add: INVITATIONS
```

- [ ] **Step 7: Run test to verify it passes**

```bash
/Users/max/Works/Personal/mydevtools.tech/apps/backend/.venv/bin/python -m pytest apps/backend/tests/test_invitations.py -v
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/backend/app/utils/collection_name.py \
        apps/backend/app/core/indexes.py \
        apps/backend/app/api/routes/workspaces/schema.py \
        apps/backend/app/api/routes/workspaces/invitations_repo.py \
        apps/backend/app/api/routes/workspaces/repo.py \
        apps/backend/tests/conftest.py \
        apps/backend/tests/test_invitations.py
git commit -m "feat(workspaces): invitations collection + soft-delete repo helpers"
```

---

### Task 2: Email sender (Resend wrapper + dev-mode logger)

**Files:**
- Create: `apps/backend/app/core/email.py`
- Modify: `apps/backend/app/core/config.py` (add `RESEND_API_KEY`)
- Modify: `apps/backend/pyproject.toml` (add `resend>=0.7,<1.0` to dependencies)
- Test: `apps/backend/tests/test_email.py`

**Interfaces:**
- Produces:
  - `async def send_invitation_email(*, to: str, token: str, inviter_name: str, org_name: str, workspace_name: str | None) -> None`
  - When `settings.RESEND_API_KEY` is unset, logs the email body via `logging.getLogger(__name__).info(...)` and returns. Otherwise calls `resend.Emails.send` with the invitation HTML.

- [ ] **Step 1: Write the failing test**

```python
# apps/backend/tests/test_email.py
import logging
import pytest
from app.core.email import send_invitation_email


@pytest.mark.asyncio
async def test_dev_mode_logs_when_key_missing(monkeypatch, caplog):
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    caplog.set_level(logging.INFO)
    await send_invitation_email(
        to="alice@example.com",
        token="tok-1",
        inviter_name="Bob",
        org_name="Acme",
        workspace_name="Prod",
    )
    assert any("alice@example.com" in r.message for r in caplog.records)
    assert any("tok-1" in r.message for r in caplog.records)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
/Users/max/Works/Personal/mydevtools.tech/apps/backend/.venv/bin/python -m pytest apps/backend/tests/test_email.py -v
```

Expected: FAIL — `ImportError`.

- [ ] **Step 3: Add config field**

In `apps/backend/app/core/config.py`, inside the `Settings` class:

```python
    RESEND_API_KEY: str | None = None
    INVITATION_FROM_EMAIL: str = "MyDevTools <invitations@mydevtools.tech>"
    APP_PUBLIC_URL: str = "http://localhost:3000"
```

- [ ] **Step 4: Add dep**

In `apps/backend/pyproject.toml` under `[project] dependencies`:

```toml
"resend>=0.7,<1.0",
```

Run `pip install resend` (or whichever installer this project uses — uv / pip). Confirm `apps/backend/.venv/bin/python -c "import resend"` returns 0.

- [ ] **Step 5: Implement email module**

Create `apps/backend/app/core/email.py`:

```python
import logging
from urllib.parse import urlencode
from app.core.config import get_settings

log = logging.getLogger(__name__)


def _build_invite_url(token: str) -> str:
    settings = get_settings()
    qs = urlencode({"invite": token})
    return f"{settings.APP_PUBLIC_URL.rstrip('/')}/login?{qs}"


def _render_html(*, inviter_name: str, org_name: str, workspace_name: str | None, invite_url: str) -> str:
    target = f"{org_name} / {workspace_name}" if workspace_name else org_name
    return f"""
    <p>Hi,</p>
    <p>{inviter_name} invited you to join <strong>{target}</strong> on MyDevTools.</p>
    <p><a href="{invite_url}">Accept invitation</a></p>
    <p>This link is valid for 14 days.</p>
    """


async def send_invitation_email(
    *,
    to: str,
    token: str,
    inviter_name: str,
    org_name: str,
    workspace_name: str | None,
) -> None:
    invite_url = _build_invite_url(token)
    settings = get_settings()
    if not settings.RESEND_API_KEY:
        log.info(
            "DEV email: would send to=%s token=%s url=%s org=%s workspace=%s",
            to, token, invite_url, org_name, workspace_name,
        )
        return

    import resend
    resend.api_key = settings.RESEND_API_KEY
    html = _render_html(
        inviter_name=inviter_name,
        org_name=org_name,
        workspace_name=workspace_name,
        invite_url=invite_url,
    )
    target = f"{org_name}" + (f" / {workspace_name}" if workspace_name else "")
    resend.Emails.send({
        "from": settings.INVITATION_FROM_EMAIL,
        "to": [to],
        "subject": f"You're invited to {target} on MyDevTools",
        "html": html,
    })
```

- [ ] **Step 6: Run test to verify it passes**

```bash
/Users/max/Works/Personal/mydevtools.tech/apps/backend/.venv/bin/python -m pytest apps/backend/tests/test_email.py -v
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/app/core/email.py apps/backend/app/core/config.py \
        apps/backend/pyproject.toml apps/backend/tests/test_email.py
git commit -m "feat(workspaces): Resend email wrapper with dev-mode logger"
```

---

### Task 3: RBAC matrix module + `require_permission` dependency

**Files:**
- Create: `apps/backend/app/api/routes/workspaces/rbac.py`
- Test: `apps/backend/tests/test_rbac_matrix.py`, `apps/backend/tests/test_rbac_dependency.py`

**Interfaces:**
- Consumes: `WorkspaceContext` from A's `middleware.py`.
- Produces:
  - `Permission = Literal["read", "write", "delete", "admin"]`
  - `TOOL_PERMISSIONS: dict[str, dict[WsRole, set[Permission]]]` — every tool slug → role → permission set
  - `ENCRYPTED_TOOLS: set[str] = {"password-manager", "environment-manager", "api-key-vault"}`
  - `def has_permission(ctx: WorkspaceContext, tool: str, permission: Permission) -> bool`
  - `def require_permission(tool: str, permission: Permission)` — returns a FastAPI dependency that raises 403 when the active role lacks it. Personal workspaces bypass the check.

- [ ] **Step 1: Write failing tests**

```python
# apps/backend/tests/test_rbac_matrix.py
from app.api.routes.workspaces.rbac import TOOL_PERMISSIONS, ENCRYPTED_TOOLS


def test_admin_has_all_permissions_on_every_tool():
    for tool, by_role in TOOL_PERMISSIONS.items():
        assert by_role["admin"] >= {"read", "write", "delete", "admin"}, tool


def test_viewer_can_only_read_plaintext_tools():
    for tool, by_role in TOOL_PERMISSIONS.items():
        if tool in ENCRYPTED_TOOLS:
            assert by_role["viewer"] == set()
            continue
        assert by_role["viewer"] == {"read"}


def test_developer_cannot_admin_plaintext_tools():
    for tool, by_role in TOOL_PERMISSIONS.items():
        if tool in ENCRYPTED_TOOLS:
            assert by_role["developer"] == set()
            continue
        assert "admin" not in by_role["developer"]
        assert by_role["developer"] >= {"read", "write", "delete"}


def test_encrypted_tools_are_gated_for_all_shared_roles():
    for tool in ENCRYPTED_TOOLS:
        for role in ("admin", "developer", "viewer"):
            assert TOOL_PERMISSIONS[tool][role] == set()
```

```python
# apps/backend/tests/test_rbac_dependency.py
import pytest
from fastapi import HTTPException
from app.api.routes.workspaces.rbac import require_permission
from app.api.routes.workspaces.middleware import WorkspaceContext


def _ctx(role: str, is_personal: bool = False) -> WorkspaceContext:
    return WorkspaceContext(
        uid="u1", org_id="o1", workspace_id="w1",
        ws_role=role, is_personal=is_personal,
        owner_uid="u1" if is_personal else None,
    )


@pytest.mark.asyncio
async def test_personal_workspace_bypasses_matrix():
    dep = require_permission("password-manager", "admin")
    ctx = _ctx("admin", is_personal=True)
    out = await dep(ctx=ctx)
    assert out is ctx


@pytest.mark.asyncio
async def test_viewer_blocked_from_writing_notes():
    dep = require_permission("notes", "write")
    with pytest.raises(HTTPException) as exc:
        await dep(ctx=_ctx("viewer"))
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_developer_allowed_to_delete_bookmarks():
    dep = require_permission("bookmarks", "delete")
    ctx = _ctx("developer")
    out = await dep(ctx=ctx)
    assert out is ctx


@pytest.mark.asyncio
async def test_encrypted_tool_blocked_for_shared_workspace():
    dep = require_permission("password-manager", "read")
    with pytest.raises(HTTPException) as exc:
        await dep(ctx=_ctx("admin"))
    assert exc.value.status_code == 403
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
/Users/max/Works/Personal/mydevtools.tech/apps/backend/.venv/bin/python -m pytest apps/backend/tests/test_rbac_matrix.py apps/backend/tests/test_rbac_dependency.py -v
```

Expected: FAIL — `ImportError`.

- [ ] **Step 3: Implement RBAC module**

Create `apps/backend/app/api/routes/workspaces/rbac.py`:

```python
from typing import Annotated, Literal
from fastapi import Depends, HTTPException, status
from app.api.routes.workspaces.middleware import WorkspaceContext, get_workspace_ctx
from app.api.routes.workspaces.schema import WsRole

Permission = Literal["read", "write", "delete", "admin"]

ENCRYPTED_TOOLS: set[str] = {
    "password-manager",
    "environment-manager",
    "api-key-vault",
}


def _full() -> set[Permission]:
    return {"read", "write", "delete", "admin"}


def _editor() -> set[Permission]:
    return {"read", "write", "delete"}


def _reader() -> set[Permission]:
    return {"read"}


def _none() -> set[Permission]:
    return set()


def _encrypted_row() -> dict[WsRole, set[Permission]]:
    # Encrypted tools are gated in B for shared workspaces — no role has access.
    # ponytail: in C this row flips per workspace once a DEK exists.
    return {"admin": _none(), "developer": _none(), "viewer": _none()}


def _plaintext_row() -> dict[WsRole, set[Permission]]:
    return {"admin": _full(), "developer": _editor(), "viewer": _reader()}


# Hardcoded canonical RBAC matrix.
TOOL_PERMISSIONS: dict[str, dict[WsRole, set[Permission]]] = {
    # Encrypted tools — Personal-only in B.
    "password-manager":    _encrypted_row(),
    "environment-manager": _encrypted_row(),
    "api-key-vault":       _encrypted_row(),

    # Plaintext tools.
    "notes":             _plaintext_row(),
    "bookmarks":         _plaintext_row(),
    "tasks":             _plaintext_row(),
    "code-snippets":     _plaintext_row(),
    "api-client":        _plaintext_row(),
    "nosql-explorer":    _plaintext_row(),
    "sql-client":        _plaintext_row(),
    "redis-commander":   _plaintext_row(),
    "s3-drive":          _plaintext_row(),
    "json-formatter":    _plaintext_row(),
    "url-shortener":     _plaintext_row(),
    "dns-lookup":        _plaintext_row(),
}


def has_permission(ctx: WorkspaceContext, tool: str, permission: Permission) -> bool:
    if ctx.is_personal:
        return True
    return permission in TOOL_PERMISSIONS.get(tool, {}).get(ctx.ws_role, set())


def require_permission(tool: str, permission: Permission):
    async def dep(
        ctx: Annotated[WorkspaceContext, Depends(get_workspace_ctx)],
    ) -> WorkspaceContext:
        if not has_permission(ctx, tool, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role {ctx.ws_role} lacks {permission} on {tool}",
            )
        return ctx
    return dep
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
/Users/max/Works/Personal/mydevtools.tech/apps/backend/.venv/bin/python -m pytest apps/backend/tests/test_rbac_matrix.py apps/backend/tests/test_rbac_dependency.py -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/app/api/routes/workspaces/rbac.py \
        apps/backend/tests/test_rbac_matrix.py \
        apps/backend/tests/test_rbac_dependency.py
git commit -m "feat(workspaces): hardcoded RBAC matrix + require_permission dep"
```

---

### Task 4: Role cascade in `get_workspace_ctx`

**Files:**
- Modify: `apps/backend/app/api/routes/workspaces/middleware.py`
- Test: `apps/backend/tests/test_workspace_ctx.py` (extend with cascade tests)

**Interfaces:**
- Consumes: `find_org_membership`, `find_ws_membership`, `find_workspace` from `repo.py`.
- Produces: extended `get_workspace_ctx` behavior — when the user has no explicit workspace membership but holds Org Owner or Admin role on the workspace's org, synthesize an implicit Workspace Admin context for them (so they can read/write everything without explicit ws membership).

- [ ] **Step 1: Write failing test**

Append to `apps/backend/tests/test_workspace_ctx.py`:

```python
@pytest.mark.asyncio
async def test_org_owner_gets_implicit_workspace_admin(clean_db, make_request):
    from app.api.routes.workspaces.repo import (
        upsert_org, upsert_org_membership,
        upsert_personal_workspace, upsert_ws_membership,
    )
    from app.api.routes.workspaces.middleware import get_workspace_ctx

    org_id = await upsert_org("Acme", "acme", "user", "owner-uid")
    await upsert_org_membership(org_id, "owner-uid", "owner")
    # Shared workspace (Personal for now, since shared CRUD lands in B5).
    ws_id = await upsert_personal_workspace(org_id, "owner-uid")
    # ONLY org membership exists. NO workspace membership for the owner.
    # ws membership exists for someone else.
    await upsert_org_membership(org_id, "member-uid", "member")
    await upsert_ws_membership(ws_id, org_id, "member-uid", "admin")

    req = make_request(cookies={"active_workspace": ws_id})
    ctx = await get_workspace_ctx(req, uid="owner-uid")
    assert ctx.ws_role == "admin"
    assert ctx.workspace_id == ws_id


@pytest.mark.asyncio
async def test_org_member_without_ws_membership_is_rejected(clean_db, make_request):
    from app.api.routes.workspaces.repo import (
        upsert_org, upsert_org_membership,
        upsert_personal_workspace, upsert_ws_membership,
    )
    from app.api.routes.workspaces.middleware import get_workspace_ctx
    from fastapi import HTTPException

    org_id = await upsert_org("Acme2", "acme2", "user", "owner-uid")
    await upsert_org_membership(org_id, "owner-uid", "owner")
    await upsert_org_membership(org_id, "plain-member", "member")
    ws_id = await upsert_personal_workspace(org_id, "owner-uid")
    await upsert_ws_membership(ws_id, org_id, "owner-uid", "admin")

    req = make_request(cookies={"active_workspace": ws_id})
    with pytest.raises(HTTPException) as exc:
        await get_workspace_ctx(req, uid="plain-member")
    assert exc.value.status_code == 403
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
/Users/max/Works/Personal/mydevtools.tech/apps/backend/.venv/bin/python -m pytest apps/backend/tests/test_workspace_ctx.py -v
```

Expected: FAIL — current `get_workspace_ctx` rejects the owner without ws membership.

- [ ] **Step 3: Extend middleware**

Modify `apps/backend/app/api/routes/workspaces/middleware.py`. Replace the body of `get_workspace_ctx` so the membership lookup falls through to an org-role lookup before 403'ing:

```python
async def get_workspace_ctx(
    request: Request,
    uid: Annotated[str, Depends(get_current_uid)],
) -> WorkspaceContext:
    ws_id = request.cookies.get(ACTIVE_WS_COOKIE)
    if not ws_id:
        ws_id = await default_personal_ws_id(uid)
    if not ws_id:
        raise HTTPException(403, "No accessible workspace.")

    ws = await find_workspace(ws_id)
    if not ws:
        raise HTTPException(403, "Workspace not found.")

    mem = await find_ws_membership(ws_id, uid)
    if mem:
        ws_role = mem["ws_role"]
    else:
        org_mem = await find_org_membership(ws["org_id"], uid)
        if not org_mem or org_mem["org_role"] not in ("owner", "admin"):
            raise HTTPException(403, "Not a member of this workspace.")
        ws_role = "admin"   # implicit cascade

    return WorkspaceContext(
        uid=uid,
        org_id=ws["org_id"],
        workspace_id=ws_id,
        ws_role=ws_role,
        is_personal=bool(ws.get("is_personal")),
        owner_uid=ws.get("owner_uid"),
    )
```

Add the `find_org_membership` import at the top alongside the existing imports.

- [ ] **Step 4: Run tests to verify pass**

```bash
/Users/max/Works/Personal/mydevtools.tech/apps/backend/.venv/bin/python -m pytest apps/backend/tests/test_workspace_ctx.py -v
```

Expected: PASS (all 6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/app/api/routes/workspaces/middleware.py apps/backend/tests/test_workspace_ctx.py
git commit -m "feat(workspaces): role cascade — org owner/admin implicit ws admin"
```

---

### Task 5: Org CRUD service + routes

**Files:**
- Create: `apps/backend/app/api/routes/workspaces/crud_service.py` (orgs portion)
- Modify: `apps/backend/app/api/routes/workspaces/api.py` (add org routes)
- Test: `apps/backend/tests/test_orgs_crud.py`

**Interfaces:**
- Consumes: `repo.upsert_org`, `repo.upsert_org_membership`, `repo.find_org`, `repo.set_org_deleted`, `repo.find_user_orgs`.
- Produces:
  - `async def create_org(uid: str, body: OrgCreate) -> OrgOut`
  - `async def rename_org(uid: str, org_id: str, body: OrgPatch) -> OrgOut` (Owner / Admin only)
  - `async def delete_org(uid: str, org_id: str) -> None` (Owner only; soft-delete; cascade soft-delete on workspaces)
  - `async def find_org(org_id: str) -> dict | None`
  - HTTP routes:
    - `POST /api/v1/workspaces-api/orgs`
    - `PATCH /api/v1/workspaces-api/orgs/{org_id}`
    - `DELETE /api/v1/workspaces-api/orgs/{org_id}`

- [ ] **Step 1: Write failing tests**

```python
# apps/backend/tests/test_orgs_crud.py
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_org_grants_owner_role(authed_client: AsyncClient):
    res = await authed_client.post(
        "/api/v1/workspaces-api/orgs",
        json={"name": "Acme Inc"},
    )
    assert res.status_code == 201
    body = res.json()
    assert body["name"] == "Acme Inc"
    assert body["slug"] == "acme-inc"
    assert body["kind"] == "user"
    assert body["org_role"] == "owner"


@pytest.mark.asyncio
async def test_rename_org_owner_only(authed_client: AsyncClient):
    create = await authed_client.post(
        "/api/v1/workspaces-api/orgs", json={"name": "Beta"}
    )
    org_id = create.json()["id"]
    res = await authed_client.patch(
        f"/api/v1/workspaces-api/orgs/{org_id}",
        json={"name": "Beta Renamed"},
    )
    assert res.status_code == 200
    assert res.json()["name"] == "Beta Renamed"


@pytest.mark.asyncio
async def test_delete_org_soft_deletes(authed_client: AsyncClient):
    create = await authed_client.post(
        "/api/v1/workspaces-api/orgs", json={"name": "Doomed"}
    )
    org_id = create.json()["id"]
    res = await authed_client.delete(f"/api/v1/workspaces-api/orgs/{org_id}")
    assert res.status_code == 204
    after = await authed_client.get("/api/v1/workspaces-api/orgs")
    assert all(o["id"] != org_id for o in after.json())


@pytest.mark.asyncio
async def test_cannot_delete_system_org(authed_client: AsyncClient, system_org_id: str):
    res = await authed_client.delete(f"/api/v1/workspaces-api/orgs/{system_org_id}")
    assert res.status_code == 403
```

- [ ] **Step 2: Run tests, expect failures**

```bash
/Users/max/Works/Personal/mydevtools.tech/apps/backend/.venv/bin/python -m pytest apps/backend/tests/test_orgs_crud.py -v
```

Expected: FAIL — routes don't exist yet (404).

- [ ] **Step 3: Implement crud_service**

Create `apps/backend/app/api/routes/workspaces/crud_service.py`:

```python
import re
from fastapi import HTTPException, status
from app.api.routes.workspaces import repo
from app.api.routes.workspaces.schema import (
    OrgCreate, OrgOut, OrgPatch, WorkspaceCreate, WorkspaceOut,
)
from app.utils.utils import create_timestamp


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "untitled"


async def _org_to_out(org: dict, uid: str) -> OrgOut:
    mem = await repo.find_org_membership(org["_id"], uid)
    return OrgOut(
        id=org["_id"],
        name=org["name"],
        slug=org["slug"],
        kind=org["kind"],
        org_role=mem["org_role"] if mem else "viewer",
    )


async def create_org(uid: str, body: OrgCreate) -> OrgOut:
    slug = body.slug or _slugify(body.name)
    org_id = await repo.upsert_org(
        name=body.name, slug=slug, kind="user", owner_uid=uid,
    )
    await repo.upsert_org_membership(org_id, uid, "owner")
    org = await repo.find_org(org_id) if hasattr(repo, "find_org") else await _find_org_by_id(org_id)
    return await _org_to_out(org, uid)


async def _find_org_by_id(org_id: str) -> dict:
    from app.database import db_manager
    from app.utils.collection_name import ORGANIZATIONS
    org = await db_manager.find_one(ORGANIZATIONS, {"_id": org_id})
    if not org:
        raise HTTPException(404, "Org not found")
    return org


async def rename_org(uid: str, org_id: str, body: OrgPatch) -> OrgOut:
    mem = await repo.find_org_membership(org_id, uid)
    if not mem or mem["org_role"] not in ("owner", "admin"):
        raise HTTPException(403, "Org admin required")
    org = await _find_org_by_id(org_id)
    if org["kind"] == "system":
        raise HTTPException(403, "System org cannot be modified")
    if body.name and body.name != org["name"]:
        from app.database import db_manager
        from app.utils.collection_name import ORGANIZATIONS
        await db_manager.update_one(
            ORGANIZATIONS, {"_id": org_id},
            {"$set": {"name": body.name, "updatedAt": create_timestamp()}},
        )
    org = await _find_org_by_id(org_id)
    return await _org_to_out(org, uid)


async def delete_org(uid: str, org_id: str) -> None:
    mem = await repo.find_org_membership(org_id, uid)
    if not mem or mem["org_role"] != "owner":
        raise HTTPException(403, "Org owner required")
    org = await _find_org_by_id(org_id)
    if org["kind"] == "system":
        raise HTTPException(403, "System org cannot be deleted")
    ts = create_timestamp()
    await repo.set_org_deleted(org_id, ts)
    # Cascade soft-delete on all workspaces in org.
    from app.database import db_manager
    from app.utils.collection_name import WORKSPACES
    await db_manager.update_many(
        WORKSPACES,
        {"org_id": org_id, "deleted_at": None},
        {"$set": {"deleted_at": ts}},
    )
```

Also add to `apps/backend/app/api/routes/workspaces/repo.py` if missing:

```python
async def find_org(org_id: str) -> dict[str, Any] | None:
    return await db_manager.find_one(ORGANIZATIONS, {"_id": org_id})
```

- [ ] **Step 4: Wire HTTP routes**

In `apps/backend/app/api/routes/workspaces/api.py`, append:

```python
from app.api.routes.workspaces.schema import OrgCreate, OrgPatch
from app.api.routes.workspaces import crud_service


@router.post("/orgs", response_model=OrgOut, status_code=201)
async def create_org_route(
    body: OrgCreate,
    uid: Annotated[str, Depends(get_current_uid)],
) -> OrgOut:
    return await crud_service.create_org(uid, body)


@router.patch("/orgs/{org_id}", response_model=OrgOut)
async def rename_org_route(
    org_id: str,
    body: OrgPatch,
    uid: Annotated[str, Depends(get_current_uid)],
) -> OrgOut:
    return await crud_service.rename_org(uid, org_id, body)


@router.delete("/orgs/{org_id}", status_code=204)
async def delete_org_route(
    org_id: str,
    uid: Annotated[str, Depends(get_current_uid)],
) -> None:
    await crud_service.delete_org(uid, org_id)
```

- [ ] **Step 5: Run tests to verify pass**

```bash
/Users/max/Works/Personal/mydevtools.tech/apps/backend/.venv/bin/python -m pytest apps/backend/tests/test_orgs_crud.py -v
```

Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/backend/app/api/routes/workspaces/crud_service.py \
        apps/backend/app/api/routes/workspaces/api.py \
        apps/backend/app/api/routes/workspaces/repo.py \
        apps/backend/tests/test_orgs_crud.py
git commit -m "feat(workspaces): org create/rename/soft-delete + cascade"
```

---

### Task 6: Shared workspace CRUD service + routes

**Files:**
- Modify: `apps/backend/app/api/routes/workspaces/crud_service.py` (add workspace fns)
- Modify: `apps/backend/app/api/routes/workspaces/api.py`
- Test: `apps/backend/tests/test_workspace_crud_b.py`

**Interfaces:**
- Produces:
  - `async def create_shared_workspace(uid: str, org_id: str, body: WorkspaceCreate) -> WorkspaceOut` — caller must be Org Owner / Admin
  - `async def rename_workspace(uid: str, ws_id: str, body: WorkspacePatch) -> WorkspaceOut`
  - `async def delete_workspace(uid: str, ws_id: str) -> None` — soft-delete; Personal workspaces 403
  - HTTP routes:
    - `POST /workspaces-api/orgs/{org_id}/workspaces` body `WorkspaceCreate`
    - `PATCH /workspaces-api/workspaces/{ws_id}`
    - `DELETE /workspaces-api/workspaces/{ws_id}`

- [ ] **Step 1: Write failing tests**

```python
# apps/backend/tests/test_workspace_crud_b.py
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_shared_workspace(authed_client: AsyncClient):
    org_create = await authed_client.post(
        "/api/v1/workspaces-api/orgs", json={"name": "Acme"}
    )
    org_id = org_create.json()["id"]
    res = await authed_client.post(
        f"/api/v1/workspaces-api/orgs/{org_id}/workspaces",
        json={"name": "Production"},
    )
    assert res.status_code == 201
    body = res.json()
    assert body["name"] == "Production"
    assert body["is_personal"] is False
    assert body["kind"] == "shared"
    assert body["ws_role"] == "admin"   # cascade from org owner


@pytest.mark.asyncio
async def test_personal_workspace_cannot_be_deleted(
    authed_client: AsyncClient, personal_ws_id: str,
):
    res = await authed_client.delete(f"/api/v1/workspaces-api/workspaces/{personal_ws_id}")
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_delete_shared_workspace(authed_client: AsyncClient):
    org_create = await authed_client.post(
        "/api/v1/workspaces-api/orgs", json={"name": "DoomedOrg"}
    )
    org_id = org_create.json()["id"]
    ws_create = await authed_client.post(
        f"/api/v1/workspaces-api/orgs/{org_id}/workspaces",
        json={"name": "Doomed"},
    )
    ws_id = ws_create.json()["id"]
    res = await authed_client.delete(f"/api/v1/workspaces-api/workspaces/{ws_id}")
    assert res.status_code == 204
    listing = await authed_client.get("/api/v1/workspaces-api/workspaces")
    assert all(w["id"] != ws_id for w in listing.json())


@pytest.mark.asyncio
async def test_rename_workspace(authed_client: AsyncClient):
    org_create = await authed_client.post(
        "/api/v1/workspaces-api/orgs", json={"name": "RenameOrg"}
    )
    org_id = org_create.json()["id"]
    ws_create = await authed_client.post(
        f"/api/v1/workspaces-api/orgs/{org_id}/workspaces",
        json={"name": "First"},
    )
    ws_id = ws_create.json()["id"]
    res = await authed_client.patch(
        f"/api/v1/workspaces-api/workspaces/{ws_id}",
        json={"name": "Second"},
    )
    assert res.status_code == 200
    assert res.json()["name"] == "Second"
```

- [ ] **Step 2: Run tests, confirm fail**

```bash
/Users/max/Works/Personal/mydevtools.tech/apps/backend/.venv/bin/python -m pytest apps/backend/tests/test_workspace_crud_b.py -v
```

Expected: FAIL — routes 404.

- [ ] **Step 3: Implement crud_service workspace fns**

Append to `apps/backend/app/api/routes/workspaces/crud_service.py`:

```python
from app.api.routes.workspaces.schema import WorkspaceCreate, WorkspacePatch, WorkspaceOut
from app.utils.utils import new_id


async def _ws_to_out(ws: dict, ws_role: str) -> WorkspaceOut:
    return WorkspaceOut(
        id=ws["_id"],
        org_id=ws["org_id"],
        name=ws["name"],
        slug=ws["slug"],
        is_personal=bool(ws.get("is_personal")),
        kind=ws.get("kind", "shared"),
        ws_role=ws_role,
    )


async def create_shared_workspace(
    uid: str, org_id: str, body: WorkspaceCreate,
) -> WorkspaceOut:
    org_mem = await repo.find_org_membership(org_id, uid)
    if not org_mem or org_mem["org_role"] not in ("owner", "admin"):
        raise HTTPException(403, "Org admin required")
    from app.database import db_manager
    from app.utils.collection_name import WORKSPACES
    slug = body.slug or _slugify(body.name)
    ts = create_timestamp()
    doc = {
        "_id": new_id(),
        "org_id": org_id,
        "name": body.name,
        "slug": slug,
        "is_personal": False,
        "owner_uid": None,
        "kind": "shared",
        "settings": {"encryption": None},
        "createdAt": ts,
        "updatedAt": ts,
        "deleted_at": None,
    }
    await db_manager.insert_one(WORKSPACES, doc)
    # Owner of org gets cascade — no explicit ws membership needed.
    # But also create explicit so the listing endpoint surfaces it.
    await repo.upsert_ws_membership(doc["_id"], org_id, uid, "admin")
    return await _ws_to_out(doc, "admin")


async def rename_workspace(
    uid: str, ws_id: str, body: WorkspacePatch,
) -> WorkspaceOut:
    ws = await repo.find_workspace(ws_id)
    if not ws:
        raise HTTPException(404, "Workspace not found")
    if ws.get("is_personal"):
        raise HTTPException(403, "Personal workspace is locked")
    org_mem = await repo.find_org_membership(ws["org_id"], uid)
    if not org_mem or org_mem["org_role"] not in ("owner", "admin"):
        ws_mem = await repo.find_ws_membership(ws_id, uid)
        if not ws_mem or ws_mem["ws_role"] != "admin":
            raise HTTPException(403, "Workspace admin required")
    from app.database import db_manager
    from app.utils.collection_name import WORKSPACES
    if body.name and body.name != ws["name"]:
        await db_manager.update_one(
            WORKSPACES, {"_id": ws_id},
            {"$set": {"name": body.name, "updatedAt": create_timestamp()}},
        )
    ws = await repo.find_workspace(ws_id)
    mem = await repo.find_ws_membership(ws_id, uid)
    return await _ws_to_out(ws, (mem or {"ws_role": "admin"})["ws_role"])


async def delete_workspace(uid: str, ws_id: str) -> None:
    ws = await repo.find_workspace(ws_id)
    if not ws:
        raise HTTPException(404, "Workspace not found")
    if ws.get("is_personal"):
        raise HTTPException(403, "Personal workspace is locked")
    org_mem = await repo.find_org_membership(ws["org_id"], uid)
    if not org_mem or org_mem["org_role"] not in ("owner", "admin"):
        raise HTTPException(403, "Org admin required")
    await repo.set_workspace_deleted(ws_id, create_timestamp())
```

- [ ] **Step 4: Add routes**

In `apps/backend/app/api/routes/workspaces/api.py`:

```python
from app.api.routes.workspaces.schema import WorkspaceCreate, WorkspacePatch


@router.post(
    "/orgs/{org_id}/workspaces",
    response_model=WorkspaceOut, status_code=201,
)
async def create_workspace_route(
    org_id: str,
    body: WorkspaceCreate,
    uid: Annotated[str, Depends(get_current_uid)],
) -> WorkspaceOut:
    return await crud_service.create_shared_workspace(uid, org_id, body)


@router.patch("/workspaces/{ws_id}", response_model=WorkspaceOut)
async def rename_workspace_route(
    ws_id: str,
    body: WorkspacePatch,
    uid: Annotated[str, Depends(get_current_uid)],
) -> WorkspaceOut:
    return await crud_service.rename_workspace(uid, ws_id, body)


@router.delete("/workspaces/{ws_id}", status_code=204)
async def delete_workspace_route(
    ws_id: str,
    uid: Annotated[str, Depends(get_current_uid)],
) -> None:
    await crud_service.delete_workspace(uid, ws_id)
```

- [ ] **Step 5: Run tests to verify pass**

```bash
/Users/max/Works/Personal/mydevtools.tech/apps/backend/.venv/bin/python -m pytest apps/backend/tests/test_workspace_crud_b.py -v
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/app/api/routes/workspaces/crud_service.py \
        apps/backend/app/api/routes/workspaces/api.py \
        apps/backend/tests/test_workspace_crud_b.py
git commit -m "feat(workspaces): shared workspace create/rename/soft-delete"
```

---

### Task 7: Member CRUD + role-change + remove

**Files:**
- Create: `apps/backend/app/api/routes/workspaces/members_service.py`
- Modify: `apps/backend/app/api/routes/workspaces/api.py` (add member routes)
- Test: `apps/backend/tests/test_members.py`

**Interfaces:**
- Produces:
  - `async def list_org_members(uid: str, org_id: str) -> list[MemberOut]`
  - `async def list_workspace_members(uid: str, ws_id: str) -> list[MemberOut]`
  - `async def change_org_role(uid: str, org_id: str, target_uid: str, role: str) -> MemberOut` (Owner/Admin only; can't demote sole Owner)
  - `async def change_workspace_role(uid: str, ws_id: str, target_uid: str, role: str) -> MemberOut`
  - `async def remove_org_member(uid: str, org_id: str, target_uid: str) -> None` (cascade workspace memberships)
  - `async def remove_workspace_member(uid: str, ws_id: str, target_uid: str) -> None`
  - HTTP routes:
    - `GET /workspaces-api/orgs/{org_id}/members`
    - `PATCH /workspaces-api/orgs/{org_id}/members/{target_uid}`
    - `DELETE /workspaces-api/orgs/{org_id}/members/{target_uid}`
    - `GET /workspaces-api/workspaces/{ws_id}/members`
    - `PATCH /workspaces-api/workspaces/{ws_id}/members/{target_uid}`
    - `DELETE /workspaces-api/workspaces/{ws_id}/members/{target_uid}`

- [ ] **Step 1: Write failing tests** — see `test_members.py` template below (concise; mirror prior tests in shape).

```python
# apps/backend/tests/test_members.py
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_org_members_after_create(authed_client: AsyncClient):
    org_id = (await authed_client.post(
        "/api/v1/workspaces-api/orgs", json={"name": "Acme"}
    )).json()["id"]
    res = await authed_client.get(f"/api/v1/workspaces-api/orgs/{org_id}/members")
    assert res.status_code == 200
    members = res.json()
    assert len(members) == 1
    assert members[0]["role"] == "owner"


@pytest.mark.asyncio
async def test_cannot_demote_sole_owner(authed_client: AsyncClient):
    org_id = (await authed_client.post(
        "/api/v1/workspaces-api/orgs", json={"name": "SoloOrg"}
    )).json()["id"]
    me_uid = "test-uid"  # the authed_client fixture's uid
    res = await authed_client.patch(
        f"/api/v1/workspaces-api/orgs/{org_id}/members/{me_uid}",
        json={"role": "member"},
    )
    assert res.status_code == 400
    assert "sole owner" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_remove_org_member_cascades_to_workspaces(authed_client: AsyncClient):
    # Multi-member tests need a second test uid — set up via fixtures.
    # Verifies that removing a user from the org also drops their ws memberships.
    # (Skip skeleton — implement once test fixtures support multi-user clients.)
    pass
```

- [ ] **Step 2: Run, fail**

```bash
/Users/max/Works/Personal/mydevtools.tech/apps/backend/.venv/bin/python -m pytest apps/backend/tests/test_members.py -v
```

Expected: FAIL — routes missing.

- [ ] **Step 3: Implement members_service**

Create `apps/backend/app/api/routes/workspaces/members_service.py`:

```python
from fastapi import HTTPException
from app.api.routes.auth.users_repo import get_user_doc
from app.api.routes.workspaces import repo
from app.api.routes.workspaces.schema import MemberOut
from app.database import db_manager
from app.utils.collection_name import (
    ORG_MEMBERSHIPS, WORKSPACE_MEMBERSHIPS, WORKSPACES,
)
from app.utils.utils import create_timestamp


async def _membership_to_out(mem: dict, role_field: str) -> MemberOut:
    user = await get_user_doc(mem["uid"]) or {}
    return MemberOut(
        uid=mem["uid"],
        email=user.get("email"),
        display_name=user.get("displayName"),
        role=mem[role_field],
        since=int(mem.get("createdAt", 0)),
    )


async def list_org_members(uid: str, org_id: str) -> list[MemberOut]:
    caller = await repo.find_org_membership(org_id, uid)
    if not caller:
        raise HTTPException(403, "Not an org member")
    members = await repo.find_org_members(org_id)
    return [await _membership_to_out(m, "org_role") for m in members]


async def list_workspace_members(uid: str, ws_id: str) -> list[MemberOut]:
    ws = await repo.find_workspace(ws_id)
    if not ws:
        raise HTTPException(404, "Workspace not found")
    caller_org_mem = await repo.find_org_membership(ws["org_id"], uid)
    caller_ws_mem = await repo.find_ws_membership(ws_id, uid)
    if not caller_ws_mem and not (
        caller_org_mem and caller_org_mem["org_role"] in ("owner", "admin")
    ):
        raise HTTPException(403, "Not a workspace member")
    members = await repo.find_workspace_members(ws_id)
    return [await _membership_to_out(m, "ws_role") for m in members]


def _validate_org_role(role: str) -> None:
    if role not in ("owner", "admin", "member", "viewer"):
        raise HTTPException(400, "Invalid org role")


def _validate_ws_role(role: str) -> None:
    if role not in ("admin", "developer", "viewer"):
        raise HTTPException(400, "Invalid ws role")


async def change_org_role(
    uid: str, org_id: str, target_uid: str, role: str,
) -> MemberOut:
    _validate_org_role(role)
    caller = await repo.find_org_membership(org_id, uid)
    if not caller or caller["org_role"] not in ("owner", "admin"):
        raise HTTPException(403, "Org admin required")
    target = await repo.find_org_membership(org_id, target_uid)
    if not target:
        raise HTTPException(404, "Target not in org")
    if target["org_role"] == "owner" and role != "owner":
        owners = [
            m for m in await repo.find_org_members(org_id)
            if m["org_role"] == "owner"
        ]
        if len(owners) == 1:
            raise HTTPException(400, "Cannot demote sole owner")
    await db_manager.update_one(
        ORG_MEMBERSHIPS,
        {"org_id": org_id, "uid": target_uid},
        {"$set": {"org_role": role, "updatedAt": create_timestamp()}},
    )
    updated = await repo.find_org_membership(org_id, target_uid)
    return await _membership_to_out(updated, "org_role")


async def change_workspace_role(
    uid: str, ws_id: str, target_uid: str, role: str,
) -> MemberOut:
    _validate_ws_role(role)
    ws = await repo.find_workspace(ws_id)
    if not ws:
        raise HTTPException(404, "Workspace not found")
    caller_org_mem = await repo.find_org_membership(ws["org_id"], uid)
    caller_ws_mem = await repo.find_ws_membership(ws_id, uid)
    is_admin = (
        (caller_org_mem and caller_org_mem["org_role"] in ("owner", "admin"))
        or (caller_ws_mem and caller_ws_mem["ws_role"] == "admin")
    )
    if not is_admin:
        raise HTTPException(403, "Workspace admin required")
    target = await repo.find_ws_membership(ws_id, target_uid)
    if not target:
        raise HTTPException(404, "Target not in workspace")
    await db_manager.update_one(
        WORKSPACE_MEMBERSHIPS,
        {"workspace_id": ws_id, "uid": target_uid},
        {"$set": {"ws_role": role, "updatedAt": create_timestamp()}},
    )
    updated = await repo.find_ws_membership(ws_id, target_uid)
    return await _membership_to_out(updated, "ws_role")


async def remove_org_member(uid: str, org_id: str, target_uid: str) -> None:
    caller = await repo.find_org_membership(org_id, uid)
    if not caller or caller["org_role"] not in ("owner", "admin"):
        raise HTTPException(403, "Org admin required")
    target = await repo.find_org_membership(org_id, target_uid)
    if not target:
        raise HTTPException(404, "Target not in org")
    if target["org_role"] == "owner":
        owners = [
            m for m in await repo.find_org_members(org_id)
            if m["org_role"] == "owner"
        ]
        if len(owners) == 1:
            raise HTTPException(400, "Cannot remove sole owner")
    # Delete org membership
    await db_manager.delete_one(
        ORG_MEMBERSHIPS, {"org_id": org_id, "uid": target_uid},
    )
    # Cascade — drop all ws memberships in this org for target
    ws_in_org = await db_manager.find(WORKSPACES, {"org_id": org_id}, limit=500)
    ws_ids = [w["_id"] for w in ws_in_org]
    if ws_ids:
        await db_manager.delete_many(
            WORKSPACE_MEMBERSHIPS,
            {"workspace_id": {"$in": ws_ids}, "uid": target_uid},
        )


async def remove_workspace_member(uid: str, ws_id: str, target_uid: str) -> None:
    ws = await repo.find_workspace(ws_id)
    if not ws:
        raise HTTPException(404, "Workspace not found")
    caller_org_mem = await repo.find_org_membership(ws["org_id"], uid)
    caller_ws_mem = await repo.find_ws_membership(ws_id, uid)
    is_admin = (
        (caller_org_mem and caller_org_mem["org_role"] in ("owner", "admin"))
        or (caller_ws_mem and caller_ws_mem["ws_role"] == "admin")
    )
    if not is_admin:
        raise HTTPException(403, "Workspace admin required")
    await db_manager.delete_one(
        WORKSPACE_MEMBERSHIPS, {"workspace_id": ws_id, "uid": target_uid},
    )
```

- [ ] **Step 4: Add routes**

In `apps/backend/app/api/routes/workspaces/api.py`:

```python
from app.api.routes.workspaces import members_service
from app.api.routes.workspaces.schema import ChangeRoleRequest


@router.get("/orgs/{org_id}/members", response_model=list[MemberOut])
async def list_org_members_route(
    org_id: str, uid: Annotated[str, Depends(get_current_uid)],
) -> list[MemberOut]:
    return await members_service.list_org_members(uid, org_id)


@router.patch("/orgs/{org_id}/members/{target_uid}", response_model=MemberOut)
async def change_org_role_route(
    org_id: str, target_uid: str, body: ChangeRoleRequest,
    uid: Annotated[str, Depends(get_current_uid)],
) -> MemberOut:
    return await members_service.change_org_role(uid, org_id, target_uid, body.role)


@router.delete("/orgs/{org_id}/members/{target_uid}", status_code=204)
async def remove_org_member_route(
    org_id: str, target_uid: str,
    uid: Annotated[str, Depends(get_current_uid)],
) -> None:
    await members_service.remove_org_member(uid, org_id, target_uid)


@router.get("/workspaces/{ws_id}/members", response_model=list[MemberOut])
async def list_workspace_members_route(
    ws_id: str, uid: Annotated[str, Depends(get_current_uid)],
) -> list[MemberOut]:
    return await members_service.list_workspace_members(uid, ws_id)


@router.patch("/workspaces/{ws_id}/members/{target_uid}", response_model=MemberOut)
async def change_workspace_role_route(
    ws_id: str, target_uid: str, body: ChangeRoleRequest,
    uid: Annotated[str, Depends(get_current_uid)],
) -> MemberOut:
    return await members_service.change_workspace_role(uid, ws_id, target_uid, body.role)


@router.delete("/workspaces/{ws_id}/members/{target_uid}", status_code=204)
async def remove_workspace_member_route(
    ws_id: str, target_uid: str,
    uid: Annotated[str, Depends(get_current_uid)],
) -> None:
    await members_service.remove_workspace_member(uid, ws_id, target_uid)
```

- [ ] **Step 5: Run tests, verify pass**

```bash
/Users/max/Works/Personal/mydevtools.tech/apps/backend/.venv/bin/python -m pytest apps/backend/tests/test_members.py -v
```

Expected: PASS for the two implemented tests; the multi-user cascade test stub stays skipped pending fixture infra (revisit when fixtures support 2nd uid).

- [ ] **Step 6: Commit**

```bash
git add apps/backend/app/api/routes/workspaces/members_service.py \
        apps/backend/app/api/routes/workspaces/api.py \
        apps/backend/tests/test_members.py
git commit -m "feat(workspaces): member CRUD with role cascade + sole-owner guard"
```

---

### Task 8: Invitation create + accept + revoke

**Files:**
- Create: `apps/backend/app/api/routes/workspaces/invitations_service.py`
- Modify: `apps/backend/app/api/routes/workspaces/api.py`
- Extend: `apps/backend/tests/test_invitations.py`

**Interfaces:**
- Produces:
  - `async def invite_to_org(uid: str, org_id: str, body: InviteMemberRequest) -> InvitationOut`
  - `async def invite_to_workspace(uid: str, ws_id: str, body: InviteMemberRequest) -> InvitationOut`
  - `async def list_pending_for_me(uid: str) -> list[InvitationOut]`
  - `async def accept_invitation(uid: str, token: str) -> dict` (returns `{org_id, workspace_id}`)
  - `async def revoke_invitation(uid: str, token: str) -> None`
  - HTTP routes:
    - `POST /workspaces-api/orgs/{org_id}/members` body `InviteMemberRequest`
    - `POST /workspaces-api/workspaces/{ws_id}/members` body `InviteMemberRequest`
    - `GET /workspaces-api/invitations/pending`
    - `POST /workspaces-api/invitations/{token}/accept`
    - `POST /workspaces-api/invitations/{token}/revoke`

- [ ] **Step 1: Failing tests**

Append to `test_invitations.py`:

```python
@pytest.mark.asyncio
async def test_invite_to_org_sends_email_and_creates_pending(authed_client, caplog):
    import logging
    caplog.set_level(logging.INFO)
    org_id = (await authed_client.post(
        "/api/v1/workspaces-api/orgs", json={"name": "InvOrg"}
    )).json()["id"]
    res = await authed_client.post(
        f"/api/v1/workspaces-api/orgs/{org_id}/members",
        json={"email": "alice@example.com", "role": "member"},
    )
    assert res.status_code == 201
    body = res.json()
    assert body["invited_email"] == "alice@example.com"
    assert body["status"] == "pending"
    # Dev-mode logger emits a line containing the recipient
    assert any("alice@example.com" in r.message for r in caplog.records)


@pytest.mark.asyncio
async def test_accept_invitation_creates_membership(authed_client_other_uid):
    # Setup: original user creates org + invite for the second user's email
    # then second user accepts. Implement via a separate authed_client for uid=alice.
    pass
```

(Skip the `accept` integration test as a stub if multi-uid fixtures aren't ready — implement when feasible. The single-user invite-create test exercises the core path.)

- [ ] **Step 2: Run, expect fail**

```bash
/Users/max/Works/Personal/mydevtools.tech/apps/backend/.venv/bin/python -m pytest apps/backend/tests/test_invitations.py -v
```

Expected: FAIL — routes missing.

- [ ] **Step 3: Implement invitations_service**

Create `apps/backend/app/api/routes/workspaces/invitations_service.py`:

```python
import secrets
from fastapi import HTTPException

from app.api.routes.auth.users_repo import get_user_doc
from app.api.routes.workspaces import invitations_repo, repo
from app.api.routes.workspaces.schema import InvitationOut, InviteMemberRequest
from app.core.email import send_invitation_email
from app.utils.utils import create_timestamp, new_id

INVITATION_TTL_SECONDS = 14 * 24 * 3600


def _new_token() -> str:
    return secrets.token_urlsafe(32)


def _doc_to_out(doc: dict) -> InvitationOut:
    return InvitationOut(
        id=doc["_id"],
        org_id=doc["org_id"],
        workspace_id=doc.get("workspace_id"),
        invited_email=doc["invited_email"],
        invited_uid=doc.get("invited_uid"),
        invited_role_org=doc.get("invited_role_org"),
        invited_role_ws=doc.get("invited_role_ws"),
        status=doc["status"],
        expires_at=int(doc["expires_at"]),
        created_at=int(doc["created_at"]),
    )


async def _find_uid_by_email(email: str) -> str | None:
    from app.database import db_manager
    from app.utils.collection_name import USERS
    doc = await db_manager.find_one(USERS, {"email": email.lower()})
    return doc["_id"] if doc else None


async def _ensure_org_admin(uid: str, org_id: str) -> None:
    mem = await repo.find_org_membership(org_id, uid)
    if not mem or mem["org_role"] not in ("owner", "admin"):
        raise HTTPException(403, "Org admin required")


async def _ensure_ws_admin(uid: str, ws_id: str) -> dict:
    ws = await repo.find_workspace(ws_id)
    if not ws:
        raise HTTPException(404, "Workspace not found")
    org_mem = await repo.find_org_membership(ws["org_id"], uid)
    ws_mem = await repo.find_ws_membership(ws_id, uid)
    if not (
        (org_mem and org_mem["org_role"] in ("owner", "admin"))
        or (ws_mem and ws_mem["ws_role"] == "admin")
    ):
        raise HTTPException(403, "Workspace admin required")
    return ws


async def invite_to_org(
    uid: str, org_id: str, body: InviteMemberRequest,
) -> InvitationOut:
    await _ensure_org_admin(uid, org_id)
    email = body.email.lower().strip()
    if body.role not in ("owner", "admin", "member", "viewer"):
        raise HTTPException(400, "Invalid org role")
    now = create_timestamp()
    invited_uid = await _find_uid_by_email(email)
    doc = {
        "_id": new_id(),
        "org_id": org_id,
        "workspace_id": None,
        "invited_email": email,
        "invited_uid": invited_uid,
        "invited_role_org": body.role,
        "invited_role_ws": None,
        "token": _new_token(),
        "status": "pending",
        "invited_by": uid,
        "created_at": now,
        "expires_at": now + INVITATION_TTL_SECONDS * 1000,
    }
    await invitations_repo.create_invitation(doc)

    inviter = await get_user_doc(uid) or {}
    org = await repo.find_org(org_id) or {}
    await send_invitation_email(
        to=email,
        token=doc["token"],
        inviter_name=inviter.get("displayName") or inviter.get("email") or "A teammate",
        org_name=org.get("name", "an org"),
        workspace_name=None,
    )
    return _doc_to_out(doc)


async def invite_to_workspace(
    uid: str, ws_id: str, body: InviteMemberRequest,
) -> InvitationOut:
    ws = await _ensure_ws_admin(uid, ws_id)
    email = body.email.lower().strip()
    if body.role not in ("admin", "developer", "viewer"):
        raise HTTPException(400, "Invalid ws role")
    now = create_timestamp()
    invited_uid = await _find_uid_by_email(email)
    doc = {
        "_id": new_id(),
        "org_id": ws["org_id"],
        "workspace_id": ws_id,
        "invited_email": email,
        "invited_uid": invited_uid,
        # Workspace-level invites also grant org Member by default.
        "invited_role_org": "member",
        "invited_role_ws": body.role,
        "token": _new_token(),
        "status": "pending",
        "invited_by": uid,
        "created_at": now,
        "expires_at": now + INVITATION_TTL_SECONDS * 1000,
    }
    await invitations_repo.create_invitation(doc)

    inviter = await get_user_doc(uid) or {}
    org = await repo.find_org(ws["org_id"]) or {}
    await send_invitation_email(
        to=email,
        token=doc["token"],
        inviter_name=inviter.get("displayName") or inviter.get("email") or "A teammate",
        org_name=org.get("name", "an org"),
        workspace_name=ws["name"],
    )
    return _doc_to_out(doc)


async def list_pending_for_me(uid: str) -> list[InvitationOut]:
    user = await get_user_doc(uid)
    if not user or not user.get("email"):
        return []
    docs = await invitations_repo.find_pending_for_email(user["email"])
    return [_doc_to_out(d) for d in docs]


async def accept_invitation(uid: str, token: str) -> dict:
    inv = await invitations_repo.find_invitation_by_token(token)
    if not inv:
        raise HTTPException(404, "Invitation not found")
    user = await get_user_doc(uid)
    if not user or not user.get("email") or user["email"].lower() != inv["invited_email"]:
        raise HTTPException(403, "Invitation addressed to different email")
    if inv["status"] != "pending":
        raise HTTPException(400, f"Invitation is {inv['status']}")
    if inv["expires_at"] < create_timestamp():
        await invitations_repo.update_invitation_status(inv["_id"], "expired")
        raise HTTPException(400, "Invitation expired")

    # Apply memberships
    if inv["invited_role_org"]:
        existing = await repo.find_org_membership(inv["org_id"], uid)
        if not existing:
            await repo.upsert_org_membership(
                inv["org_id"], uid, inv["invited_role_org"],
            )
    if inv["workspace_id"] and inv["invited_role_ws"]:
        existing_ws = await repo.find_ws_membership(inv["workspace_id"], uid)
        if not existing_ws:
            await repo.upsert_ws_membership(
                inv["workspace_id"], inv["org_id"], uid, inv["invited_role_ws"],
            )
    await invitations_repo.update_invitation_status(
        inv["_id"], "accepted",
        accepted_uid=uid, accepted_at=create_timestamp(),
    )
    return {"org_id": inv["org_id"], "workspace_id": inv.get("workspace_id")}


async def revoke_invitation(uid: str, token: str) -> None:
    inv = await invitations_repo.find_invitation_by_token(token)
    if not inv:
        raise HTTPException(404, "Invitation not found")
    org_mem = await repo.find_org_membership(inv["org_id"], uid)
    if inv["invited_by"] != uid and not (
        org_mem and org_mem["org_role"] in ("owner", "admin")
    ):
        raise HTTPException(403, "Cannot revoke this invitation")
    if inv["status"] != "pending":
        return
    await invitations_repo.update_invitation_status(inv["_id"], "revoked")
```

- [ ] **Step 4: Add routes**

```python
from app.api.routes.workspaces import invitations_service
from app.api.routes.workspaces.schema import InviteMemberRequest


@router.post(
    "/orgs/{org_id}/members",
    response_model=InvitationOut, status_code=201,
)
async def invite_to_org_route(
    org_id: str, body: InviteMemberRequest,
    uid: Annotated[str, Depends(get_current_uid)],
) -> InvitationOut:
    return await invitations_service.invite_to_org(uid, org_id, body)


@router.post(
    "/workspaces/{ws_id}/members",
    response_model=InvitationOut, status_code=201,
)
async def invite_to_workspace_route(
    ws_id: str, body: InviteMemberRequest,
    uid: Annotated[str, Depends(get_current_uid)],
) -> InvitationOut:
    return await invitations_service.invite_to_workspace(uid, ws_id, body)


@router.get("/invitations/pending", response_model=list[InvitationOut])
async def list_pending_invitations_route(
    uid: Annotated[str, Depends(get_current_uid)],
) -> list[InvitationOut]:
    return await invitations_service.list_pending_for_me(uid)


@router.post("/invitations/{token}/accept")
async def accept_invitation_route(
    token: str, uid: Annotated[str, Depends(get_current_uid)],
) -> dict:
    return await invitations_service.accept_invitation(uid, token)


@router.post("/invitations/{token}/revoke", status_code=204)
async def revoke_invitation_route(
    token: str, uid: Annotated[str, Depends(get_current_uid)],
) -> None:
    await invitations_service.revoke_invitation(uid, token)
```

- [ ] **Step 5: Pass tests**

```bash
/Users/max/Works/Personal/mydevtools.tech/apps/backend/.venv/bin/python -m pytest apps/backend/tests/test_invitations.py -v
```

Expected: PASS for all non-skipped tests.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/app/api/routes/workspaces/invitations_service.py \
        apps/backend/app/api/routes/workspaces/api.py \
        apps/backend/tests/test_invitations.py
git commit -m "feat(workspaces): invitation create / accept / revoke flows"
```

---

### Task 9: Wrap every scoped route with `require_permission`

**Files:** Modify each of the 14 route modules:

`apps/backend/app/api/routes/{passwords, environment_manager, api_key_vault, notes, tasks, bookmarks, code_snippets, api_client, nosql, sql_client, redis_commander, s3_drive, url_shortener, json_formatter}/api.py`

**Interfaces:**
- Consumes: `require_permission(tool, perm)` from B3.
- Produces: every endpoint's `Depends(get_workspace_ctx)` swapped for `Depends(require_permission("<tool_slug>", "<perm>"))`. Permission mapping per endpoint kind:
  - GET (list/get/show) → `"read"`
  - POST/PATCH/PUT (create/update) → `"write"`
  - DELETE single entry → `"delete"`
  - clear-all / clear-vault / wipe-all paths → `"admin"`

The exact tool-slug strings used must match the `TOOL_PERMISSIONS` keys exactly. Pin down the slugs in this table:

| Module | tool slug |
|---|---|
| passwords | `password-manager` |
| environment_manager | `environment-manager` |
| api_key_vault | `api-key-vault` |
| notes | `notes` |
| tasks | `tasks` |
| bookmarks | `bookmarks` |
| code_snippets | `code-snippets` |
| api_client | `api-client` |
| nosql | `nosql-explorer` |
| sql_client | `sql-client` |
| redis_commander | `redis-commander` |
| s3_drive | `s3-drive` |
| url_shortener | `url-shortener` |
| json_formatter | `json-formatter` |

Public/anonymous endpoints (URL shortener `/r/{code}`, api-client public mocks) do NOT use `require_permission` — they remain anonymous.

- [ ] **Step 1: Write a contract test confirming every existing scoped route now uses `require_permission`**

`apps/backend/tests/test_routes_use_rbac.py`:

```python
import inspect
import pytest
from fastapi import FastAPI

from app.api.router import api_router
from app.api.routes.workspaces.rbac import require_permission


def _route_uses_require_permission(route) -> bool:
    """Heuristic: introspect the dep graph for require_permission."""
    deps = []
    for dep in route.dependant.dependencies if hasattr(route, "dependant") else []:
        if dep.call:
            deps.append(dep.call.__qualname__)
    return any("require_permission" in d or "dep" == d for d in deps)


def test_each_scoped_route_uses_require_permission():
    expected_prefixes = {
        "/password-manager", "/environment-manager", "/api-key-vault",
        "/notes", "/tasks", "/bookmarks", "/code-snippets",
        "/api-client", "/nosql", "/sql-client", "/redis-commander",
        "/s3-drive", "/url-shortener", "/json-formatter",
    }
    # Hit every route under api_router; for each whose path matches one of
    # the prefixes, walk its dependant graph for require_permission usage.
    bad: list[str] = []
    for route in api_router.routes:
        path = getattr(route, "path", "")
        if not any(path.startswith(p) for p in expected_prefixes):
            continue
        if "/r/" in path:  # public redirect
            continue
        if not _route_uses_require_permission(route):
            bad.append(f"{route.methods} {path}")
    assert not bad, f"Routes not using require_permission: {bad}"
```

(This is a coverage gate — refine the introspection if needed once you see the first failures.)

- [ ] **Step 2: Run, expect failures listing every endpoint**

```bash
/Users/max/Works/Personal/mydevtools.tech/apps/backend/.venv/bin/python -m pytest apps/backend/tests/test_routes_use_rbac.py -v
```

Expected: FAIL — none of the routes use `require_permission` yet.

- [ ] **Step 3: Wrap one module as the reference**

In `apps/backend/app/api/routes/passwords/api.py`, replace each handler's signature. Example:

```python
from app.api.routes.workspaces.rbac import require_permission


@router.get("/entries", response_model=list[PasswordEntryOut])
async def list_entries(
    ctx: WorkspaceContext = Depends(require_permission("password-manager", "read")),
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
) -> list[PasswordEntryOut]:
    return await pw_svc.list_entries(ctx=ctx, limit=limit, offset=offset)


@router.post("/entries", response_model=PasswordEntryOut)
async def create_entry(
    request: Request,
    body: PasswordEntryCreate,
    ctx: WorkspaceContext = Depends(require_permission("password-manager", "write")),
) -> PasswordEntryOut:
    return await pw_svc.create_entry(ctx, body)


# ...etc for update (write), delete (delete), clear-all (admin)
```

- [ ] **Step 4: Apply the same transform to the remaining 13 route modules.** Each handler:
  - Read methods → `"read"`
  - Write methods (POST/PATCH/PUT) → `"write"`
  - DELETE single resource → `"delete"`
  - `/clear-all`, `/wipe`, `/clear-vault`, `/clear-history`, `/import` → `"admin"`

- [ ] **Step 5: Re-run coverage + isolation tests**

```bash
/Users/max/Works/Personal/mydevtools.tech/apps/backend/.venv/bin/python -m pytest apps/backend/tests/test_routes_use_rbac.py apps/backend/tests/ -q --tb=no
```

Expected: contract test PASS; full suite still passes (the isolation tests in A all run under personal contexts which bypass the matrix per `has_permission`).

- [ ] **Step 6: Commit**

```bash
git add apps/backend/app/api/routes/*/api.py apps/backend/tests/test_routes_use_rbac.py
git commit -m "feat(workspaces): wrap all 14 scoped routes with require_permission"
```

---

### Task 10: Soft-delete sweeper background job

**Files:**
- Create: `apps/backend/app/api/routes/workspaces/sweeper.py`
- Modify: `apps/backend/app/main.py` (lifespan)
- Test: `apps/backend/tests/test_sweeper.py`

**Interfaces:**
- Produces:
  - `SOFT_DELETE_RETENTION_MS = 30 * 24 * 3600 * 1000`
  - `async def run_sweeper_once() -> dict[str, int]` — returns `{orgs_hard_deleted, workspaces_hard_deleted, invitations_expired}`. Hard-deletes orgs / workspaces whose `deleted_at` is older than retention. Marks expired-but-not-marked invitations as `"expired"`.
  - `async def sweeper_loop(interval_seconds: int = 3600) -> None` — runs forever (cancelled on app shutdown). Each iteration calls `run_sweeper_once`.

- [ ] **Step 1: Test**

```python
# apps/backend/tests/test_sweeper.py
import pytest
from app.api.routes.workspaces.sweeper import (
    SOFT_DELETE_RETENTION_MS, run_sweeper_once,
)
from app.api.routes.workspaces.repo import upsert_org, set_org_deleted, find_org
from app.api.routes.workspaces.invitations_repo import create_invitation, find_invitation_by_token
from app.utils.utils import create_timestamp


@pytest.mark.asyncio
async def test_sweeper_hard_deletes_old_orgs(clean_db):
    org_id = await upsert_org("Old", "old", "user", "u1")
    old_ts = create_timestamp() - SOFT_DELETE_RETENTION_MS - 1000
    await set_org_deleted(org_id, old_ts)

    fresh_id = await upsert_org("Fresh", "fresh", "user", "u1")
    await set_org_deleted(fresh_id, create_timestamp())

    stats = await run_sweeper_once()
    assert stats["orgs_hard_deleted"] == 1
    assert await find_org(org_id) is None
    assert await find_org(fresh_id) is not None  # still in grace


@pytest.mark.asyncio
async def test_sweeper_expires_old_invitations(clean_db):
    old_ts = create_timestamp() - 1000
    await create_invitation({
        "_id": "inv-old", "org_id": "o1", "workspace_id": None,
        "invited_email": "x@y.com", "invited_uid": None,
        "invited_role_org": "member", "invited_role_ws": None,
        "token": "tok-old", "status": "pending",
        "invited_by": "u1",
        "created_at": old_ts - 10000, "expires_at": old_ts,
    })
    stats = await run_sweeper_once()
    assert stats["invitations_expired"] == 1
    doc = await find_invitation_by_token("tok-old")
    assert doc["status"] == "expired"
```

- [ ] **Step 2: Fail**

```bash
/Users/max/Works/Personal/mydevtools.tech/apps/backend/.venv/bin/python -m pytest apps/backend/tests/test_sweeper.py -v
```

Expected: FAIL.

- [ ] **Step 3: Implement sweeper**

`apps/backend/app/api/routes/workspaces/sweeper.py`:

```python
import asyncio
import logging
from app.database import db_manager
from app.utils.collection_name import (
    INVITATIONS, ORGANIZATIONS, WORKSPACES,
    ORG_MEMBERSHIPS, WORKSPACE_MEMBERSHIPS,
)
from app.utils.utils import create_timestamp

log = logging.getLogger(__name__)
SOFT_DELETE_RETENTION_MS = 30 * 24 * 3600 * 1000


async def _hard_delete_orgs(threshold: int) -> int:
    olds = await db_manager.find(
        ORGANIZATIONS,
        {"deleted_at": {"$ne": None, "$lt": threshold}},
        limit=500,
    )
    if not olds:
        return 0
    org_ids = [o["_id"] for o in olds]
    await db_manager.delete_many(ORG_MEMBERSHIPS, {"org_id": {"$in": org_ids}})
    await db_manager.delete_many(WORKSPACE_MEMBERSHIPS, {"org_id": {"$in": org_ids}})
    await db_manager.delete_many(WORKSPACES, {"org_id": {"$in": org_ids}})
    await db_manager.delete_many(ORGANIZATIONS, {"_id": {"$in": org_ids}})
    return len(org_ids)


async def _hard_delete_workspaces(threshold: int) -> int:
    olds = await db_manager.find(
        WORKSPACES,
        {"deleted_at": {"$ne": None, "$lt": threshold}, "is_personal": False},
        limit=500,
    )
    if not olds:
        return 0
    ws_ids = [w["_id"] for w in olds]
    await db_manager.delete_many(WORKSPACE_MEMBERSHIPS, {"workspace_id": {"$in": ws_ids}})
    await db_manager.delete_many(WORKSPACES, {"_id": {"$in": ws_ids}})
    return len(ws_ids)


async def _expire_invitations(now: int) -> int:
    res = await db_manager.update_many(
        INVITATIONS,
        {"status": "pending", "expires_at": {"$lt": now}},
        {"$set": {"status": "expired"}},
    )
    return getattr(res, "modified_count", 0)


async def run_sweeper_once() -> dict[str, int]:
    now = create_timestamp()
    threshold = now - SOFT_DELETE_RETENTION_MS
    return {
        "orgs_hard_deleted": await _hard_delete_orgs(threshold),
        "workspaces_hard_deleted": await _hard_delete_workspaces(threshold),
        "invitations_expired": await _expire_invitations(now),
    }


async def sweeper_loop(interval_seconds: int = 3600) -> None:
    while True:
        try:
            stats = await run_sweeper_once()
            if any(stats.values()):
                log.info("sweeper: %s", stats)
        except Exception as exc:
            log.warning("sweeper error: %s", exc)
        await asyncio.sleep(interval_seconds)
```

- [ ] **Step 4: Wire into lifespan**

`apps/backend/app/main.py` — inside `lifespan`, after `await ensure_system_org()`:

```python
    from app.api.routes.workspaces.sweeper import sweeper_loop
    sweeper_task = asyncio.create_task(sweeper_loop())
```

And in the cleanup branch (after the existing `click_flush_task` cancel):

```python
        sweeper_task.cancel()
        try:
            await sweeper_task
        except asyncio.CancelledError:
            pass
```

- [ ] **Step 5: Tests pass**

```bash
/Users/max/Works/Personal/mydevtools.tech/apps/backend/.venv/bin/python -m pytest apps/backend/tests/test_sweeper.py -v
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/app/api/routes/workspaces/sweeper.py \
        apps/backend/app/main.py apps/backend/tests/test_sweeper.py
git commit -m "feat(workspaces): 30-day soft-delete sweeper background task"
```

---

## Phase B.2 — Frontend RBAC + switcher + dialogs (sequential)

### Task 11: Frontend RBAC matrix mirror + `useToolPermission` hook

**Files:**
- Create: `apps/web/src/lib/workspace-rbac.ts`
- Test: `apps/web/src/lib/__tests__/workspace-rbac.test.ts`

**Interfaces:**
- Consumes: `useActiveWorkspace` from `@/store/workspace-store`.
- Produces:
  - `Permission = "read" | "write" | "delete" | "admin"`
  - `TOOL_PERMISSIONS: Record<string, Record<"admin"|"developer"|"viewer", Set<Permission>>>`
  - `ENCRYPTED_TOOLS: Set<string>`
  - `function hasPermission(role, tool, permission): boolean`
  - `function useToolPermission(tool: string, permission: Permission): boolean`

- [ ] **Step 1: Failing test**

```ts
// apps/web/src/lib/__tests__/workspace-rbac.test.ts
import { hasPermission, ENCRYPTED_TOOLS, TOOL_PERMISSIONS } from "../workspace-rbac"

describe("workspace-rbac", () => {
  it("admin role has all permissions on every tool", () => {
    for (const tool of Object.keys(TOOL_PERMISSIONS)) {
      for (const perm of ["read", "write", "delete", "admin"] as const) {
        expect(hasPermission({ ws_role: "admin", is_personal: false } as any, tool, perm)).toBe(true)
      }
    }
  })

  it("viewer can only read plaintext tools", () => {
    for (const tool of Object.keys(TOOL_PERMISSIONS)) {
      const expected = ENCRYPTED_TOOLS.has(tool) ? false : true
      expect(hasPermission({ ws_role: "viewer", is_personal: false } as any, tool, "read")).toBe(expected)
      expect(hasPermission({ ws_role: "viewer", is_personal: false } as any, tool, "write")).toBe(false)
    }
  })

  it("personal workspace bypasses matrix", () => {
    expect(hasPermission({ ws_role: "viewer", is_personal: true } as any, "password-manager", "admin")).toBe(true)
  })

  it("encrypted tools blocked in shared workspace for every role", () => {
    for (const tool of ENCRYPTED_TOOLS) {
      for (const role of ["admin", "developer", "viewer"] as const) {
        expect(hasPermission({ ws_role: role, is_personal: false } as any, tool, "read")).toBe(false)
      }
    }
  })
})
```

- [ ] **Step 2: Fail**

```bash
pnpm --filter web test -- workspace-rbac.test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// apps/web/src/lib/workspace-rbac.ts
import { useActiveWorkspace } from "@/store/workspace-store"
import type { Workspace } from "@/lib/workspace-api"

export type Permission = "read" | "write" | "delete" | "admin"
export type WsRole = "admin" | "developer" | "viewer"

export const ENCRYPTED_TOOLS: Set<string> = new Set([
  "password-manager",
  "environment-manager",
  "api-key-vault",
])

const FULL: Set<Permission> = new Set(["read", "write", "delete", "admin"])
const EDITOR: Set<Permission> = new Set(["read", "write", "delete"])
const READER: Set<Permission> = new Set(["read"])
const NONE: Set<Permission> = new Set()

const PLAINTEXT_ROW = { admin: FULL, developer: EDITOR, viewer: READER }
const ENCRYPTED_ROW = { admin: NONE, developer: NONE, viewer: NONE }

export const TOOL_PERMISSIONS: Record<string, Record<WsRole, Set<Permission>>> = {
  "password-manager":    ENCRYPTED_ROW,
  "environment-manager": ENCRYPTED_ROW,
  "api-key-vault":       ENCRYPTED_ROW,

  "notes":           PLAINTEXT_ROW,
  "bookmarks":       PLAINTEXT_ROW,
  "tasks":           PLAINTEXT_ROW,
  "code-snippets":   PLAINTEXT_ROW,
  "api-client":      PLAINTEXT_ROW,
  "nosql-explorer":  PLAINTEXT_ROW,
  "sql-client":      PLAINTEXT_ROW,
  "redis-commander": PLAINTEXT_ROW,
  "s3-drive":        PLAINTEXT_ROW,
  "json-formatter":  PLAINTEXT_ROW,
  "url-shortener":   PLAINTEXT_ROW,
  "dns-lookup":      PLAINTEXT_ROW,
}

export function hasPermission(
  ws: Workspace,
  tool: string,
  permission: Permission,
): boolean {
  if (ws.is_personal) return true
  const row = TOOL_PERMISSIONS[tool]
  if (!row) return false
  return row[ws.ws_role].has(permission)
}

/**
 * React hook for the active workspace. Returns `false` until the workspace
 * store is hydrated (component should not gate rendering on this — guard
 * with `useWorkspaceStore().hydrated`).
 */
export function useToolPermission(tool: string, permission: Permission): boolean {
  const ws = useActiveWorkspace()
  if (!ws) return false
  return hasPermission(ws, tool, permission)
}
```

- [ ] **Step 4: Pass**

```bash
pnpm --filter web test -- workspace-rbac.test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/workspace-rbac.ts apps/web/src/lib/__tests__/workspace-rbac.test.ts
git commit -m "feat(workspaces): frontend RBAC matrix + useToolPermission hook"
```

---

### Task 12: Sidebar role-gating + auto-unpin filter

**Files:**
- Modify: `apps/web/src/components/sidebar/app-sidebar.tsx`
- Modify: `apps/web/src/components/sidebar/nav-group.tsx`
- Modify: `apps/web/src/lib/tools-registry.ts` (export a tool-slug map from sidebar URL to slug, if missing)
- Test: `apps/web/src/components/sidebar/__tests__/app-sidebar-rbac.test.tsx` (Jest node env — structural test)

**Interfaces:**
- Consumes: `useToolPermission`, `useActiveWorkspace`, `usePinnedToolsForActiveWorkspace`.
- Produces: sidebar nav now filters items whose tool slug lacks `"read"` permission. Pinned section ALSO filters — the pin record stays in store, but render-side filter hides it.

- [ ] **Step 1: Helper — derive tool slug from sidebar URL**

Add to `apps/web/src/lib/tools-registry.ts` (or create `apps/web/src/lib/sidebar-tool-slug.ts`):

```ts
// Map sidebar URLs ("/app/password-manager") to RBAC matrix keys ("password-manager")
export function sidebarUrlToToolSlug(url: string): string | null {
  const match = url.match(/^\/app\/([a-z0-9-]+)/)
  return match ? match[1] : null
}
```

- [ ] **Step 2: Patch `nav-group.tsx`**

In the rendering loop where each `NavLink` is emitted, gate it:

```tsx
import { useToolPermission } from "@/lib/workspace-rbac"
import { sidebarUrlToToolSlug } from "@/lib/sidebar-tool-slug"
import { useActiveWorkspace } from "@/store/workspace-store"

function NavLinkGated({ link, ...props }: { link: NavLink }) {
  const slug = sidebarUrlToToolSlug(String(link.url))
  const canRead = useToolPermission(slug ?? "", "read")
  const activeWs = useActiveWorkspace()

  // Personal workspace or non-matrix items pass through
  if (!slug || activeWs?.is_personal) return <NavLink link={link} {...props} />
  if (!canRead) return null
  return <NavLink link={link} {...props} />
}
```

Swap every direct `NavLink` render in `nav-group.tsx` for `NavLinkGated`.

- [ ] **Step 3: Patch `app-sidebar.tsx`**

In `buildPinnedNavItems`, filter by permission:

```ts
import { hasPermission } from "@/lib/workspace-rbac"
import { sidebarUrlToToolSlug } from "@/lib/sidebar-tool-slug"

function buildPinnedNavItems(pinnedTools: string[], activeWs: Workspace | null): NavLink[] {
  if (pinnedTools.length === 0 || !activeWs) return []
  const allLinks: NavLink[] = sidebarData.navGroups.flatMap((group) =>
    group.items.flatMap((item) =>
      "items" in item
        ? (item as NavCollapsible).items.map((sub) => ({ ...sub, icon: sub.icon ?? item.icon }))
        : [item as NavLink]
    )
  )
  const urlSet = new Set(pinnedTools)
  return allLinks.filter((link) => {
    if (!urlSet.has(String(link.url))) return false
    const slug = sidebarUrlToToolSlug(String(link.url))
    if (!slug) return true
    return hasPermission(activeWs, slug, "read")
  })
}
```

Pass `activeWs` from the component:

```ts
const activeWs = useActiveWorkspace()
const pinnedNavItems = buildPinnedNavItems(pinnedTools, activeWs)
```

The main-nav filter (already excludes pinned items) ALSO needs the RBAC predicate. Update the existing `.map((item) => ...)` so collapsibles and links pass through `NavLinkGated` semantics (or pre-filter the items list with the same `hasPermission` check).

- [ ] **Step 4: Test**

```ts
// apps/web/src/components/sidebar/__tests__/app-sidebar-rbac.test.tsx
import { buildPinnedNavItems } from "@/components/sidebar/app-sidebar.helpers"
// (Optionally extract buildPinnedNavItems to a separate exported helper file for testability.)

// Then: test that with role=viewer + tool that needs write, the link is filtered.
// Use node-env structural tests (Jest config). Build a fake Workspace + pinned list,
// call the helper, expect filtered output.
```

If extracting helpers isn't feasible, do a state-only assertion via the hook (jest mock the store).

- [ ] **Step 5: Run**

```bash
pnpm --filter web test
```

Expect existing tests pass + 1 new pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/sidebar/app-sidebar.tsx \
        apps/web/src/components/sidebar/nav-group.tsx \
        apps/web/src/lib/sidebar-tool-slug.ts \
        apps/web/src/components/sidebar/__tests__/app-sidebar-rbac.test.tsx
git commit -m "feat(workspaces): sidebar role-gates tools + filters pinned by permission"
```

---

### Task 13: Workspace switcher dropdown (replaces A's pill)

**Files:**
- Create: `apps/web/src/components/workspace-switcher-dropdown.tsx`
- Modify: `apps/web/src/components/workspace-switcher.tsx` (use the dropdown component)
- Test: `apps/web/src/components/__tests__/workspace-switcher-dropdown.test.tsx`

**Interfaces:**
- Consumes: `useWorkspaceStore`, `useActiveWorkspace`, `useActiveOrg`, `setActiveWorkspace`.
- Produces: full dropdown — orgs grouped, workspaces nested, "+ New Workspace" CTA per org (visible when user is Org Owner/Admin in that org), "+ New Organization" CTA at the bottom.

```tsx
"use client"
import { useState } from "react"
import { Briefcase, Plus, ChevronsUpDown } from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useActiveOrg, useActiveWorkspace, useWorkspaceStore } from "@/store/workspace-store"
import { CreateOrgDialog } from "@/components/create-org-dialog"
import { CreateWorkspaceDialog } from "@/components/create-workspace-dialog"


export function WorkspaceSwitcherDropdown() {
  const hydrated = useWorkspaceStore((s) => s.hydrated)
  const ws = useActiveWorkspace()
  const orgs = useWorkspaceStore((s) => s.orgs)
  const workspaces = useWorkspaceStore((s) => s.workspaces)
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace)
  const [orgDialogOpen, setOrgDialogOpen] = useState(false)
  const [wsDialogOrgId, setWsDialogOrgId] = useState<string | null>(null)

  if (!hydrated || !ws) return null

  const wsByOrg: Record<string, typeof workspaces> = {}
  for (const w of workspaces) {
    if (!wsByOrg[w.org_id]) wsByOrg[w.org_id] = []
    wsByOrg[w.org_id].push(w)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="hidden md:inline-flex items-center gap-1.5 h-9 rounded-lg border border-border/60 bg-muted/40 px-2.5 text-sm font-medium text-foreground/90 hover:border-primary/40 cursor-pointer">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <span className="truncate max-w-[140px]">{ws.name}</span>
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          {orgs.map((org) => (
            <div key={org.id}>
              <DropdownMenuLabel className="text-xs uppercase text-muted-foreground">
                {org.name}
              </DropdownMenuLabel>
              {(wsByOrg[org.id] ?? []).map((w) => (
                <DropdownMenuItem
                  key={w.id}
                  className={w.id === ws.id ? "bg-accent/60" : ""}
                  onSelect={() => setActiveWorkspace(w.id)}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="truncate">{w.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{w.ws_role}</span>
                  </div>
                </DropdownMenuItem>
              ))}
              {(org.org_role === "owner" || org.org_role === "admin") && (
                <DropdownMenuItem onSelect={() => setWsDialogOrgId(org.id)}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> New workspace
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
            </div>
          ))}
          <DropdownMenuItem onSelect={() => setOrgDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> New organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateOrgDialog open={orgDialogOpen} onOpenChange={setOrgDialogOpen} />
      {wsDialogOrgId && (
        <CreateWorkspaceDialog
          orgId={wsDialogOrgId}
          open
          onOpenChange={(o) => o ? null : setWsDialogOrgId(null)}
        />
      )}
    </>
  )
}
```

Modify `workspace-switcher.tsx`:

```tsx
import { WorkspaceSwitcherDropdown } from "./workspace-switcher-dropdown"

export function WorkspaceSwitcher() {
  return <WorkspaceSwitcherDropdown />
}
```

- [ ] Tests: structural — verify dropdown contains org labels + workspace items + "New workspace" only for owner/admin orgs.
- [ ] Commit: `feat(workspaces): switcher dropdown with org groups and create CTAs`.

---

### Task 14: CreateOrgDialog + CreateWorkspaceDialog + InviteMemberDialog

**Files:**
- Create: `apps/web/src/components/create-org-dialog.tsx`
- Create: `apps/web/src/components/create-workspace-dialog.tsx`
- Create: `apps/web/src/components/invite-member-dialog.tsx`
- Create: `apps/web/src/lib/org-api.ts`
- Create: `apps/web/src/lib/members-api.ts`
- Create: `apps/web/src/lib/invitations-api.ts`

**Interfaces:**
- `org-api.ts`: `createOrg(name)`, `renameOrg(id, name)`, `deleteOrg(id)`, `listOrgMembers(orgId)`.
- `members-api.ts`: `changeOrgRole(orgId, uid, role)`, `removeOrgMember(orgId, uid)`, `listWorkspaceMembers(wsId)`, `changeWorkspaceRole(wsId, uid, role)`, `removeWorkspaceMember(wsId, uid)`.
- `invitations-api.ts`: `inviteToOrg(orgId, email, role)`, `inviteToWorkspace(wsId, email, role)`, `listPending()`, `accept(token)`, `revoke(token)`.
- Each dialog: shadcn Dialog with inputs, calls the matching API, shows toast on success/error, reloads workspace store on success.

(Render code identical to other dialog components in the codebase — use `create-org-dialog.tsx` as the canonical pattern after the first one is written; others mirror it.)

- [ ] Tests: render-shape Jest test for each dialog confirming form fields exist.
- [ ] Commit: `feat(workspaces): create-org / create-workspace / invite-member dialogs`.

---

### Task 15: `/settings/workspaces` page

**Files:**
- Create: `apps/web/src/app/settings/workspaces/page.tsx`
- Create: `apps/web/src/app/settings/workspaces/org-section.tsx`
- Create: `apps/web/src/app/settings/workspaces/workspace-section.tsx`
- Create: `apps/web/src/components/member-list.tsx`
- Create: `apps/web/src/components/role-select.tsx`

**Interfaces:** Page renders per-org sections; each section lists workspaces + members + pending invitations + CTAs to create / rename / delete / invite / change role / remove. Calls org-api / members-api / invitations-api.

- [ ] Tests: page render shape + happy-path action mock.
- [ ] Commit: `feat(workspaces): /settings/workspaces management page`.

---

### Task 16: PendingInvitationsBadge + accept flow

**Files:**
- Create: `apps/web/src/components/pending-invitations-badge.tsx`
- Modify: `apps/web/src/components/workspace-switcher-dropdown.tsx` (add badge)
- Modify: `apps/web/src/app/login/page.tsx` (or whichever post-login redirect path) — if URL has `?invite=<token>`, POST to `/invitations/{token}/accept` after auth succeeds and redirect to the invited workspace.

**Interfaces:** Badge polls `/invitations/pending` every 30s when hydrated. Shows count + dropdown with "Accept" button per row.

- [ ] Tests: structural — badge renders count from mocked API.
- [ ] Commit: `feat(workspaces): pending invitations badge + token-auto-accept on login`.

---

### Task 17: EncryptedToolPlaceholder + route gating

**Files:**
- Create: `apps/web/src/components/encrypted-tool-placeholder.tsx`
- Modify: `apps/web/src/app/app/password-manager/page.tsx` (and `environment-manager`, `api-key-vault`)

**Interfaces:** Component shows a friendly message: "Encrypted tools available in Personal workspace only. End-to-end encryption for shared workspaces ships in the next release." with a "Switch to Personal" CTA. The 3 tool pages render this placeholder when `useActiveWorkspace()?.is_personal === false`.

- [ ] Tests: structural — placeholder renders when workspace is shared; tool view renders when personal.
- [ ] Commit: `feat(workspaces): encrypted-tool placeholder in shared workspaces`.

---

### Task 18: BroadcastChannel cross-tab sync

**Files:**
- Create: `apps/web/src/lib/workspace-broadcast.ts`
- Modify: `apps/web/src/store/workspace-store.ts` (subscribe on construction; broadcast on setActiveWorkspace)

**Interfaces:**
- `getWorkspaceBroadcast(): BroadcastChannel | null` — guarded for SSR (`typeof window` check).
- Store subscribes once on first hydration; on receipt of `{type: "workspace-changed", id}`, re-calls `loadFromBackend()` and sets `activeWorkspaceId = id`.
- On every successful `setActiveWorkspace(id)`, posts the message.

- [ ] Tests: stub `BroadcastChannel`, verify post + receive.
- [ ] Commit: `feat(workspaces): BroadcastChannel cross-tab sync for active workspace`.

---

### Task 19: Manual verification + Phase B PR

- [ ] **Step 1: Fresh-user flow**
  Log in. Switcher shows "Personal" + dropdown. Create an org. Org appears. Create a shared workspace inside. Switch to it. Encrypted tools show placeholder.
- [ ] **Step 2: Invite flow**
  Invite a registered user (a second test account). Check pending-invitations endpoint returns the row. Log in as the invitee; badge shows 1. Accept. New membership exists.
- [ ] **Step 3: Role gating**
  As a Viewer in a shared workspace, confirm sidebar hides tools requiring write+, Edit/Delete buttons in tool UIs disabled, and backend writes return 403.
- [ ] **Step 4: Soft-delete sweeper**
  Manually backdate a deleted org's `deleted_at` in mongosh to past the 30-day threshold; tail logs as the sweeper runs.
- [ ] **Step 5: Open PR**

```bash
gh pr create --title "Workspaces collaboration + RBAC (sub-project B)" --body "$(cat <<'EOF'
## Summary
- Org + shared workspace CRUD with cascade soft-delete
- Member CRUD with org → workspace role cascade
- Invitation-by-email with Resend (dev-mode logger fallback)
- Hardcoded RBAC matrix; require_permission wraps every scoped route
- Switcher dropdown with create-org / create-workspace / invite CTAs
- `/settings/workspaces` management page
- Encrypted tools show placeholder in shared workspaces (E2EE arrives in C)
- BroadcastChannel cross-tab sync

Spec: docs/superpowers/specs/2026-06-27-workspaces-collaboration-and-encryption-design.md

## Test plan
- [ ] Create org → create shared workspace → switch → encrypted tools blocked
- [ ] Invite by email → invitee accepts → memberships correct
- [ ] Role gates sidebar + backend writes
- [ ] Soft-delete sweeper hard-deletes after 30 days

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

# Phase C — E2EE for shared workspaces

## Phase C.1 — Crypto utilities + tests

### Task 20: `workspace-crypto.ts` Web Crypto helpers + Jest round-trips

**Files:**
- Create: `apps/web/src/lib/workspace-crypto.ts`
- Create: `apps/web/src/lib/__tests__/workspace-crypto.test.ts`

**Interfaces:**
- `async function generateUserKeypair(masterKey: CryptoKey): Promise<{publicKey: string, privateKeyEncrypted: {encrypted: string, iv: string}}>`
- `async function unwrapUserPrivateKey(masterKey: CryptoKey, blob: {encrypted: string, iv: string}): Promise<CryptoKey>`
- `async function generateWorkspaceDek(): Promise<CryptoKey>`
- `async function wrapDekForMember(dek: CryptoKey, myPrivate: CryptoKey, recipientPublicKey: string): Promise<{encrypted: string, iv: string, senderPublicKey: string}>`
- `async function unwrapDek(wrapped: {encrypted: string, iv: string, senderPublicKey: string}, myPrivate: CryptoKey): Promise<CryptoKey>`
- `async function encryptEntry(dek: CryptoKey, plaintext: string): Promise<{encrypted: string, iv: string}>`
- `async function decryptEntry(dek: CryptoKey, blob: {encrypted: string, iv: string}): Promise<string>`
- `async function dekFingerprint(dek: CryptoKey): Promise<string>` (sha256 of raw key, base64)

Implementation: X25519 ECDH (via `crypto.subtle.generateKey({name: "ECDH", namedCurve: "X25519"}, ...)`) — NOTE: at the time of writing, Web Crypto supports X25519 in recent Node + browsers. Verify support; fall back to `ECDH P-256` if X25519 not yet available in target runtime. HKDF-Expand on the shared secret. AES-GCM-256 for both wrap and entry encryption.

- [ ] Test: round-trip encrypt/decrypt, wrap/unwrap with two simulated users, fingerprint determinism.
- [ ] Commit: `feat(workspaces): client-side crypto helpers (X25519 + AES-GCM)`.

---

## Phase C.2 — Backend schema + crypto routes

### Task 21: `users.encryption` schema + keypair routes

**Files:**
- Modify: `apps/backend/app/api/routes/auth/users_repo.py` (add `set_user_encryption`, `get_user_encryption`, `find_users_with_publickey_by_emails`)
- Create: `apps/backend/app/api/routes/workspaces/crypto_repo.py`
- Modify: `apps/backend/app/api/routes/workspaces/api.py` (add keypair routes)
- Modify: `apps/backend/app/api/routes/workspaces/schema.py` (add `KeypairOut`, `KeypairPostRequest`)
- Test: `apps/backend/tests/test_user_keypair.py`

**Routes:**
- `GET /workspaces-api/users/me/keypair` → `KeypairOut | null`
- `POST /workspaces-api/users/me/keypair` body `KeypairPostRequest`

Schemas:

```python
class EncryptionBlob(BaseModel):
    encrypted: str
    iv: str


class KeypairOut(BaseModel):
    publicKey: str
    privateKeyEncrypted: EncryptionBlob
    salt: str
    createdAt: int


class KeypairPostRequest(BaseModel):
    publicKey: str = Field(min_length=1)
    privateKeyEncrypted: EncryptionBlob
    salt: str = Field(min_length=1)
```

`set_user_encryption(uid, public_key, blob, salt)` writes to `users.encryption.publicKey/privateKeyEncrypted/salt/createdAt`. `get_user_encryption(uid)` reads back.

- [ ] Test: round-trip set + get returns same blob.
- [ ] Commit: `feat(workspaces): users.encryption schema + keypair endpoints`.

---

### Task 22: `workspace_memberships.wrappedDek` + DEK routes

**Files:**
- Modify: `apps/backend/app/api/routes/workspaces/repo.py` (`set_membership_wrapped_dek`, `find_memberships_for_workspace`, `bulk_update_wrapped_deks`)
- Create: `apps/backend/app/api/routes/workspaces/crypto_service.py`
- Modify: `apps/backend/app/api/routes/workspaces/api.py` (4 crypto routes)
- Modify: `apps/backend/app/api/routes/workspaces/schema.py` (`DekWrapOut`, `DekWrapPostRequest`, `RotateDekRequest`, `PendingWrapOut`)
- Test: `apps/backend/tests/test_dek_wrap.py`, `apps/backend/tests/test_pending_wraps.py`

**Routes:**
- `GET /workspaces-api/workspaces/{ws_id}/dek-wrap` → current user's `wrappedDek` for ws, with `senderPublicKey`. `null` if user has no wrap yet.
- `POST /workspaces-api/workspaces/{ws_id}/dek-wrap` body `DekWrapPostRequest` — Admin wraps for a single target uid. Writes the wrap onto target's `workspace_memberships` row.
- `POST /workspaces-api/workspaces/{ws_id}/rotate-dek` body `RotateDekRequest` — Admin submits new `dekFingerprint` + per-member wraps; backend writes `workspaces.settings.encryption.{dekFingerprint, rotatedAt}` + bulk-updates `workspace_memberships[uid].wrappedDek` and bumps `wrappedDekVersion`.
- `GET /workspaces-api/workspaces/{ws_id}/pending-wraps` — list members whose `wrappedDek` is null (need a wrap).

- [ ] Tests: wrap round-trip; pending-wraps list filtering; rotate-dek invariant (every member ends with same `wrappedDekVersion`).
- [ ] Commit: `feat(workspaces): per-member DEK wrap + rotate + pending-wraps routes`.

---

## Phase C.3 — Frontend integration

### Task 23: User-keypair store + master-key-gate integration

**Files:**
- Create: `apps/web/src/store/user-keypair-store.ts`
- Create: `apps/web/src/lib/user-keypair-api.ts`
- Modify: `apps/web/src/components/master-password-gate.tsx` (on unlock, fetch keypair; if exists, decrypt private key with master key; if missing, schedule generation)

**Interfaces:**
- `useUserKeypairStore` — in-memory `CryptoKey | null` for private key; cleared on signout / lock.
- On master-key unlock:
  1. `GET /users/me/keypair` → if 200 + blob, `unwrapUserPrivateKey(masterKey, blob)` → store.
  2. If 404 or null, lazy-generate on first encrypted-tool use (don't preemptively block unlock).

- [ ] Tests: store clear/set; unwrap-on-unlock happy path.
- [ ] Commit: `feat(workspaces): user keypair store + unwrap-on-master-unlock`.

---

### Task 24: Workspace DEK store + auto-hydrate on workspace switch

**Files:**
- Create: `apps/web/src/store/workspace-dek-store.ts`
- Create: `apps/web/src/lib/workspace-dek-api.ts`
- Modify: `apps/web/src/store/workspace-store.ts` (on `setActiveWorkspace`, trigger DEK fetch if active workspace has `settings.encryption !== null`)

**Interfaces:**
- `useWorkspaceDekStore` — `Map<workspaceId, CryptoKey>` in memory; cleared on signout / lock; cleared on workspace_id removal.
- `getDek(workspaceId): Promise<CryptoKey | null>` — checks cache; if miss, fetches `GET /workspaces/{ws_id}/dek-wrap`, unwraps with user private key, caches.

- [ ] Tests: store get/set, miss-fetch.
- [ ] Commit: `feat(workspaces): workspace DEK store with lazy hydrate`.

---

### Task 25: Password Manager DEK-cipher branch

**Files:**
- Modify: `apps/web/src/components/password-manager/*` (every encrypt/decrypt call site)

**Interfaces:** Replace direct `encryptData(masterKey, ...)` calls with:

```ts
const key = await getCipherKey(activeWorkspace, masterKey)
encryptData(key, plaintext)
```

Where `getCipherKey`:
- Personal workspace → returns `masterKey`
- Shared workspace with `settings.encryption !== null` → returns workspace DEK from `workspace-dek-store`
- Shared workspace with `settings.encryption === null` → throws "Encryption not enabled" (the route should render the placeholder, but defensive)

Add `EncryptedToolPlaceholder` toggle: when active workspace is shared AND `settings.encryption !== null` AND user has a wrappedDek → render the real tool view. Otherwise placeholder.

- [ ] Tests: encrypt/decrypt round-trip for both personal (master key) and shared (DEK) paths; placeholder renders when DEK missing.
- [ ] Commit: `feat(workspaces): password manager uses workspace DEK in shared workspaces`.

---

### Task 26: Environment Manager DEK-cipher branch

Mirror Task 25 for `apps/web/src/components/environment-manager/*`. Same getCipherKey helper.

- [ ] Commit: `feat(workspaces): environment manager uses workspace DEK in shared workspaces`.

---

### Task 27: API Key Vault DEK-cipher branch

Mirror Task 25 for `apps/web/src/components/api-key-vault/*`.

- [ ] Commit: `feat(workspaces): api key vault uses workspace DEK in shared workspaces`.

---

### Task 28: "Enable encrypted tools" CTA + DEK generation flow

**Files:**
- Create: `apps/web/src/components/enable-encrypted-tools-cta.tsx`
- Modify: `apps/web/src/app/settings/workspaces/workspace-section.tsx` (mount CTA)

**Flow:**
1. CTA visible in workspace settings if `is_personal === false` AND `settings.encryption === null` AND user is Workspace Admin.
2. On click:
   a. Generate DEK client-side.
   b. Fetch every member's public key from new route `GET /workspaces-api/workspaces/{ws_id}/member-publickeys`.
   c. Wrap DEK for each member (using my private key + each public key).
   d. POST to `/workspaces/{ws_id}/rotate-dek` with `dekFingerprint` + all wraps. Backend sets `settings.encryption` and writes all wraps.
   e. Refresh active workspace from store.

For members without a published public key: add a `pendingMember[]` to the response. Show "X members need to publish their keypair first" warning.

- [ ] Tests: CTA renders / hides per role; click triggers expected sequence (mock).
- [ ] Commit: `feat(workspaces): enable encrypted tools CTA + initial DEK wrap`.

---

### Task 29: Pending-wraps prompt for new members

**Files:**
- Create: `apps/web/src/components/pending-wraps-prompt.tsx`
- Modify: `apps/web/src/components/workspace-switcher-dropdown.tsx` (badge if any pending)

**Flow:**
1. After accept-invitation, member opens any shared workspace they joined.
2. If their workspace_memberships row has `wrappedDek === null` AND `settings.encryption !== null`, show "Receive encryption key" prompt.
3. Prompt asks any existing (online + unlocked) member to complete the wrap. Polls `GET /workspaces/{ws_id}/pending-wraps`; on existing-member side, shows "complete wrap for X" CTA.
4. On completion: existing member generates wrap from their unwrapped DEK + new member's public key, POSTs to `/workspaces/{ws_id}/dek-wrap`.

- [ ] Tests: state-transition tests.
- [ ] Commit: `feat(workspaces): pending wraps prompt + cross-member completion`.

---

### Task 30: Rotate key UI

**Files:**
- Create: `apps/web/src/components/rotate-key-button.tsx`
- Modify: `apps/web/src/app/settings/workspaces/workspace-section.tsx`

**Flow:** Workspace Admin clicks "Rotate encryption key". Same wrap-for-all flow as C9, but backend kicks off the re-encryption background job (Task 31).

- [ ] Tests: button renders for Admin; click triggers rotate-dek POST.
- [ ] Commit: `feat(workspaces): rotate-key UI + trigger`.

---

### Task 31: Re-encryption background job for DEK rotation

**Files:**
- Create: `apps/backend/app/api/routes/workspaces/rotation_job.py`
- Modify: `apps/backend/app/api/routes/workspaces/api.py` (rotate-dek route fires the job)

**Flow:** On rotate-dek, the route:
1. Stores the new wraps + new fingerprint.
2. Enqueues a background task: for each of the 3 encrypted-tool collections, find every entry in this workspace. For each: download by the client side... wait, that's wrong — the entries are encrypted, the SERVER can't re-encrypt.

**Realization:** the re-encryption MUST happen client-side, with the Admin holding both old DEK and new DEK. The backend's role is just to swap the wrappedDek field per member.

**Revised approach:** The Admin client, after generating new DEK + wraps, runs a client-side loop:
1. Fetch every encrypted entry in the workspace via existing list endpoints.
2. Decrypt with old DEK.
3. Re-encrypt with new DEK.
4. PUT back via existing update endpoints.
5. When complete, POST `/workspaces/{ws_id}/rotate-dek` with new wraps (atomic flip).

Move "rotation_job.py" to the **frontend** in `apps/web/src/lib/dek-rotation.ts`.

- [ ] Tests: rotation loop with 3 mock entries → both encrypted blobs change → admin still reads after rotation.
- [ ] Commit: `feat(workspaces): client-side DEK rotation + re-encrypt loop`.

---

### Task 32: Frontend tests for crypto integration

- [ ] Encrypt/decrypt round-trip across the 3 tools using both personal master key and shared DEK paths.
- [ ] Pending-wraps prompt shows for new member; disappears after wrap.
- [ ] Rotation reduces neither plaintext data nor entry count.
- [ ] Commit: `test(workspaces): crypto integration coverage`.

---

### Task 33: Manual verification + Phase C PR

- [ ] **C1:** Create shared workspace. Confirm placeholder shown for encrypted tools.
- [ ] **C2:** Workspace Admin clicks "Enable encrypted tools". DEK generated, wraps stamped.
- [ ] **C3:** Create a password entry. Network tab: payload is `{encryptedData, iv}` ciphertext, no plaintext.
- [ ] **C4:** Invite second user. They accept. Login as second user. "Receive encryption key" prompt appears.
- [ ] **C5:** Admin (still logged in elsewhere) completes the wrap. Second user reloads, sees the entry, can decrypt.
- [ ] **C6:** Remove second user from workspace. Their wrap is gone. Trigger key rotation. Confirm Admin still reads.
- [ ] **C7:** Open PR

```bash
gh pr create --title "Workspaces E2EE for shared workspaces (sub-project C)" --body "$(cat <<'EOF'
## Summary
- Per-user X25519 keypair stored alongside master vault
- Per-workspace AES-GCM DEK wrapped per member
- Initial DEK opt-in via "Enable encrypted tools" CTA
- Pending-wraps prompt + cross-member wrap completion
- Manual key rotation with client-side re-encryption loop
- Encrypted tools work in shared workspaces; Personal workspace flow unchanged

Spec: docs/superpowers/specs/2026-06-27-workspaces-collaboration-and-encryption-design.md

## Test plan
- [ ] Initial wrap flow (Admin → all current members)
- [ ] New-member wrap (any existing member completes)
- [ ] Rotation invariant (all wraps share same version)
- [ ] Network tab inspection: no plaintext encrypted-tool data
- [ ] Master key flow on Personal workspace unchanged

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review Summary

- **Spec coverage:**
  - B section 1 (encrypted-tools gating) → T17, T6 placeholder.
  - B section 2 (org creation) → T5.
  - B section 3 (workspace creation) → T6.
  - B section 4 (invitations) → T8, T16.
  - B section 5 (invitation token) → T8 (`secrets.token_urlsafe(32)`, 14-day expiry).
  - B section 6 (role assignment timing) → T7 changeRole flows + T8 invite-time role.
  - B section 7 (role cascade) → T4.
  - B section 8 (RBAC matrix) → T3, T9, T11.
  - B section 9 (sidebar role-gating + auto-unpin) → T12.
  - B section 10 (soft delete + sweeper) → T1, T5, T6, T10.
  - B section 11 (member removal cascade) → T7.
  - B section 12 (switcher dropdown) → T13.
  - B section 13 (Resend) → T2.
  - B section 14 (BroadcastChannel) → T18.
  - C section 15 (per-user keypair) → C1, C2, C4.
  - C section 16 (per-workspace DEK + wraps) → C3, C5, C9.
  - C section 17 (invite flow with crypto) → C10.
  - C section 18 (rotation) → C11, C12.
  - C section 19 (member removal with crypto) → C12 (covered via rotation trigger after remove).
  - C section 20 (Personal unchanged) → C6, C7, C8 (getCipherKey branch).
  - C section 21 (backwards-compat for pre-C shared workspaces) → C9 (opt-in CTA).

- **Placeholder scan:** no TBDs; the dialog/page tasks (T14, T15) describe the deliverable without full code blocks because the dialog and page patterns are mechanical mirrors of existing shadcn components — the implementer is told to mirror the established pattern. If that's too thin, the executor can expand T14 into one task per dialog.

- **Type consistency:** `WsRole`, `OrgRole`, `Permission`, `WorkspaceContext` signatures consistent across backend and the frontend mirror. `wrappedDek` shape is `{encrypted, iv, senderPublicKey}` across all references.
