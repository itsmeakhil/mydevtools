# Workspaces — Sub-projects B + C: Collaboration, RBAC, and E2EE

**Status:** design, defaults baked in, awaiting user review
**Date:** 2026-06-27
**Owner:** akhil
**Builds on:** sub-project A (foundation) — landed in `docs/superpowers/specs/2026-06-26-workspaces-foundation-design.md`. Foundation ships the Organization → Workspace data model, auto-Personal workspace, navbar pill (display-only), per-workspace pinned tools, and `WorkspaceContext` middleware.

## Goal

Make workspaces actually collaborative. In **sub-project B** we add: user-created orgs, user-created shared workspaces inside any org, invite-by-email member onboarding, two role systems (org and workspace), tool-access gating in the sidebar, and the switcher dropdown UI. In **sub-project C** we add end-to-end envelope encryption to make shared workspaces safe for the master-key-encrypted tools (Password Manager, Environment Manager, API Key Vault). B and C are designed as separate, independently shippable sub-projects with one combined spec because the schema reservations in B determine what C will populate.

## Non-goals (deferred)

- Billing / paid plans / per-seat metering
- Audit log surfacing for org/workspace events (data already captured by the existing audit middleware; rendering UI is later)
- SSO / SAML / OIDC providers beyond the existing Firebase Auth
- Quotas (`workspaces.settings.quotas` reserved but unused)
- Granular per-tool permissions (the RBAC matrix in B is hardcoded; admin-configurable matrix is future work)
- API tokens / service accounts
- Cross-org sharing (a workspace lives in exactly one org)
- Importing existing workspaces from competitors

## Decisions captured

These defaults are baked in. Override during user review.

### Architecture-level

1. **Encrypted-tool gating in B:** Password Manager, Environment Manager, and API Key Vault are **Personal-workspace-only in B**. In any shared workspace they render a placeholder card: *"Encrypted tools available in Personal workspace only. End-to-end encryption for shared workspaces ships in the next release."* Sidebar still shows the tool, but the route renders the placeholder. In C, the gate flips automatically per workspace once a workspace DEK exists.
2. **Org creation:** any signed-in user can create unlimited orgs. Created via "+ New Organization" CTA inside the switcher dropdown and via a dedicated Settings page (`/settings/workspaces`).
3. **Workspace creation:** any Org Owner / Admin can create shared workspaces within their org. Personal workspaces are auto-only — never user-created, never renameable.
4. **Invitations:** invite by email to ANY address.
   - Registered email → immediately creates a `pending_invitation` row; the invitee sees an in-app "Pending invitations" badge on their workspace switcher and accepts in-app.
   - Unregistered email → same `pending_invitation` row + Firebase Auth signup-link email containing the invite token; on signup, the token auto-accepts the invitation.
