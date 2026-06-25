# Master Key Gate — UX Cleanup

**Date:** 2026-06-25
**Status:** Draft for review
**Scope:** Eliminate the master-password modal flashing on every navigation to a critical app. Modal opens only when user action requires it.

---

## Problem

Every time the user navigates to a critical app (password-manager, sql-client, database-explorer, environment-manager, s3-drive, redis-commander), the master-password modal flashes "Checking vault…" before disappearing — even when the encryption key is already saved in IndexedDB and valid.

### Root cause

Two parallel restoration paths fight each other:

1. `VaultKeyRestorer` (in `app-content.tsx`) silently loads + verifies the master key on user login.
2. `useVaultGuard()` (in each critical page) calls `openVaultGate()` on mount if `!isUnlocked`, regardless of whether restoration is in flight.

The modal opens **before** restoration finishes. Its own `initGate()` duplicates the work the restorer already does. Result: a guaranteed flash on every fresh page load / hard nav, and a duplicate network call to fetch the vault.

### Why "every app move"

Soft client-side navigation preserves Zustand state, so once unlocked, moving between apps should not retrigger the modal. The user reports otherwise — which means in practice the store is being reset (hard nav, refresh, or logout flow) frequently enough that the modal feels omnipresent. Either way, the underlying defect is the same: the gate opens eagerly instead of waiting for restoration.

---

## Goal

- No modal flash when a valid key exists in IndexedDB.
- No duplicate `getMasterVaultOrNull` + `verifyKey` work.
- Modal opens **only** on explicit user action (clicking "Unlock" on the placeholder).
- During the brief restoration window, the user sees a skeleton, not a modal.
- All other vault flows (setup, backup codes, backup-code recovery) preserved unchanged.

---

## Design

### 1. Store state machine

Single source of truth in `master-key-store.ts`. Replace the current `VaultStatus = "unknown" | "not-configured" | "locked" | "unlocked"` with:

```ts
type VaultStatus =
  | "restoring"        // initial: trying IndexedDB + server check
  | "not-configured"   // no vault on server (first-time user)
  | "locked"           // vault exists, no valid in-memory key
  | "unlocked"         // key loaded + verified

interface MasterKeyStore {
  encryptionKey: CryptoKey | null
  vaultStatus: VaultStatus
  vault: MasterVaultOut | null    // cached after restorer fetch, reused by modal
  vaultGateOpen: boolean           // user-triggered ONLY
  restoreError: string | null      // surfaces network failure to placeholder

  setKey: (key: CryptoKey) => void
  clearKey: () => void
  setVaultStatus: (status: VaultStatus) => void
  setVault: (vault: MasterVaultOut | null) => void
  setRestoreError: (err: string | null) => void
  openVaultGate: () => void
  closeVaultGate: () => void
}
```

Initial `vaultStatus = "restoring"` (not `"unknown"`). Derived selector:

```ts
isUnlocked = vaultStatus === "unlocked"
```

`setKey` flips status to `"unlocked"` and closes the gate (existing behavior).
`clearKey` resets status to `"restoring"` so the restorer reruns on next user mount (logout → relogin path).

### 2. Restorer = single source of restoration

`VaultKeyRestorer` in `app-content.tsx` becomes the only place that runs the boot-time restore. Flow:

1. On `user` ready and `vaultStatus === "restoring"`:
2. `loadMasterKey()` from IndexedDB.
3. `getMasterVaultOrNull()` from server.
4. Cache result with `setVault(vaultData)`.
5. Branch:
   - No vault on server → `setVaultStatus("not-configured")`.
   - Vault exists + saved key + `verifyKey()` valid → `setKey(savedKey)` (status flips to `"unlocked"`).
   - Vault exists + saved key invalid → `clearMasterKey()` + `setVaultStatus("locked")`.
   - Vault exists + no saved key → `setVaultStatus("locked")`.
6. On thrown error → `setRestoreError(message)` + `setVaultStatus("locked")` (user can retry via the modal which re-fetches).

`MasterPasswordGate.initGate()` is **deleted**. The modal reads `vault` from the store; no duplicate fetch.

### 3. `useVaultGuard` — pure selector

Strip side effects entirely:

```ts
export function useVaultGuard() {
  const { vaultStatus, openVaultGate } = useMasterKeyStore()
  return {
    status: vaultStatus,
    isUnlocked: vaultStatus === "unlocked",
    isRestoring: vaultStatus === "restoring",
    openVaultGate, // for user-triggered open from placeholder
  }
}
```

No `useEffect`, no auto-open, no cleanup. The hook only reports state.

### 4. Critical page render pattern

Each critical page renders by status:

