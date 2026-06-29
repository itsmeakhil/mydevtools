# Workspaces — Sub-project A: Foundation

**Status:** design, ready for plan
**Date:** 2026-06-26
**Owner:** akhil
**Related work to come:** sub-project B (collaboration + RBAC), sub-project C (E2EE for collaborative workspaces)

## Goal

Introduce a multi-tenant **Organization → Workspace** hierarchy to the platform. In sub-project A we land the data model, the per-user setup, the implicit-context plumbing, and the migration of existing data into an auto-created Personal workspace. No collaboration UX, no role gating, no encryption changes — those land in B and C. After A merges, the visible UX delta is a single non-interactive "Personal" pill in the navbar; everything else is plumbing that B and C unlock.

## Non-goals (deferred)

- Creating / renaming / deleting orgs or workspaces (B)
- Inviting members, role assignment, tool-access RBAC, sidebar role-gating (B)
- Per-workspace shared encryption / envelope crypto / per-user ECDH keypair (C)
- Org-level billing, quotas, SSO, audit-log surfacing
- URL-encoded org/workspace routing (we use implicit cookie context)
- Mobile workspace switcher sheet (lands in B with the dropdown)

## Decisions captured

1. **Hierarchy:** every resource belongs to a workspace; every workspace belongs to an org.
2. **System org:** a single system-managed org named "MyDevTools Cloud" (`kind="system"`, `slug="mydevtools-cloud"`, `owner_uid=null`) seeded at backend startup. Every user is auto-added as a member.
3. **Personal workspace:** each user gets exactly one Personal workspace inside MyDevTools Cloud, with `is_personal=true`, `owner_uid=<uid>`, `kind="personal"`, `name="Personal"` (locked — not renameable or deletable, ever).
4. **Data scope:** tool-internal data is workspace-scoped, except a small user-global set: `users`, `user_preferences` (excluding pinned-tools subkey), `game_scores`, `audit_log`, `feedback`, profile / theme / app settings.
5. **Pinned tools:** scoped to `(user, workspace)`. A user picks their own pins inside each workspace.
6. **Role cascade (forward-looking, not enforced in A since only Personal exists):** Org Owner/Admin → automatic Workspace Admin on every workspace in that org. Org Member/Viewer → no workspace access unless explicitly added.
7. **Workspace switcher placement:** top navbar, right side, mounted in `nav-bar.tsx` between the page-title block and `CommandTrigger`.
8. **A surface visibility:** workspace pill mounted in the navbar (display-only label in A, becomes a dropdown in B).
9. **URL strategy:** implicit context via HTTP-only cookie + Zustand store. Routes stay flat (`/app/<tool>`). No `/orgs/.../workspaces/...` URL refactor.
10. **Migration:** lazy first-login backfill. On first authenticated request after deploy, backend ensures org membership + Personal workspace + enqueues a per-user backfill task that stamps every legacy doc with `org_id` + `workspace_id` and rewrites `pinned_tools` into the keyed shape.

## Architecture & data model

### New Mongo collections

```
organizations
  _id (ObjectId)
  name           // "MyDevTools Cloud", "Acme Inc", ...
  slug           // unique, lowercase-hyphen, reserved for B URLs
  kind           // "system" | "user"
  owner_uid      // null for system org, uid for user-created (B)
  created_at, updated_at
  settings       // {} reserved for billing/quotas (B/C)

org_memberships
  _id
  org_id  (ref organizations)
  uid     (firebase uid)
  org_role   // "owner" | "admin" | "member" | "viewer"
  created_at
  UNIQUE (org_id, uid)
  INDEX  (uid)            // list-my-orgs path

workspaces
  _id
  org_id  (ref organizations)
  name           // "Personal" (locked when is_personal), or user-set later
  slug           // unique within org, reserved for B URLs
  is_personal    // bool
  owner_uid      // for is_personal=true workspaces — strict access scope
  kind           // "personal" | "shared"
  created_at, updated_at
  settings       // {} reserved (e.g. settings.encryption in C)

workspace_memberships
  _id
  workspace_id (ref workspaces)
  org_id       (ref organizations, denormalized for index)
  uid
  ws_role      // "admin" | "developer" | "viewer"
  created_at
  UNIQUE (workspace_id, uid)
  INDEX  (uid)
```

### Existing collections — schema change

Stamp `org_id` + `workspace_id` on every doc in each of the following workspace-scoped collections (one per backend route module):

`passwords`, `code_snippets`, `notes`, `tasks`, `bookmarks`, `environment_manager`, `api_client` (collections / requests / history), `api_key_vault`, `db_explorer`, `nosql`, `sql_client`, `redis_commander`, `s3_drive`, `dns_lookup`, `url_shortener`.

