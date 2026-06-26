# Master Key Gate UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the master-password modal from flashing on every navigation to a critical app. The modal opens only when the user clicks "Unlock" on the locked placeholder.

**Architecture:** One restoration path on app boot (`VaultKeyRestorer`) drives a state machine in the Zustand store (`restoring | not-configured | locked | unlocked`). Critical pages render skeleton → placeholder → app by reading store status. `useVaultGuard` is demoted to a pure selector (no side effects). `MasterPasswordGate` deletes its own restoration logic and becomes dumb UI fed by the store.

**Tech Stack:** Next.js 15 (App Router), React, TypeScript, Zustand, Jest + Testing Library, IndexedDB, Web Crypto API, shadcn/ui, framer-motion.

## Global Constraints

- All work in `apps/web/` workspace.
- Path alias: `@/` → `apps/web/src/`.
- Tests live in `__tests__/` directories, file pattern `*.test.ts` / `*.test.tsx`. Run with `pnpm --filter web test` (jest, configured in `apps/web/jest.config.js`).
- No new dependencies. No backend changes. No changes to encryption / key derivation / backup-code flow.
- The Zustand store remains in-memory only (no `persist` middleware). `CryptoKey` continues to live in IndexedDB via existing `key-storage.ts` helpers.
- Match existing TypeScript style (4-space indent in the affected files, double quotes, no semicolons in store/hook files — copy the file's local style).
- Commit messages: conventional commits prefix (`feat:`, `refactor:`, `test:`, `chore:`).

---

## File Structure

| File | Responsibility | Action |
|------|---------------|--------|
| `apps/web/src/store/master-key-store.ts` | Store + status state machine + vault cache. | Modify |
| `apps/web/src/lib/restore-vault.ts` | Pure async function that resolves the restoration outcome. Easy to unit-test. | **Create** |
| `apps/web/src/lib/__tests__/restore-vault.test.ts` | Unit tests for the 5 restoration branches. | **Create** |
| `apps/web/src/app/app/app-content.tsx` | `VaultKeyRestorer` calls `restoreVault()` and dispatches store mutations from the result. | Modify |
| `apps/web/src/hooks/use-vault-guard.ts` | Pure selector — returns `status`, `isUnlocked`, `isRestoring`, `openVaultGate`. | Modify |
| `apps/web/src/components/vault-restoring-skeleton.tsx` | Generic shadcn `Skeleton`-based placeholder shown during restore. | **Create** |
| `apps/web/src/components/master-password-gate.tsx` | Delete `initGate`, `mode === "loading"`, internal `vault` state. Read `vault` from store. Drop `closeVaultGate` dependency from `useVaultGuard`. | Modify |
| `apps/web/src/app/app/password-manager/page.tsx` | Add `if (isRestoring) return <VaultRestoringSkeleton />` branch. | Modify |
| `apps/web/src/app/app/sql-client/page.tsx` | Same render-by-status pattern. | Modify |
| `apps/web/src/app/app/database-explorer/page.tsx` | Same render-by-status pattern. | Modify |
| `apps/web/src/app/app/environment-manager/page.tsx` | Same render-by-status pattern. | Modify |
| `apps/web/src/app/app/s3-drive/page.tsx` | Switch from `useMasterKeyStore` selector to `useVaultGuard`, add restoring branch. | Modify |
| `apps/web/src/app/app/redis-commander/page.tsx` | Same render-by-status pattern. | Modify |

---

## Task 1: Extend the master-key store with the new state machine

**Files:**
- Modify: `apps/web/src/store/master-key-store.ts`

**Interfaces:**
- Consumes: existing `MasterVaultOut` type from `@/lib/global-vault-api`.
- Produces:
  - Type `VaultStatus = "restoring" | "not-configured" | "locked" | "unlocked"`.
  - Store fields `vaultStatus: VaultStatus`, `vault: MasterVaultOut | null`, `restoreError: string | null`, plus existing `encryptionKey`, `vaultGateOpen`.
  - Computed `isUnlocked` is `vaultStatus === "unlocked"` (no longer a stored field).
  - Actions: `setKey(key)`, `clearKey()`, `setVaultStatus(s)`, `setVault(v)`, `setRestoreError(msg)`, `openVaultGate()`, `closeVaultGate()`.
  - `setKey` mutates `{ encryptionKey: key, vaultStatus: "unlocked", vaultGateOpen: false, restoreError: null }`.
  - `clearKey` mutates `{ encryptionKey: null, vaultStatus: "restoring", vault: null, restoreError: null, vaultGateOpen: false }`.

- [ ] **Step 1: Replace the file contents**

```ts
import { create } from "zustand"
import type { MasterVaultOut } from "@/lib/global-vault-api"

export type VaultStatus =
    | "restoring"
    | "not-configured"
    | "locked"
    | "unlocked"

interface MasterKeyStore {
    encryptionKey: CryptoKey | null
    vaultStatus: VaultStatus
    vault: MasterVaultOut | null
    restoreError: string | null
    isUnlocked: boolean
    vaultGateOpen: boolean

    setKey: (key: CryptoKey) => void
    clearKey: () => void
    setVaultStatus: (status: VaultStatus) => void
    setVault: (vault: MasterVaultOut | null) => void
    setRestoreError: (err: string | null) => void
    openVaultGate: () => void
    closeVaultGate: () => void
}

export const useMasterKeyStore = create<MasterKeyStore>((set) => ({
    encryptionKey: null,
    vaultStatus: "restoring",
    vault: null,
    restoreError: null,
    isUnlocked: false,
    vaultGateOpen: false,

    setKey: (key) =>
        set({
            encryptionKey: key,
            vaultStatus: "unlocked",
            isUnlocked: true,
            vaultGateOpen: false,
            restoreError: null,
        }),

    clearKey: () =>
        set({
            encryptionKey: null,
            vaultStatus: "restoring",
            isUnlocked: false,
            vault: null,
            restoreError: null,
            vaultGateOpen: false,
        }),

    setVaultStatus: (status) =>
        set({ vaultStatus: status, isUnlocked: status === "unlocked" }),

    setVault: (vault) => set({ vault }),

    setRestoreError: (err) => set({ restoreError: err }),

    openVaultGate: () => set({ vaultGateOpen: true }),
    closeVaultGate: () => set({ vaultGateOpen: false }),
}))
```

- [ ] **Step 2: Type-check the workspace**

Run: `pnpm --filter web typecheck`
Expected: failures in files that consume the old `VaultStatus = "unknown" | ...` — those are addressed in later tasks. The store file itself must compile cleanly.

If `typecheck` script doesn't exist, run `pnpm --filter web exec tsc --noEmit` instead. Either way, errors at this point should only point to files we plan to modify in later tasks (gate, restorer, hook, pages). Make a note of them; do not silence them here.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/store/master-key-store.ts
git commit -m "refactor(master-key): introduce vault state machine"
```

---

## Task 2: Pure `restoreVault()` function with unit tests

**Files:**
- Create: `apps/web/src/lib/restore-vault.ts`
- Create: `apps/web/src/lib/__tests__/restore-vault.test.ts`

**Interfaces:**
- Consumes:
  - `MasterVaultOut` from `@/lib/global-vault-api`.
- Produces:
  - Type `RestoreResult` (discriminated union, see code).
  - Function `restoreVault(deps: RestoreDeps): Promise<RestoreResult>`.
  - `deps` shape: `{ loadMasterKey, getMasterVaultOrNull, verifyKey, clearMasterKey }` — all required, no defaults. Caller in `app-content.tsx` injects the real implementations; tests inject mocks.

- [ ] **Step 1: Write the failing test file**

`apps/web/src/lib/__tests__/restore-vault.test.ts`:

```ts
import { restoreVault, type RestoreDeps } from "../restore-vault"

const fakeKey = { type: "secret" } as unknown as CryptoKey
const fakeVault = {
    salt: "salt",
    verifier: { encrypted: "enc", iv: "iv" },
} as any

function makeDeps(over: Partial<RestoreDeps> = {}): RestoreDeps {
    return {
        loadMasterKey: jest.fn().mockResolvedValue(null),
        getMasterVaultOrNull: jest.fn().mockResolvedValue(null),
        verifyKey: jest.fn().mockResolvedValue(false),
        clearMasterKey: jest.fn().mockResolvedValue(undefined),
        ...over,
    }
}

describe("restoreVault", () => {
    it("returns not-configured when there is no vault on the server", async () => {
        const deps = makeDeps({
            getMasterVaultOrNull: jest.fn().mockResolvedValue(null),
        })
        const result = await restoreVault(deps)
        expect(result).toEqual({ status: "not-configured" })
    })

    it("returns unlocked when saved key verifies against the vault", async () => {
        const deps = makeDeps({
            loadMasterKey: jest.fn().mockResolvedValue(fakeKey),
            getMasterVaultOrNull: jest.fn().mockResolvedValue(fakeVault),
            verifyKey: jest.fn().mockResolvedValue(true),
        })
        const result = await restoreVault(deps)
        expect(result).toEqual({
            status: "unlocked",
            vault: fakeVault,
            key: fakeKey,
        })
        expect(deps.clearMasterKey).not.toHaveBeenCalled()
    })

    it("clears the saved key and returns locked when verification fails", async () => {
        const clearMasterKey = jest.fn().mockResolvedValue(undefined)
        const deps = makeDeps({
            loadMasterKey: jest.fn().mockResolvedValue(fakeKey),
            getMasterVaultOrNull: jest.fn().mockResolvedValue(fakeVault),
            verifyKey: jest.fn().mockResolvedValue(false),
            clearMasterKey,
        })
        const result = await restoreVault(deps)
        expect(result).toEqual({ status: "locked", vault: fakeVault })
        expect(clearMasterKey).toHaveBeenCalledTimes(1)
    })

    it("returns locked with the vault cached when no key is stored", async () => {
        const deps = makeDeps({
            loadMasterKey: jest.fn().mockResolvedValue(null),
            getMasterVaultOrNull: jest.fn().mockResolvedValue(fakeVault),
        })
        const result = await restoreVault(deps)
        expect(result).toEqual({ status: "locked", vault: fakeVault })
    })

    it("returns error when the vault fetch throws", async () => {
        const deps = makeDeps({
            getMasterVaultOrNull: jest.fn().mockRejectedValue(new Error("net down")),
        })
        const result = await restoreVault(deps)
        expect(result).toEqual({ status: "error", message: "net down" })
    })
})
```

- [ ] **Step 2: Run the tests; expect a module-not-found failure**

Run: `pnpm --filter web exec jest src/lib/__tests__/restore-vault.test.ts`
Expected: `Cannot find module '../restore-vault'`.

- [ ] **Step 3: Create the implementation**

`apps/web/src/lib/restore-vault.ts`:

```ts
import type { MasterVaultOut } from "@/lib/global-vault-api"

export type RestoreResult =
    | { status: "not-configured" }
    | { status: "locked"; vault: MasterVaultOut }
    | { status: "unlocked"; vault: MasterVaultOut; key: CryptoKey }
    | { status: "error"; message: string }

export interface RestoreDeps {
    loadMasterKey: () => Promise<CryptoKey | null>
    getMasterVaultOrNull: () => Promise<MasterVaultOut | null>
    verifyKey: (
        key: CryptoKey,
        encrypted: string,
        iv: string,
    ) => Promise<boolean>
    clearMasterKey: () => Promise<void>
}

export async function restoreVault(deps: RestoreDeps): Promise<RestoreResult> {
    try {
        const vault = await deps.getMasterVaultOrNull()
        if (!vault) return { status: "not-configured" }

        const savedKey = await deps.loadMasterKey()
        if (!savedKey) return { status: "locked", vault }

        const valid = await deps.verifyKey(
            savedKey,
            vault.verifier.encrypted,
            vault.verifier.iv,
        )
        if (!valid) {
            await deps.clearMasterKey()
            return { status: "locked", vault }
        }

        return { status: "unlocked", vault, key: savedKey }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Restore failed"
        return { status: "error", message }
    }
}
```

- [ ] **Step 4: Run the tests; expect all five to pass**

Run: `pnpm --filter web exec jest src/lib/__tests__/restore-vault.test.ts`
Expected: `Tests: 5 passed`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/restore-vault.ts apps/web/src/lib/__tests__/restore-vault.test.ts
git commit -m "feat(master-key): extract pure restoreVault function with tests"
```

---

## Task 3: Wire `VaultKeyRestorer` to the new `restoreVault()` function

**Files:**
- Modify: `apps/web/src/app/app/app-content.tsx`

**Interfaces:**
- Consumes:
  - `restoreVault`, `RestoreResult` from `@/lib/restore-vault`.
  - Store actions: `setKey`, `setVaultStatus`, `setVault`, `setRestoreError`.
- Produces: no module-level exports change.

- [ ] **Step 1: Replace `VaultKeyRestorer` implementation**

`apps/web/src/app/app/app-content.tsx`:

```tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { ClientLayout } from '../../components/sidebar/client-layout';
import { RequireAuth } from '@/components/require-auth';
import { MasterPasswordGate } from '@/components/master-password-gate';
import { useMasterKeyStore } from '@/store/master-key-store';
import { loadMasterKey, clearMasterKey } from '@/lib/key-storage';
import { getMasterVaultOrNull } from '@/lib/global-vault-api';
import { verifyKey } from '@/lib/encryption';
import { restoreVault } from '@/lib/restore-vault';
import useAuth from '@/utils/useAuth';

// Single restoration path. Runs once per signed-in user mount. Mutates the
// store with the final state — modal and pages read from store only.
function VaultKeyRestorer() {
  const { user } = useAuth(false);
  const { vaultStatus, setKey, setVaultStatus, setVault, setRestoreError } =
    useMasterKeyStore();
  const ranRef = useRef(false);

  useEffect(() => {
    if (!user || vaultStatus !== 'restoring' || ranRef.current) return;
    ranRef.current = true;

    (async () => {
      const result = await restoreVault({
        loadMasterKey,
        getMasterVaultOrNull,
        verifyKey,
        clearMasterKey,
      });

      switch (result.status) {
        case 'not-configured':
          setVault(null);
          setVaultStatus('not-configured');
          return;
        case 'unlocked':
          setVault(result.vault);
          setKey(result.key);
          return;
        case 'locked':
          setVault(result.vault);
          setVaultStatus('locked');
          return;
        case 'error':
          setRestoreError(result.message);
          setVaultStatus('locked');
          return;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, vaultStatus]);

  return null;
}

export function AppContent({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <MasterPasswordGate />
      <VaultKeyRestorer />
      <ClientLayout>{children}</ClientLayout>
    </RequireAuth>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no errors in `app-content.tsx`. (Other files still error — fixed in later tasks.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/app/app-content.tsx
git commit -m "refactor(master-key): make restorer the sole restoration path"
```

---

## Task 4: Demote `useVaultGuard` to a pure selector

**Files:**
- Modify: `apps/web/src/hooks/use-vault-guard.ts`

**Interfaces:**
- Consumes: store fields `vaultStatus`, `openVaultGate`.
- Produces:
  - Hook returns `{ status: VaultStatus, isUnlocked: boolean, isRestoring: boolean, openVaultGate: () => void }`.
  - **No side effects**: no `useEffect`, no auto-open, no cleanup.

- [ ] **Step 1: Replace the file contents**

```ts
"use client"

import { useMasterKeyStore, type VaultStatus } from "@/store/master-key-store"

/**
 * Read-only vault state for critical pages. Does NOT open the modal.
 * Render the locked placeholder, which has the user-triggered Unlock button.
 */
export function useVaultGuard() {
    const vaultStatus = useMasterKeyStore((s) => s.vaultStatus)
    const openVaultGate = useMasterKeyStore((s) => s.openVaultGate)

    return {
        status: vaultStatus as VaultStatus,
        isUnlocked: vaultStatus === "unlocked",
        isRestoring: vaultStatus === "restoring",
        openVaultGate,
    }
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: hook file clean. Page files still reference `useVaultGuard().isUnlocked`, which still works (preserved on return value).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/hooks/use-vault-guard.ts
git commit -m "refactor(master-key): make useVaultGuard a pure selector"
```

---

## Task 5: Create `VaultRestoringSkeleton` component

**Files:**
- Create: `apps/web/src/components/vault-restoring-skeleton.tsx`

**Interfaces:**
- Consumes: `Skeleton` from `@/components/ui/skeleton`.
- Produces: `<VaultRestoringSkeleton />` — no props.

- [ ] **Step 1: Create the file**

```tsx
"use client"

import { Skeleton } from "@/components/ui/skeleton"

/**
 * Shown while the master-key restorer is still running on app boot.
 * Generic shell — fine for every critical app since restore finishes in
 * milliseconds and the user never reads it.
 */
export function VaultRestoringSkeleton() {
    return (
        <div className="h-full flex flex-col container mx-auto px-4 md:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6 shrink-0">
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-9 w-36" />
            </div>
            <div className="flex gap-3 mb-6">
                <Skeleton className="h-9 flex-1 max-w-sm" />
                <Skeleton className="h-9 w-24" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-36 w-full rounded-xl" />
                ))}
            </div>
        </div>
    )
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: file compiles.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/vault-restoring-skeleton.tsx
git commit -m "feat(master-key): add VaultRestoringSkeleton placeholder"
```

---

## Task 6: Simplify `MasterPasswordGate`

**Files:**
- Modify: `apps/web/src/components/master-password-gate.tsx`

**Interfaces:**
- Consumes: store fields `vaultStatus`, `vault`, `vaultGateOpen`, `setKey`, `closeVaultGate`.
- Produces: no exports change.

This task deletes the modal's internal restoration logic and lets it read the cached `vault` from the store.

- [ ] **Step 1: Replace the top of the component (imports, state, effects)**

Delete the existing imports for `loadMasterKey`, `clearMasterKey`, the `setVaultStatus` destructure, the `vaultStatus` destructure, the `initRef`, `initGate()`, the two `useEffect`s, and the local `vault` state.

Read the current file to confirm exact line locations, then apply these replacements:

Replace the `useState`/`useRef` block (lines 63–75 in the current file) with:

```tsx
    const [mode, setMode] = useState<GateMode>("unlock")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [shake, setShake] = useState(false)
    const [backupCodes, setBackupCodes] = useState<string[]>([])
    const [backupCodesAcknowledged, setBackupCodesAcknowledged] = useState(false)
    const [backupCodeInput, setBackupCodeInput] = useState("")
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
```

Replace the `useMasterKeyStore()` destructure (line 60–61) with:

```tsx
    const { isUnlocked, vault, vaultStatus, vaultGateOpen, setKey, closeVaultGate } =
        useMasterKeyStore()
```

Delete the two `useEffect` blocks (the one running `initGate` and the one resetting `initRef` on close) and the `initGate` function entirely. Replace with this single effect that picks the mode whenever the gate is opened:

```tsx
    useEffect(() => {
        if (!vaultGateOpen) {
            resetForm()
            setMode("unlock")
            return
        }
        if (vaultStatus === "not-configured") setMode("setup")
        else setMode("unlock")
    }, [vaultGateOpen, vaultStatus])
```

Remove the `GateMode` `"loading"` variant from the union:

```tsx
type GateMode = "setup" | "backup-codes" | "unlock" | "use-backup-code"
```

- [ ] **Step 2: Update all references that read the local `vault` to read from the store**

Search the file for `vault.salt`, `vault.verifier`, and any other access. They already destructure `vault` from props — now they read it from the store destructure above. No code changes needed in the body provided you removed the `useState`/`setVault` for the local one.

In `handleUnlock`, change the guard from `if (!password || !vault) return` to keep `vault` referring to the store-sourced value (no rename required).

In `handleBackupCodeUnlock`, same — `vault` already refers to the store value.

- [ ] **Step 3: Delete the loading-mode UI**

Find the icon/heading block that branches on `mode === "loading"`. Remove the `loading` branch from the icon block (`<motion.div animate={mode === "loading" ? ...} />` and the conditional `<Shield />` rendering for loading). Remove the entire loading progress block (`{mode === "loading" && (<div className="flex justify-center">...)`).

The simplest concrete replacement: delete every block whose JSX condition is `mode === "loading"`. Also drop the `mode === "loading"` branches inside the heading text and description ternaries — those branches become impossible to reach. The forms wrapper `{mode !== "loading" && (` becomes unconditional — remove the `&&` guard.

- [ ] **Step 4: Update `dialogOpen`**

Find the line `const dialogOpen = (vaultGateOpen && !isUnlocked) || showBackupCodes` and replace with:

```tsx
    const dialogOpen = vaultGateOpen || showBackupCodes
```

- [ ] **Step 5: Type-check + run the existing test suite**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no errors.

Run: `pnpm --filter web exec jest`
Expected: existing tests still pass; new `restore-vault` tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/master-password-gate.tsx
git commit -m "refactor(master-password-gate): drop internal restore, read from store"
```

---

## Task 7: Apply render-by-status to all six critical pages

**Files:**
- Modify: `apps/web/src/app/app/password-manager/page.tsx`
- Modify: `apps/web/src/app/app/sql-client/page.tsx`
- Modify: `apps/web/src/app/app/database-explorer/page.tsx`
- Modify: `apps/web/src/app/app/environment-manager/page.tsx`
- Modify: `apps/web/src/app/app/s3-drive/page.tsx`
- Modify: `apps/web/src/app/app/redis-commander/page.tsx`

**Interfaces:**
- Consumes: `useVaultGuard()` returning `{ status, isUnlocked, isRestoring, openVaultGate }`. `VaultLockedPlaceholder`, `VaultRestoringSkeleton` components.
- Produces: no exports change.

For each page, the existing locked-placeholder branch becomes preceded by a restoring branch:

```tsx
if (isRestoring) return <VaultRestoringSkeleton />
if (!isUnlocked) return <VaultLockedPlaceholder appName="..." />
```

- [ ] **Step 1: password-manager**

Add to imports: `import { VaultRestoringSkeleton } from "@/components/vault-restoring-skeleton"`.

Replace `const { isUnlocked } = useVaultGuard()` with `const { isUnlocked, isRestoring } = useVaultGuard()`.

Replace `if (!isUnlocked) return <VaultLockedPlaceholder appName="Password Manager" />` with:

```tsx
    if (isRestoring) return <VaultRestoringSkeleton />
    if (!isUnlocked) return <VaultLockedPlaceholder appName="Password Manager" />
```

- [ ] **Step 2: sql-client**

Same pattern, `appName="SQL Client"`.

- [ ] **Step 3: database-explorer**

Same pattern, `appName="Database Explorer"`. The page also references `isUnlocked` in a `useEffect` dep array — leave that untouched.

- [ ] **Step 4: environment-manager**

Same pattern, `appName="Environment Manager"`.

- [ ] **Step 5: s3-drive**

This page currently pulls `{ encryptionKey, isUnlocked }` directly from `useMasterKeyStore`. Switch to `useVaultGuard` for the status flags, keep `encryptionKey` from the store:

```tsx
import { useVaultGuard } from "@/hooks/use-vault-guard"
import { VaultRestoringSkeleton } from "@/components/vault-restoring-skeleton"
// ...
const { encryptionKey } = useMasterKeyStore()
const { isUnlocked, isRestoring } = useVaultGuard()
// ...
if (isRestoring) return <VaultRestoringSkeleton />
if (!isUnlocked || !encryptionKey) return <VaultLockedPlaceholder appName="S3 Drive" />
```

- [ ] **Step 6: redis-commander**

Same pattern, `appName="Redis Commander"`. Existing branch wraps the placeholder in a `<div>` — keep that wrapper, just add the restoring branch above.

- [ ] **Step 7: Type-check, lint, test**

```bash
pnpm --filter web exec tsc --noEmit
pnpm --filter web exec jest
```

Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/app/app/password-manager/page.tsx \
        apps/web/src/app/app/sql-client/page.tsx \
        apps/web/src/app/app/database-explorer/page.tsx \
        apps/web/src/app/app/environment-manager/page.tsx \
        apps/web/src/app/app/s3-drive/page.tsx \
        apps/web/src/app/app/redis-commander/page.tsx
git commit -m "feat(master-key): render skeleton during vault restore"
```

---

## Task 8: Manual verification + final type-check

This is a verification task, not a code task. The change must be exercised in a browser before declaring done.

- [ ] **Step 1: Boot dev server**

Run: `pnpm --filter web dev`

- [ ] **Step 2: Logged-out → log in (valid saved key path)**

Steps: log in, navigate to `/app/password-manager`.
Expected: skeleton flashes briefly (≤500 ms on warm IndexedDB), then real app renders. **No modal.**

- [ ] **Step 3: Soft nav between apps**

Steps: click `/app/sql-client`, then `/app/redis-commander`, then `/app/environment-manager`.
Expected: each renders immediately. No skeleton, no modal.

- [ ] **Step 4: Hard refresh on a critical app**

Steps: while on `/app/sql-client`, hit Cmd+R.
Expected: skeleton flashes briefly, then real app. No modal.

- [ ] **Step 5: Locked path (no saved key)**

Steps: open devtools → Application → IndexedDB → delete `MasterKeyDB`. Reload `/app/password-manager`.
Expected: skeleton → `VaultLockedPlaceholder`. Click "Unlock vault" → modal opens. Enter master password → unlock → app renders. No flash.

- [ ] **Step 6: First-time user (not-configured path)**

Steps: in a test account that has no master vault yet, navigate to a critical app.
Expected: skeleton → placeholder. Click "Unlock vault" → modal opens in **setup** mode. Complete setup → backup-codes view → acknowledge → app renders.

- [ ] **Step 7: Network failure path**

Steps: in devtools Network tab, block `master-vault` request. Reload `/app/password-manager`.
Expected: skeleton → placeholder (no console error UI). Click "Unlock vault" → modal opens. Unblock request, retry — completes normally.

- [ ] **Step 8: Run the full test suite once more**

```bash
pnpm --filter web exec tsc --noEmit
pnpm --filter web exec jest
```

Expected: green.

- [ ] **Step 9: Commit anything noted during manual testing (if needed)**

If a regression appears, fix it in a new commit; do not amend.

---

## Self-review

- **Spec coverage**
  - State machine refactor — Task 1.
  - Restorer as sole restoration path — Task 3, backed by pure function in Task 2.
  - `useVaultGuard` selector — Task 4.
  - Render-by-status pattern across all six critical pages — Task 7.
  - Modal simplification (delete `initGate`, loading mode, internal vault) — Task 6.
  - New `VaultRestoringSkeleton` — Task 5.
  - All five restoration branches tested — Task 2.
  - Edge cases (logout → relogin, refresh, soft nav, network failure, server-side vault wipe, gate invariant) — exercised in Task 8 manual steps.

- **Placeholder scan** — no TBDs, no "implement later", every code block fully populated.

- **Type consistency** — `VaultStatus` enum identical across store, hook, restorer; `RestoreDeps` matches `restoreVault` consumers; component prop signatures unchanged.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-25-master-key-gate-ux.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