```tsx
const { status, isUnlocked } = useVaultGuard()

if (status === "restoring") return <VaultRestoringSkeleton />
if (!isUnlocked) return <VaultLockedPlaceholder appName="Password Manager" />
// ...real app
```

- `"restoring"` → new `VaultRestoringSkeleton` component (single generic component reused across all critical apps, shadcn `Skeleton` rows).
- `"locked"` / `"not-configured"` → existing `VaultLockedPlaceholder` with "Unlock" button that calls `openVaultGate()`.
- `"unlocked"` → app renders.

Applied to: `password-manager`, `sql-client`, `database-explorer`, `environment-manager`, `s3-drive`, `redis-commander`.

### 5. `MasterPasswordGate` simplification

- Delete `initGate()` and the `mode === "loading"` UI (no more "Checking vault…").
- Delete internal `vault` state — read from store.
- Mode derived from store status on dialog open:
  - status `"not-configured"` → mode `"setup"`
  - status `"locked"` → mode `"unlock"`
- `dialogOpen = vaultGateOpen || showBackupCodes` (drop the `&& !isUnlocked` clause — user never opens gate while unlocked).
- After successful unlock or setup → `setKey()` flips status to `"unlocked"` and closes the gate (already the existing `setKey` behavior).
- Post-setup backup-codes screen unchanged.
- Backup-code recovery unchanged.

### 6. New component

`apps/web/src/components/vault-restoring-skeleton.tsx` — small (~20 lines), shadcn `Skeleton`-based, no per-app variant. ponytail: one component, generic shell.

---

## Edge cases

| Case | Behavior |
|------|----------|
| Logout → relogin | `clearKey()` resets status to `"restoring"`; restorer reruns on next user mount. |
| Refresh on critical page | Restorer runs once; page shows skeleton briefly; flips to unlocked (saved key valid) or placeholder (no key). |
| Soft nav between apps when unlocked | No skeleton, no modal — instant render. |
| Network failure during restore | `setRestoreError` + status `"locked"`. Placeholder shows. Modal retries on Unlock click. |
| Vault wiped server-side after unlock | `verifyKey` fails → IndexedDB key cleared → `"locked"`. |
| `vaultGateOpen` flipped only by user action or successful unlock. Never auto-opened. |

---

## Files affected

| File | Change |
|------|--------|
| `apps/web/src/store/master-key-store.ts` | Add `restoring` status, `vault` cache, `restoreError`, new setters. |
| `apps/web/src/app/app/app-content.tsx` | `VaultKeyRestorer` becomes authoritative; handles all branches. |
| `apps/web/src/hooks/use-vault-guard.ts` | Strip side effects; pure selector. |
| `apps/web/src/components/master-password-gate.tsx` | Delete `initGate`, `loading` mode, internal `vault` state. Read from store. |
| `apps/web/src/components/vault-restoring-skeleton.tsx` | **New.** Generic shadcn `Skeleton` shell. |
| `apps/web/src/app/app/password-manager/page.tsx` | Render by status. |
| `apps/web/src/app/app/sql-client/page.tsx` | Render by status. |
| `apps/web/src/app/app/database-explorer/page.tsx` | Render by status. |
| `apps/web/src/app/app/environment-manager/page.tsx` | Render by status. |
| `apps/web/src/app/app/s3-drive/page.tsx` | Render by status. |
| `apps/web/src/app/app/redis-commander/page.tsx` | Render by status. |

---

## Testing

Smallest viable check: one unit test for the restorer state machine. Mock `loadMasterKey`, `getMasterVaultOrNull`, `verifyKey`. Assert sequence of `setVaultStatus` / `setKey` / `setVault` calls for each of the five branches:

1. No vault on server → `"not-configured"`.
2. Vault + valid saved key → `"unlocked"`.
3. Vault + invalid saved key → `"locked"` (after `clearMasterKey`).
4. Vault + no saved key → `"locked"`.
5. Fetch throws → `"locked"` with `restoreError` set.

Manual verification: refresh on each critical app — no modal flash; navigate between apps when unlocked — no modal; click Unlock from placeholder — modal opens cleanly.

---

## Non-goals

- No backend changes.
- No encryption / key derivation changes.
- No backup-code flow changes.
- No telemetry, no metrics, no flags.
- No persistence of `encryptionKey` to Zustand storage (security: in-memory + IndexedDB CryptoKey only, unchanged).

---

## ponytail notes

- One component for the skeleton, not six.
- Restorer is the only restoration path. Modal is dumb UI fed by store.
- Status enum is exhaustive — no `"unknown"` middle state to reason about.
- `useVaultGuard` becomes a one-liner selector; cleanup-on-unmount dead code goes away.