Add a compound index per collection: `(org_id, workspace_id, uid, created_at)` for the dominant list query. Keep existing `(uid, ...)` indexes during the transition; drop them in a follow-up PR once `migrated_at` is set for all live users.

**User-global (NOT stamped):** `users`, `user_preferences` (except the pinned-tools subkey, which is keyed by workspace_id), `game_scores`, `audit_log`, `feedback`.

### Pinned tools schema change

`user_preferences.pinned_tools: string[]`
→
`user_preferences.pinned_tools_by_workspace: { [workspace_id]: string[] }`

Backfill rewrites the existing array into the keyed shape with the user's Personal workspace_id as the key. The frontend Zustand store mirrors the same shape.

### Personal-workspace invariant (hard rule)

Every Personal workspace has exactly one workspace_membership: its owner with `ws_role="admin"`. Every query against personal-workspace data MUST additionally filter `owner_uid = current_uid`. This is belt-and-suspenders: even if a query accidentally trusted org membership alone, the `owner_uid` predicate prevents one user from seeing another's Personal data through misconfigured queries. Enforced at the repo layer and verified by a dedicated test (see Testing).

### System org seeding

On backend startup, `ensure_system_org()` runs idempotently and creates the MyDevTools Cloud doc if absent. No memberships are created at this point — those happen at first user login.

## Backend APIs

All new routes live in `apps/backend/app/api/routes/workspaces/api.py`.

### Routes

```
GET  /api/backend/orgs
     → list orgs current user is a member of
     → A: always returns [MyDevTools Cloud]

GET  /api/backend/workspaces
     → list workspaces current user has access to
     → A: always returns [Personal]
     → query param: ?org_id=<id> filter (defaulted; only one in A)

GET  /api/backend/workspaces/{workspace_id}
     → fetch one (used by switcher pill on hydrate)

POST /api/backend/workspaces/active
     body: { workspace_id }
     → validates current user is a member of that workspace
     → sets HTTP-only secure cookie `active_workspace=<id>`, SameSite=Lax
     → A: only callable with the user's Personal workspace_id
```

No create / rename / delete routes in A.

### Middleware

`get_workspace_ctx` FastAPI dependency, applied to every workspace-scoped route:

```python
async def get_workspace_ctx(
    request: Request,
    uid: Annotated[str, Depends(get_current_uid)],
) -> WorkspaceContext:
    ws_id = request.cookies.get("active_workspace") or await default_personal_ws_id(uid)
    mem = await get_ws_membership(ws_id, uid)
    if not mem:
        raise HTTPException(403, "Not a member of this workspace")
    ws = await get_workspace(ws_id)
    return WorkspaceContext(
        uid=uid,
        org_id=ws.org_id,
        workspace_id=ws_id,
        role=mem.ws_role,
        is_personal=ws.is_personal,
        owner_uid=ws.owner_uid,
    )
```

Repo functions for workspace-scoped collections take this ctx and add `{org_id, workspace_id}` to the query filter. When `ctx.is_personal=true`, also add `{owner_uid: ctx.uid}` — implements the invariant.

### First-login hook

Runs at the top of every authenticated request as a cheap idempotent dependency, guarded by `user.workspace_setup_at`:

```
1. Ensure user is a member of MyDevTools Cloud org
   (insert if missing, org_role="member")
2. Ensure user has a Personal workspace
   (insert if missing: name="Personal", is_personal=true,
    owner_uid=uid, kind="personal", slug="personal-<uid_short>")
3. Ensure user has a workspace_membership for it
   (ws_role="admin")
4. If user.migrated_at is null:
     - Enqueue per-user backfill (FastAPI BackgroundTasks)
     - Set user.migration_status="pending"
5. Set user.workspace_setup_at = now()
   (skip steps 1–3 on subsequent calls)
```

After `workspace_setup_at` is set, the dependency short-circuits to a single field-read.

### Backfill task

Per-user, idempotent, resumable. For each workspace-scoped collection:

```python
await coll.update_many(
    { "uid": uid, "workspace_id": { "$exists": False } },
    { "$set": { "org_id": SYSTEM_ORG_ID, "workspace_id": personal_ws_id } },
)
```

Progress recorded in `user.migration_progress = { collection_name: "done" | "pending" }`. A partial-completion crash resumes from the same field. Final step: rewrite `user_preferences.pinned_tools` → `pinned_tools_by_workspace`. Set `user.migrated_at = now()` and clear `migration_status`.

### Read-path tolerance during pending backfill

Repo queries against scoped collections OR-match the legacy shape, scoped by `uid` so it cannot cross users:

```python
{
  "$or": [
    { "org_id": ctx.org_id, "workspace_id": ctx.workspace_id },
    { "workspace_id": { "$exists": False }, "uid": ctx.uid },
  ],
  # plus owner_uid filter when ctx.is_personal
}
```