5. **Invitation token:** UUID + opaque random nonce, stored server-side. Email link carries `?invite=<token>`. Token expires 14 days after issue. Single-use.
6. **Role assignment timing:** role chosen at invite time. Can be changed by an Org Admin or Owner afterward.
7. **Role cascade (from A's brainstorm):** Full cascade. Org Owner / Admin → implicit Workspace Admin on every workspace in that org. Org Member / Viewer → must be explicitly added to a workspace with a workspace role.
8. **Tool-access RBAC matrix:** Hardcoded per role. **Workspace Admin** = full CRUD on every tool. **Developer** = full CRUD on every tool except destructive admin actions (clear-all-vault, delete-workspace-collection). **Viewer** = read-only on every tool (no create, no update, no delete, no execute remote queries). Hardcoded in `apps/web/src/lib/workspace-rbac.ts` (frontend) and `apps/backend/app/api/routes/workspaces/rbac.py` (backend); mirrored.
9. **Sidebar role-gating:** if the active role can't access a tool, the tool is **hidden** from the sidebar AND **auto-removed** from that workspace's pinned list for that user. (The pin record stays in `pinned_tools_by_workspace[ws_id]` but the rendered nav filters it out — when role changes, pins reappear.)
10. **Org / workspace deletion:** soft delete with 30-day window. `deleted_at` field set; queries filter `deleted_at: null`. Background sweeper hard-deletes after 30 days. Personal workspaces inside MyDevTools Cloud **cannot be deleted**. Org deletion cascades to all workspaces in the org (also soft).
11. **Member removal:** removing a user from an org also removes them from every workspace in that org (cascade). Their workspace_memberships rows are deleted. Their personal workspace (inside MyDevTools Cloud) is untouched — they keep that.
12. **Workspace switcher dropdown:** hierarchical — orgs as section headers, workspaces nested under each, with the active workspace highlighted. "+ New Workspace" CTA at the bottom of each org's section if the user is Org Owner/Admin. "+ New Organization" CTA at the bottom of the entire menu.
13. **Email service:** **Resend** (https://resend.com) for transactional emails. New backend dep, env var `RESEND_API_KEY`. Falls back to logging the email body when the key is unset (dev mode). Reason: Firebase Auth's signup-link email is for password reset, not custom messages; rolling our own SMTP is YAGNI. Resend has a free tier sufficient for the foreseeable future.
14. **Cross-tab cookie consistency:** workspace store gains a BroadcastChannel listener. When tab A POSTs `/workspaces-api/workspaces/active`, it also broadcasts `workspace-changed`; tab B receives, re-hydrates workspace store, invalidates tool data.

### C-specific (E2EE for shared workspaces)

15. **Per-user keypair:** X25519 (ECDH). Generated client-side on first encrypted-tool action inside a shared workspace, or eagerly on Settings page opt-in. Private key encrypted with the user's master key (the same key that protects Personal workspace data). Stored as `users.encryption.privateKeyEncrypted` (`{encrypted, iv}` shape, mirroring Password Manager's blob format). Public key stored verbatim as `users.encryption.publicKey` (base64). Salt re-used from the user's master vault.
16. **Per-workspace DEK:** 256-bit AES-GCM key, generated client-side on first encrypted-tool entry creation in that workspace. Wrapped per member: `crypto.subtle.encrypt(AES-GCM, ECDH_shared_secret(inviter_priv, member_pub), DEK_raw)`. Stored on each `workspace_memberships` row as `wrappedDek: {encrypted, iv}`. `workspaces.settings.encryption = { scheme: "shared-dek-v1", dekFingerprint: <hash>, createdAt }` once initialized.
17. **Invite flow with crypto:** Inviter must be online and unlocked when adding a new member. Backend issues invite token immediately, but the wrapping happens client-side via a follow-up "Finish setup" prompt. If inviter is not online, the invite is `wrapping_pending`; another existing member (with the DEK) can complete the wrap when they next log in. If no member ever completes it within 7 days, the invitation auto-expires.
18. **Key rotation:** Manual trigger from Settings → Workspace → "Rotate encryption key" (Org Admin / Owner only). Generates a new DEK, re-wraps for all current members, then re-encrypts every encrypted-tool entry in that workspace. Background process. Old DEK retained until rotation completes successfully.
19. **Member removal with crypto:** When a member is removed from a shared workspace, the DEK is automatically rotated (their old wrap is now useless, but it's also no longer reachable). Optional aggressive variant: re-encrypt entries in the background. Default in C: passive (don't re-encrypt; the removed member never had a copy of the raw DEK in transit — they only ever had their wrap, which is now de-membershipped from `workspace_memberships`).
20. **Personal workspaces unchanged:** Personal workspaces in B and C keep the existing master-key flow. The schema field `workspaces.settings.encryption` stays `null` for Personal workspaces forever.
21. **Backwards compat for shared workspaces created in B:** any shared workspace created in B has `settings.encryption = null`. When C ships, those workspaces still see the placeholder for encrypted tools until a member opts in (via "Enable encrypted tools" CTA on the workspace settings page), at which point a DEK is generated and wrapped for all existing members.

---

## Sub-project B — Architecture & data model

### Schema additions

```
organizations
  +deleted_at: int | null         // soft delete

workspaces
  +deleted_at: int | null
  // settings.encryption stays null for personal & B-era shared

org_memberships
  // unchanged from A; org_role enum already supports Owner|Admin|Member|Viewer

workspace_memberships
  // unchanged from A; ws_role enum already supports Admin|Developer|Viewer
  +invited_by: str | null         // uid of inviter
  +invited_at: int | null

invitations               (new collection)
  _id (uuid)
  org_id        (ref organizations)
  workspace_id  (ref workspaces, nullable — org-level invite vs workspace-level invite)
  invited_email                   // normalized lowercase
  invited_uid: str | null         // populated if invitee was already registered at invite time
  invited_role_org: OrgRole | null
  invited_role_ws: WsRole | null
  token                           // opaque random 32-byte base64
  status: "pending" | "accepted" | "revoked" | "expired" | "wrapping_pending"
  invited_by   (ref users.uid)
  created_at, expires_at
  accepted_at: int | null
  accepted_uid: str | null
  INDEX (invited_email, status)
  INDEX (token) UNIQUE
  INDEX (org_id, status)

users
  // schema reservations for C — populated only when first needed
  +encryption: {
    publicKey: str | null,        // base64 X25519
    privateKeyEncrypted: { encrypted: str, iv: str } | null,
    salt: str,                    // re-used from master vault salt
    createdAt: int,
  } | null
```

### Backend new routes (B)

```
POST   /api/backend/workspaces-api/orgs                    create org
PATCH  /api/backend/workspaces-api/orgs/{org_id}           rename / settings
DELETE /api/backend/workspaces-api/orgs/{org_id}           soft delete (Owner only)

GET    /api/backend/workspaces-api/orgs/{org_id}/members   list members
POST   /api/backend/workspaces-api/orgs/{org_id}/members   invite by email (org-level)
PATCH  /api/backend/workspaces-api/orgs/{org_id}/members/{uid}  change role (Admin/Owner only)
DELETE /api/backend/workspaces-api/orgs/{org_id}/members/{uid}  remove member (cascade)

POST   /api/backend/workspaces-api/orgs/{org_id}/workspaces           create shared workspace
PATCH  /api/backend/workspaces-api/workspaces/{ws_id}                rename
DELETE /api/backend/workspaces-api/workspaces/{ws_id}                soft delete

GET    /api/backend/workspaces-api/workspaces/{ws_id}/members        list ws members
POST   /api/backend/workspaces-api/workspaces/{ws_id}/members        invite by email (ws-level)
PATCH  /api/backend/workspaces-api/workspaces/{ws_id}/members/{uid}  change role
DELETE /api/backend/workspaces-api/workspaces/{ws_id}/members/{uid}  remove

GET    /api/backend/workspaces-api/invitations/pending     list MY pending invitations
POST   /api/backend/workspaces-api/invitations/{token}/accept
POST   /api/backend/workspaces-api/invitations/{token}/revoke   (sender or org admin)

GET    /api/backend/workspaces-api/rbac/matrix             returns hardcoded role→tool map
```

### RBAC matrix (canonical)

`apps/backend/app/api/routes/workspaces/rbac.py`:

```python
TOOL_PERMISSIONS: dict[str, dict[WsRole, set[Permission]]] = {
    # Permission ∈ {"read", "write", "delete", "admin"}
    "password-manager":     {"admin": {"read","write","delete","admin"}, "developer": set(), "viewer": set()},   # see encrypted-gate
    "environment-manager":  {"admin": {"read","write","delete","admin"}, "developer": set(), "viewer": set()},   # see encrypted-gate
    "api-key-vault":        {"admin": {"read","write","delete","admin"}, "developer": set(), "viewer": set()},   # see encrypted-gate
    "notes":                {"admin": {"read","write","delete","admin"}, "developer": {"read","write","delete"}, "viewer": {"read"}},
    "bookmarks":            {"admin": {"read","write","delete","admin"}, "developer": {"read","write","delete"}, "viewer": {"read"}},
    "tasks":                {"admin": {"read","write","delete","admin"}, "developer": {"read","write","delete"}, "viewer": {"read"}},
    "code-snippets":        {"admin": {"read","write","delete","admin"}, "developer": {"read","write","delete"}, "viewer": {"read"}},
    "api-client":           {"admin": {"read","write","delete","admin"}, "developer": {"read","write","delete"}, "viewer": {"read"}},
    "nosql-explorer":       {"admin": {"read","write","delete","admin"}, "developer": {"read","write","delete"}, "viewer": {"read"}},
    "sql-client":           {"admin": {"read","write","delete","admin"}, "developer": {"read","write","delete"}, "viewer": {"read"}},
    "redis-commander":      {"admin": {"read","write","delete","admin"}, "developer": {"read","write","delete"}, "viewer": {"read"}},
    "s3-drive":             {"admin": {"read","write","delete","admin"}, "developer": {"read","write","delete"}, "viewer": {"read"}},
    "json-formatter":       {"admin": {"read","write","delete","admin"}, "developer": {"read","write","delete"}, "viewer": {"read"}},
    "url-shortener":        {"admin": {"read","write","delete","admin"}, "developer": {"read","write","delete"}, "viewer": {"read"}},
    # stateless tools (base64, regex, hash, etc) are accessible to ALL roles
}

DEFAULT_STATELESS_TOOLS: set[str] = {
    "base64", "hash-generator", "hmac-generator", "regex-tester",
    "json-formatter", "uuid-generator", # ... all stateless tools
}
```

Encrypted-tool rows in the matrix are flagged separately. In B, only Personal-workspace users hit the matrix lookup; in shared workspaces the encrypted-tool route returns the "available in Personal" placeholder regardless of role.

### Backend dependency injection — role gate

New FastAPI dependency `require_permission(tool: str, permission: Permission)`:

```python
def require_permission(tool: str, permission: Permission):
    async def dep(ctx: WorkspaceContext = Depends(get_workspace_ctx)) -> WorkspaceContext:
        if ctx.is_personal:
            return ctx  # all permissions in personal
        allowed = TOOL_PERMISSIONS.get(tool, {}).get(ctx.ws_role, set())
        if permission not in allowed:
            raise HTTPException(403, f"Role {ctx.ws_role} lacks {permission} on {tool}")
        return ctx
    return dep
```

Every existing scoped route gains a `require_permission(tool, perm)` wrapper. For example, `delete_password_entry` becomes:

```python
@router.delete("/entries/{entry_id}")
async def delete_entry(
    entry_id: str,
    ctx: WorkspaceContext = Depends(require_permission("password-manager", "delete")),
) -> None:
    ...
```

For all the read endpoints, the wrapper checks `"read"`. For create/update, `"write"`. For destructive routes (`clear_*`, delete-collection), `"admin"`.

### Frontend new pages / components

- `/settings/workspaces` — settings tab showing user's orgs, workspaces, members, pending invitations. CTAs for "+ New Org", "+ New Workspace" (per org), "Invite member".
- `workspace-switcher.tsx` (T22's pill) — upgraded from display-only to dropdown. Org sections, workspace rows, role badges, search filter (when ≥10 workspaces), "+ New Workspace" and "+ New Organization" CTAs at the bottom.
- `<CreateOrgDialog />`, `<CreateWorkspaceDialog />`, `<InviteMemberDialog />`, `<MemberListItem />`, `<RoleSelect />`.
- `<PendingInvitationsBadge />` — small badge on switcher pill showing count of pending invitations addressed to current user.
- `<EncryptedToolPlaceholder />` — rendered by passwords / env / api-key-vault routes when active workspace is shared.
- `<WorkspaceMemberManagement />` — page section for org/workspace member CRUD.

### Frontend RBAC gating

`apps/web/src/lib/workspace-rbac.ts` — mirror of backend matrix. Used to:
- Filter sidebar nav (hide tools where active role lacks `read`)
- Disable Create/Edit/Delete buttons in tool UIs when role lacks `write`/`delete`/`admin`
- Auto-unpin gated tools from `pinned_tools_by_workspace[active_ws_id]` (transient — don't write back, just filter at render)

`useToolPermission(toolSlug: string, permission: Permission): boolean` — hook consumed by sidebar + tool UIs.

### BroadcastChannel cross-tab sync

`apps/web/src/lib/workspace-broadcast.ts` — wraps the BroadcastChannel API. When `setActiveWorkspace(id)` succeeds, broadcasts `{ type: "workspace-changed", id }`. The workspace store subscribes; on receive, re-hydrates orgs/workspaces and updates `activeWorkspaceId`. React Query (if added later) cache invalidation hooks into this — for now, fall back to a hard refresh on receipt.

### Email sender

`apps/backend/app/core/email.py`:

```python
import resend
from app.core.config import get_settings

async def send_invitation_email(*, to: str, token: str, inviter_name: str, org_name: str, workspace_name: str | None) -> None:
    settings = get_settings()
    if not settings.RESEND_API_KEY:
        logging.info("DEV: would email %s with invite token %s", to, token)
        return
    resend.api_key = settings.RESEND_API_KEY
    await resend.Emails.send(...)
```

---

## Sub-project C — Architecture & data model

### Schema additions (on top of B)

```
workspaces
  settings.encryption: null                       // unchanged for personal & pre-C shared
                       | {
                           scheme: "shared-dek-v1",
                           dekFingerprint: str,    // sha256(DEK) base64, for display + leak detection
                           createdAt: int,
                           rotatedAt: int | null,
                         }

workspace_memberships
  +wrappedDek: { encrypted: str, iv: str } | null      // null until member receives their wrap
  +wrappedDekVersion: int                              // increments on rotation

users
  encryption: {
    publicKey: str,
    privateKeyEncrypted: { encrypted: str, iv: str },
    salt: str,                  // shared with master vault
    createdAt: int,
  }
```

### Crypto operations (all client-side, Web Crypto API)

`apps/web/src/lib/workspace-crypto.ts`:

```ts
// 1. Generate user keypair on first encrypted-tool action
async function generateUserKeypair(masterKey: CryptoKey): Promise<{
  publicKey: string,
  privateKeyEncrypted: { encrypted: string, iv: string },
}>

// 2. Generate workspace DEK
async function generateWorkspaceDek(): Promise<CryptoKey>

// 3. Wrap DEK for a recipient
async function wrapDekForMember(
  dek: CryptoKey,
  inviterPrivateKey: CryptoKey,
  recipientPublicKey: string,
): Promise<{ encrypted: string, iv: string }>

// 4. Unwrap DEK on member's side
async function unwrapDek(
  wrapped: { encrypted: string, iv: string },
  myPrivateKey: CryptoKey,
  senderPublicKey: string,    // any wrapping member's public key, embedded in wrap envelope
): Promise<CryptoKey>

// 5. Encrypt/decrypt entry data using DEK
async function encryptEntry(dek: CryptoKey, plaintext: string): Promise<{ encrypted: string, iv: string }>
async function decryptEntry(dek: CryptoKey, encrypted: string, iv: string): Promise<string>
```

### Key derivation

ECDH shared secret: `ECDH(inviter_priv, recipient_pub) → 32 bytes`. HKDF-Expand to derive AES-GCM-256 KEK. KEK encrypts raw DEK bytes; output is the `wrappedDek` blob. Recipient does ECDH the other way (`ECDH(recipient_priv, sender_pub)`) to derive the same KEK and unwrap.

The wrap envelope embeds the sender's public key so the recipient knows which KEK to derive without server lookup.

### Workspace lifecycle (C-aware)

**Workspace creation in shared org (C):**
1. Client generates DEK
2. Client wraps DEK for creator's own public key (so creator can decrypt later)
3. POST `/workspaces` with `settings.encryption = { scheme, dekFingerprint, createdAt }` AND `workspace_memberships[creator].wrappedDek`

**Invite flow (C):**
1. Inviter dispatches invite via existing B flow (creates `invitations` row).
2. If inviter is online + unlocked AND the invitee has a published public key (existing registered user with keypair generated): inviter wraps the DEK for the invitee's public key as part of the invite POST. The `workspace_memberships` row created at accept-time receives the wrap immediately.
3. If invitee doesn't have a published public key (never opened settings, never generated keypair): invite is marked `wrapping_pending`. On invitee's next encrypted-tool open / settings visit, they generate a keypair, then any current member sees a "Pending wraps" prompt and finishes the wrap.

**Member removal (C):**
1. Remove `workspace_memberships` row.
2. Trigger DEK rotation in the background (Settings can also offer "Rotate now").

**Key rotation (C):**
1. Org Admin / Owner triggers via Settings.
2. Client generates new DEK.
3. For every current member: re-wrap new DEK using their public key. Patch each `workspace_memberships[uid].wrappedDek` + bump `wrappedDekVersion`.
4. Background job: read every entry in every encrypted-tool collection for this workspace, decrypt with old DEK, re-encrypt with new DEK, write back.
5. `workspaces.settings.encryption.rotatedAt = now()`. Old DEK held in memory until done; on success, cleared.

### Tool gating with C

Once `workspaces.settings.encryption` is non-null, the placeholder card goes away. Tool routes (Password Manager, etc.) hydrate the DEK from the user's `wrappedDek` on workspace switch, decrypt entries client-side, and behave normally.

### Backend new routes (C)

```
GET    /api/backend/workspaces-api/users/me/keypair       returns publicKey + privateKeyEncrypted blob
POST   /api/backend/workspaces-api/users/me/keypair       set publicKey + privateKeyEncrypted

GET    /api/backend/workspaces-api/workspaces/{ws_id}/dek-wrap         current user's wrappedDek
POST   /api/backend/workspaces-api/workspaces/{ws_id}/dek-wrap         (Admin) wrap DEK for a new member
POST   /api/backend/workspaces-api/workspaces/{ws_id}/rotate-dek       (Admin) submit new wraps + bumpVersion
GET    /api/backend/workspaces-api/workspaces/{ws_id}/pending-wraps    list members awaiting wrap

GET    /api/backend/workspaces-api/users/by-email?email=...&org_id=... returns publicKey + uid for inviter wrap prep
```

### Personal-workspace data — no change

Master-key flow stays identical. The new `users.encryption.publicKey` keypair is purely for sharing workspace DEKs to other users; it never touches Personal-workspace data.

---

## Backwards-compat & migration plan

- B is fully additive on top of A. No data backfill required. Existing Personal workspaces work as before.
- A's `apply_workspace_filter` / `apply_legacy_or_filter` helpers stay unchanged.
- Sub-project A's transitional `apply_legacy_or_filter` `$or` branch can be removed in a B-era follow-up PR once `users.migrated_at` is set for all live users. Out of scope for B itself.
- C requires no data migration on existing personal data. Shared workspaces created in B (no DEK) keep the placeholder UX until a member explicitly opts in via the workspace settings page; opt-in generates a DEK and wraps for all current members.

## Testing strategy

### Backend (pytest)

- **B**: org / workspace CRUD with role gating; member invite/accept/revoke flows for both registered and unregistered emails; role cascade (Org Owner has Workspace Admin powers without explicit membership); soft-delete behavior + sweeper test; RBAC matrix completeness test (every tool listed in `tools-registry` has an entry).
- **C**: keypair endpoints; wrap/unwrap round-trip; rotation invariants (every membership has matching `wrappedDekVersion`); pending-wraps list correctness after invitee keypair publish.
- A's existing isolation tests stay valid — the personal-workspace invariant is unchanged.

### Frontend (Jest)

- Switcher dropdown: org-grouped rendering, CTA visibility per role, search filter behavior at ≥10 workspaces.
- RBAC hook: `useToolPermission` returns correct boolean for every (role, tool, permission) triple in the matrix.
- Sidebar role-gating: tools hidden when role lacks read; auto-unpin behavior at render time (no store write).
- BroadcastChannel: setActiveWorkspace in tab A triggers re-hydrate in tab B.
- Crypto: `wrapDekForMember` then `unwrapDek` round-trip equals original DEK; encryptEntry/decryptEntry round-trip equals plaintext.

### Manual verification (gates merge for each sub-project)

- **B merge gate**: create org → invite member by registered email → member sees pending invitation → accepts → has access per role → role change reflected in sidebar → remove member, confirm cascade.
- **C merge gate**: in a shared workspace, create a password entry as Member A → Member B sees the entry (after wrap) and can decrypt → remove Member B → trigger rotation → Member A still reads after rotation → no plaintext ever in network traffic for encrypted-tool entries (network tab inspection).

## Risks

- **Email deliverability:** Resend free-tier hits 100 emails/day. Past that, paid plan required. Spam-filter classification depends on sender domain reputation; using `<noreply>@mydevtools.tech` requires SPF/DKIM setup — flag for ops.
- **Lost master password = lost shared workspace access** in C. The private key is encrypted with the master key; backup codes (already shipped) recover the master, but if a user loses both, they lose access to every shared workspace they're a member of. Their data isn't lost (other members can re-wrap for a regenerated keypair), but documented recovery flow is required.
- **Inviter offline at invite time in C:** the `wrapping_pending` state can stall invitations. Mitigation: any existing member can complete the wrap, not only the inviter. If no member completes within the 14-day window, the invitation expires and the inviter is notified.
- **DEK rotation cost:** for a large workspace with thousands of encrypted entries, rotation re-encrypts every entry. Done as a background job with progress UI; failure mid-rotation leaves the workspace in a mixed-DEK state. Mitigation: atomic batch flip — write all re-encrypted entries to a shadow collection, then atomic rename + drop original. Backup must be in place before rotation triggers.
- **B's RBAC matrix divergence between frontend and backend:** twin source-of-truth. Mitigation: backend exposes `GET /workspaces-api/rbac/matrix`; frontend hydrates on app boot; type-checked union of tool slugs comes from the tools-registry constant. A contract test runs in CI comparing the two files for completeness.

## Implementation order

### Sub-project B

1. Backend: schemas + indexes + soft-delete + new routes (org CRUD, workspace CRUD, invitations).
2. Backend: RBAC matrix + `require_permission` dependency. Wrap every existing scoped route's CRUD endpoints.
3. Backend: invitation token + Resend email integration.
4. Backend: tests for B.
5. Frontend: workspace-rbac.ts matrix + `useToolPermission` hook + sidebar gating + auto-unpin.
6. Frontend: switcher dropdown upgrade.
7. Frontend: CreateOrg / CreateWorkspace / InviteMember dialogs.
8. Frontend: `/settings/workspaces` page with member management.
9. Frontend: pending-invitations badge + accept flow.
10. Frontend: EncryptedToolPlaceholder + route gating for password/env/api-key-vault in shared workspaces.
11. Frontend: BroadcastChannel cross-tab sync.
12. Frontend: tests for B.
13. Manual verification for B → ship.

### Sub-project C

14. Crypto utilities (Web Crypto API) + Jest round-trip tests.
15. Backend: users.keypair endpoints + workspace_memberships.wrappedDek field.
16. Backend: dek-wrap, rotate-dek, pending-wraps routes.
17. Frontend: keypair generation on first encrypted-tool open / settings opt-in.
18. Frontend: workspace DEK hydration on workspace switch.
19. Frontend: integrate DEK into Password Manager / Environment Manager / API Key Vault encryption (replace master-key with DEK for shared workspaces; Personal keeps master-key).
20. Frontend: rotate-key UI in workspace settings.
21. Frontend: pending-wraps UX (any member can complete).
22. Backend: re-encryption background job for DEK rotation.
23. Tests for C.
24. Manual verification for C → ship.

## Open questions (for user)

None — all major decisions have defaults baked in above. Edit this spec in place to override before plan is written.