This branch is marked with a `ponytail:` comment and removed in a follow-up PR once `migrated_at` is set for all live users.

## Frontend surface

### Zustand store: `apps/web/src/store/workspace-store.ts`

```ts
type Workspace = {
  id: string
  org_id: string
  name: string
  slug: string
  is_personal: boolean
  ws_role: "admin" | "developer" | "viewer"
}
type Org = {
  id: string
  name: string
  slug: string
  kind: "system" | "user"
  org_role: "owner" | "admin" | "member" | "viewer"
}

type WorkspaceStore = {
  orgs: Org[]
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  hydrated: boolean
  loadFromBackend: () => Promise<void>
  setActiveWorkspace: (workspaceId: string) => Promise<void>
  clear: () => void
}
```

Hydrated once on app boot from `GET /api/backend/orgs` + `GET /api/backend/workspaces`. Cleared on logout alongside the other stores in `app-sidebar.tsx`'s signout handler.

`setActiveWorkspace(id)` posts to `/api/backend/workspaces/active` (backend validates membership and sets the cookie), updates Zustand, and triggers query invalidation. In A this path is unreachable in normal use (only one workspace), but the wiring lands now so B/C don't have to retrofit it.

### Workspace switcher pill: `apps/web/src/components/workspace-switcher.tsx`

In A, renders as a non-interactive label:

- Icon: building/folder glyph (`Briefcase` or `LayoutGrid` from lucide-react)
- Label: active workspace name (`"Personal"` in A)
- Hover tooltip: workspace name + secondary text for org name (`"MyDevTools Cloud"`)
- No chevron, no dropdown affordance in A — display-only
- In B: gains chevron + dropdown (org list → workspace list → "Create" actions)

Mounted in `nav-bar.tsx` between the page-title block and `CommandTrigger`, sized to `h-9`, color-matched to existing surface chips. Hidden on mobile (`md:flex hidden`).

### Pinned tools store reshape: `apps/web/src/store/pinned-tools-store.ts`

```ts
type PinnedToolsStore = {
  pinnedByWorkspace: Record<string, string[]>   // workspace_id → tool paths
  setPinnedTools: (workspaceId: string, tools: string[]) => void
  togglePin: (workspaceId: string, toolUrl: string) => void
}
```

Selector `usePinnedToolsForActiveWorkspace()` reads `pinnedByWorkspace[activeWorkspaceId] ?? []`. `buildPinnedNavItems` in `app-sidebar.tsx` consumes the selector — no change to its body beyond the source.

Zustand persist `version` is bumped to `2`. The `migrate` callback converts the legacy `{ pinnedTools: string[] }` shape into `{ pinnedByWorkspace: {} }` (empty — server backfill is the source of truth; local state catches up on next hydrate from `user_preferences.pinned_tools_by_workspace`). `pinned-tools-preferences-sync` switches to syncing the keyed map.

### App boot sequence

```
1. Auth resolves (existing)
2. Backend session ensure (POST /auth/session) triggers backend first-login hook
   → org membership + Personal workspace + enqueues backfill
3. Workspace store loads via /orgs + /workspaces
4. activeWorkspaceId defaults to the only Personal workspace returned
5. Master-key vault gate proceeds as today (no change for Personal)
6. Sidebar renders with workspace-scoped pinned tools
```

### Migration-in-progress UX

If `migration_status === "pending"`, show a one-line non-blocking banner ("Setting up your workspace…") and keep the workspace switcher pill in its display-only state (it's already display-only in A). Banner clears when polling sees `migrated_at` set. Skip the banner if the backend reports that the inline backfill measured under 500 ms (a `migrated_fast=true` flag on the first response).

## Encryption boundary

**No crypto changes in A.** Personal workspace uses the existing master-key flow:

- Master vault (PBKDF2 salt + AES-GCM verifier) stays per-user, server-side. Unchanged.
- The derived `CryptoKey` in `master-key-store` stays per-user. No per-workspace key in A.
- Encrypted-blob fields in `passwords`, `environment_manager`, `api_key_vault`, etc. retain their existing `{ encrypted, iv }` shape. Backfill stamps `org_id` + `workspace_id` next to those blobs — does not touch the ciphertext.

This is safe because every user has exactly one workspace (Personal), every Personal workspace has exactly one member (owner), and the personal-workspace invariant pins all queries to `owner_uid = current_uid`. The master key continues to gate the same data set it did before — A only labels that set.

**Forward-looking schema reservation (C):**

```
workspaces.settings.encryption = null  // A & B
                              = { scheme: "shared-dek-v1", dek_wrapped_per_member: [...] }  // C
```

Personal workspaces keep `encryption=null` permanently. Shared workspaces in C get the `shared-dek-v1` blob. ECDH (X25519) and AES-GCM 256 are both already available via `crypto.subtle`; no new dependencies are needed in any sub-project.

## Testing

### Backend (pytest)

- `tests/test_workspaces_seed.py` — `ensure_system_org()` is idempotent across N calls; exactly one MyDevTools Cloud doc results.
- `tests/test_workspace_setup.py` — first-login hook creates org membership + Personal workspace + workspace_membership; a second call is a no-op (no duplicate inserts).
- `tests/test_workspace_invariant.py` — calling a Personal-workspace-scoped repo function with a non-owner uid returns `[]` even if a malicious caller forges `workspace_id`. Load-bearing security test.
- `tests/test_backfill.py` — backfill on a fixture with mixed legacy rows stamps `org_id` + `workspace_id` on all of them, marks `migrated_at`, is idempotent on re-run, and resumes from `migration_progress` after a simulated partial-completion crash.
- `tests/test_workspace_ctx.py` — middleware rejects requests whose `active_workspace` cookie points at a workspace the user is not a member of (403).
- One integration test per refactored scoped route (~15 routes) confirming the query is now workspace-scoped: seed two users, give each a Personal workspace, confirm data created under user A's ctx is not visible to user B.

### Frontend (Vitest)

- `workspace-store.test.ts` — hydrate from mocked API returns one org + one workspace; `activeWorkspaceId` defaults to it.
- `pinned-tools-store.test.ts` — version-2 `migrate` converts legacy `pinnedTools: string[]` into `pinnedByWorkspace: {}`; the per-workspace selector returns the correct list.
- `workspace-switcher.test.tsx` — renders the active workspace name, no chevron in A, tooltip shows org name.

### Manual verification (gates merge)

- Local dev: log in as a fresh user → confirm one org membership + one Personal workspace exist after login → confirm sidebar pinned tools work scoped to that workspace.
- Migration dry-run: against a staging DB clone with a real user's data, run the backfill once; spot-check `passwords` / `snippets` / `notes` collections have `org_id` + `workspace_id` set on every existing doc and confirm the user can still decrypt their passwords with the existing master key.

## Risks

- **Backfill on a large user.** A power user with thousands of saved entries triggers a slower first-login backfill. Mitigation: per-collection `update_many` is one Mongo round-trip per collection regardless of doc count; should stay under a few seconds in practice. The async BackgroundTasks dispatch means the login response itself doesn't block on backfill.
- **Legacy-row OR branch in queries.** The transitional `OR` predicate in repo queries is a footgun if it's accidentally widened (e.g. a contributor drops the `uid` predicate). Mitigation: the test in `test_workspace_invariant.py` asserts no cross-user leak; the `ponytail:` comment names the upgrade path; follow-up PR removes the branch once all live users have `migrated_at`.
- **Personal workspace name collisions in B.** Personal name is locked to "Personal" in every user's Personal workspace; in B's create-workspace flow we must validate that user-created workspace names within an org are unique but **not** required to differ from "Personal" globally (each user has their own Personal). Schema invariant: `(org_id, owner_uid, is_personal=true)` is unique — exactly one Personal per user per org.
- **Cookie consistency across tabs.** Switching workspaces in one tab updates the cookie; other open tabs hold the previous `activeWorkspaceId` in Zustand until the next workspace-store hydration. In A this is unreachable (one workspace only); flag for B to add a BroadcastChannel or visibility-change re-hydrate.

## Implementation order (one slice at a time)

1. Backend: `organizations` / `org_memberships` / `workspaces` / `workspace_memberships` schemas + repo functions + seed `ensure_system_org()`.
2. Backend: first-login hook + `workspace_setup_at` field.
3. Backend: `get_workspace_ctx` middleware + WorkspaceContext model.
4. Backend: backfill task skeleton + `migration_status` / `migration_progress` / `migrated_at` fields.
5. Backend: refactor one scoped route module (e.g. `passwords`) end-to-end as the reference pattern.
6. Backend: refactor remaining ~14 scoped route modules to use `get_workspace_ctx`. Add transitional legacy-row OR branch in each repo.
7. Backend: new workspace routes (`GET /orgs`, `GET /workspaces`, `GET /workspaces/{id}`, `POST /workspaces/active`).
8. Backend: pytest coverage for the above.
9. Frontend: `workspace-store.ts` + API client.
10. Frontend: `workspace-switcher.tsx` mounted in `nav-bar.tsx`.
11. Frontend: pinned-tools store reshape + `migrate` callback + sync component update.
12. Frontend: app-boot wiring (`activeWorkspaceId` default + migration banner).
13. Frontend: Vitest coverage for the above.
14. Manual verification gate + merge.

## Open questions

None remaining for sub-project A — all major decisions captured above. Open items for B and C are tracked outside this spec.
