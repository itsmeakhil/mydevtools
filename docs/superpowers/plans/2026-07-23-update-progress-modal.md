# Update Progress Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fire-and-forget update-install paths with one app-wide, phase-narrated, animated progress modal so the user always sees the app downloading, installing, and restarting instead of a silent freeze-then-relaunch.

**Architecture:** `installUpdate()` gains a phase-aware status callback (downloading → installing → restarting) mapped from the Tauri `DownloadEvent`s it already receives. A module-level install store (`use-update-install.ts`) owns install state and exposes both an imperative `startUpdate()` (for the sonner toast callback, which lives outside the React tree) and a `useUpdateInstall()` hook. A single `<UpdateProgressModal>` mounted app-wide in `layout.tsx` renders progress; dismissing it leaves a corner pill that reopens it. All three triggers (auto-check toast, settings dialog, About card) route through the store.

**Tech Stack:** Next.js (static export for Tauri), React, TypeScript, `@tauri-apps/plugin-updater`, `@tauri-apps/plugin-process`, sonner, framer-motion (installed), Radix `ui/progress.tsx`, next-intl, jest.

## Global Constraints

- Work only in `apps/desktop-ui`. No Rust / `src-tauri` changes — the plugin already emits every event needed.
- Build/verify with repo-local bins: `./node_modules/.bin/tsc --noEmit`, `./node_modules/.bin/jest`. `pnpm exec` is broken.
- All new user-visible modal/pill strings via `useTranslations("DesktopUpdate")` — no hardcoded UI text in the new components. Existing sibling updater strings (toast/dialog/About English text) are NOT migrated (out of scope).
- New `DesktopUpdate` namespace added to `messages/en.json` **and all 26 other locales**. A missing key falls back to English via the `deepMerge` in `src/i18n/request.ts`, so en is load-bearing; the 26 locales get translated copies.
- Desktop-only: every trigger and the modal gate on `isDesktop()` (or render null on web).
- Edit files with Read/Edit tools, not shell `sed`/`cat`.
- Commit after each task.

---

### Task 1: Phase-aware status in `updater.ts`

**Files:**
- Modify: `apps/desktop-ui/src/lib/desktop/updater.ts`
- Test: `apps/desktop-ui/src/lib/__tests__/updater-status.test.ts`

**Interfaces:**
- Consumes: `DownloadEvent`, `Update` from `@tauri-apps/plugin-updater`.
- Produces:
  - `type UpdatePhase = "downloading" | "installing" | "restarting"`
  - `type UpdateStatus = { phase: UpdatePhase; downloaded: number; total: number | null }`
  - `function reduceDownloadEvent(prev: { downloaded: number; total: number | null }, event: DownloadEvent): UpdateStatus` (pure, exported for tests)
  - `function pctOf(s: { downloaded: number; total: number | null }): number | null` (clamped 0–100, null when total falsy)
  - `installUpdate(onStatus?: (s: UpdateStatus) => void): Promise<void>` (callback signature CHANGED from `DownloadProgress` to `UpdateStatus`)

- [ ] **Step 1: Write the failing test**

Create `apps/desktop-ui/src/lib/__tests__/updater-status.test.ts`:

```ts
import { reduceDownloadEvent, pctOf } from "@/lib/desktop/updater";

describe("reduceDownloadEvent", () => {
  it("Started captures total and resets downloaded", () => {
    const s = reduceDownloadEvent(
      { downloaded: 999, total: null },
      { event: "Started", data: { contentLength: 500 } } as any
    );
    expect(s).toEqual({ phase: "downloading", downloaded: 0, total: 500 });
  });

  it("Started with no contentLength → total null (indeterminate)", () => {
    const s = reduceDownloadEvent(
      { downloaded: 0, total: null },
      { event: "Started", data: {} } as any
    );
    expect(s.total).toBeNull();
    expect(s.phase).toBe("downloading");
  });

  it("Progress accumulates chunk lengths, keeps total", () => {
    const s = reduceDownloadEvent(
      { downloaded: 100, total: 500 },
      { event: "Progress", data: { chunkLength: 50 } } as any
    );
    expect(s).toEqual({ phase: "downloading", downloaded: 150, total: 500 });
  });

  it("Finished switches phase to installing", () => {
    const s = reduceDownloadEvent(
      { downloaded: 500, total: 500 },
      { event: "Finished", data: {} } as any
    );
    expect(s.phase).toBe("installing");
  });
});

describe("pctOf", () => {
  it("null total → null (indeterminate, no fake number)", () => {
    expect(pctOf({ downloaded: 10, total: null })).toBeNull();
  });
  it("rounds and clamps at 100", () => {
    expect(pctOf({ downloaded: 250, total: 500 })).toBe(50);
    expect(pctOf({ downloaded: 600, total: 500 })).toBe(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/jest src/lib/__tests__/updater-status.test.ts`
Expected: FAIL — `reduceDownloadEvent`/`pctOf` not exported.

- [ ] **Step 3: Implement in `updater.ts`**

Replace the `DownloadProgress` type (line 24) and the `installUpdate` body (lines 48-77). Keep `checkForUpdate`, `currentAppVersion`, `pending` unchanged.

```ts
import type { DownloadEvent, Update } from "@tauri-apps/plugin-updater";

export type UpdatePhase = "downloading" | "installing" | "restarting";
export type UpdateStatus = {
  phase: UpdatePhase;
  downloaded: number;
  total: number | null;
};

/** Map a Tauri DownloadEvent to the next status. Pure — unit tested. */
export function reduceDownloadEvent(
  prev: { downloaded: number; total: number | null },
  event: DownloadEvent
): UpdateStatus {
  switch (event.event) {
    case "Started":
      return {
        phase: "downloading",
        downloaded: 0,
        total: event.data.contentLength ?? null,
      };
    case "Progress":
      return {
        phase: "downloading",
        downloaded: prev.downloaded + event.data.chunkLength,
        total: prev.total,
      };
    case "Finished":
      return { phase: "installing", downloaded: prev.downloaded, total: prev.total };
  }
}

/** Download percentage, or null when the server sent no Content-Length. */
export function pctOf(s: { downloaded: number; total: number | null }): number | null {
  if (!s.total) return null;
  return Math.min(100, Math.round((s.downloaded / s.total) * 100));
}
```

And rewrite `installUpdate`:

```ts
export async function installUpdate(
  onStatus?: (s: UpdateStatus) => void
): Promise<void> {
  if (!pending) {
    await checkForUpdate();
    if (!pending) throw new Error("No update available to install");
  }
  const update = pending;
  let acc: { downloaded: number; total: number | null } = {
    downloaded: 0,
    total: null,
  };

  await update.downloadAndInstall((event) => {
    const s = reduceDownloadEvent(acc, event);
    acc = { downloaded: s.downloaded, total: s.total };
    onStatus?.(s);
  });

  // Bundle swapped in place; now relaunch into the new version.
  onStatus?.({ phase: "restarting", downloaded: acc.downloaded, total: acc.total });
  const { relaunch } = await import("@tauri-apps/plugin-process");
  await relaunch();
}
```

Remove the old `DownloadProgress` export (its only consumers are updated in Tasks 4–5).

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/jest src/lib/__tests__/updater-status.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/desktop-ui/src/lib/desktop/updater.ts apps/desktop-ui/src/lib/__tests__/updater-status.test.ts
git commit -m "feat(updater): phase-aware install status callback"
```

---

### Task 2: Install store + `useUpdateInstall` hook

**Files:**
- Create: `apps/desktop-ui/src/lib/desktop/use-update-install.ts`
- Test: `apps/desktop-ui/src/lib/__tests__/use-update-install.test.ts`

**Interfaces:**
- Consumes: `installUpdate`, `UpdateStatus` from Task 1.
- Produces:
  - `function startUpdate(): void` — imperative; idempotent (no-op while a run is active); begins install, drives status.
  - `function dismissUpdate(): void` — hides modal, keeps run active (corner pill).
  - `function reopenUpdate(): void` — shows modal again.
  - `function retryUpdate(): void` — clears error+status, restarts.
  - `function closeUpdate(): void` — clears everything (error dismissal).
  - `function useUpdateInstall(): { status: UpdateStatus | null; error: string | null; visible: boolean; dismiss: () => void; reopen: () => void; retry: () => void; close: () => void }`

- [ ] **Step 1: Write the failing test**

Create `apps/desktop-ui/src/lib/__tests__/use-update-install.test.ts`. Mock `installUpdate` so we control status emission without Tauri:

```ts
let emit: ((s: any) => void) | undefined;
let resolveInstall: (() => void) | undefined;

jest.mock("@/lib/desktop/updater", () => ({
  installUpdate: jest.fn((onStatus?: (s: any) => void) => {
    emit = onStatus;
    return new Promise<void>((res) => {
      resolveInstall = res;
    });
  }),
}));

import { startUpdate, dismissUpdate, reopenUpdate, closeUpdate } from "@/lib/desktop/use-update-install";
// read module state through a tiny getter the module exposes for tests:
import { __getState } from "@/lib/desktop/use-update-install";

beforeEach(() => {
  emit = undefined;
  resolveInstall = undefined;
  closeUpdate(); // reset store between tests
});

describe("install store", () => {
  it("startUpdate opens modal and enters downloading", async () => {
    startUpdate();
    expect(__getState().visible).toBe(true);
    expect(__getState().status?.phase).toBe("downloading");
  });

  it("status emissions update the store", async () => {
    startUpdate();
    await Promise.resolve(); // let dynamic import().then microtask flush
    emit?.({ phase: "installing", downloaded: 5, total: 5 });
    expect(__getState().status?.phase).toBe("installing");
  });

  it("startUpdate is idempotent while running", async () => {
    startUpdate();
    const first = __getState().status;
    startUpdate();
    expect(__getState().status).toBe(first);
  });

  it("dismiss hides modal but keeps the run; reopen shows it", () => {
    startUpdate();
    dismissUpdate();
    expect(__getState().visible).toBe(false);
    expect(__getState().status).not.toBeNull();
    reopenUpdate();
    expect(__getState().visible).toBe(true);
  });

  it("a rejected install sets error", async () => {
    const { installUpdate } = require("@/lib/desktop/updater");
    (installUpdate as jest.Mock).mockImplementationOnce(() => Promise.reject(new Error("boom")));
    startUpdate();
    await Promise.resolve();
    await Promise.resolve();
    expect(__getState().error).toBe("boom");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/jest src/lib/__tests__/use-update-install.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `use-update-install.ts`**

```ts
"use client";

import { useSyncExternalStore } from "react";

import type { UpdateStatus } from "@/lib/desktop/updater";

type State = {
  status: UpdateStatus | null;
  error: string | null;
  visible: boolean;
};

let state: State = { status: null, error: null, visible: false };
const subscribers = new Set<() => void>();

function set(patch: Partial<State>): void {
  state = { ...state, ...patch };
  subscribers.forEach((fn) => fn());
}

/** Imperative entry point — usable from the sonner toast callback (no React tree). */
export function startUpdate(): void {
  if (state.status) return; // already running
  set({
    status: { phase: "downloading", downloaded: 0, total: null },
    error: null,
    visible: true,
  });
  void import("@/lib/desktop/updater")
    .then(({ installUpdate }) => installUpdate((s) => set({ status: s })))
    .catch((e) =>
      set({ error: e instanceof Error ? e.message : "Update failed to install" })
    );
  // On success the process relaunches — there is no resolve branch to handle.
}

export function dismissUpdate(): void {
  set({ visible: false });
}
export function reopenUpdate(): void {
  set({ visible: true });
}
export function retryUpdate(): void {
  set({ status: null, error: null });
  startUpdate();
}
export function closeUpdate(): void {
  set({ status: null, error: null, visible: false });
}

/** Test-only accessor for the module store. */
export function __getState(): State {
  return state;
}

function subscribe(cb: () => void): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

export function useUpdateInstall() {
  const snap = useSyncExternalStore(
    subscribe,
    () => state,
    () => state
  );
  return {
    ...snap,
    dismiss: dismissUpdate,
    reopen: reopenUpdate,
    retry: retryUpdate,
    close: closeUpdate,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/jest src/lib/__tests__/use-update-install.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/desktop-ui/src/lib/desktop/use-update-install.ts apps/desktop-ui/src/lib/__tests__/use-update-install.test.ts
git commit -m "feat(updater): app-wide install store + useUpdateInstall hook"
```

---

### Task 3: `<UpdateProgressModal>` + corner pill

**Files:**
- Create: `apps/desktop-ui/src/components/desktop/update-progress-modal.tsx`

**Interfaces:**
- Consumes: `useUpdateInstall` (Task 2), `pctOf` (Task 1), `useTranslations("DesktopUpdate")` (Task 6 adds keys; en fallback covers it), `Dialog*` from `ui/dialog`, `Progress` from `ui/progress`, `motion`/`AnimatePresence` from `framer-motion`, lucide `Loader2`.
- Produces: `export function UpdateProgressModal(): JSX.Element | null` — self-contained; reads the store, renders nothing when idle.

Behavior:
- Idle (`status === null`) → render null.
- `restarting` phase → modal is forced open regardless of `visible` (imminent relaunch must be seen) and is non-dismissible.
- `downloading` / `installing` while `visible` → dismissible modal (close button + backdrop call `dismiss()`).
- Not visible but run active → corner pill (fixed bottom-right) with spinner + `Updating… {pct}%`, click → `reopen()`.
- `error !== null` → modal shows error text + Retry (`retry()`) / Close (`close()`); pill hidden.
- Determinate bar via `<Progress value={pct} />` when `pctOf` returns a number; otherwise a framer-motion indeterminate sweep.

- [ ] **Step 1: Implement the component**

```tsx
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { pctOf, type UpdatePhase } from "@/lib/desktop/updater";
import { useUpdateInstall } from "@/lib/desktop/use-update-install";

function IndeterminateBar() {
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-primary/20">
      <motion.div
        className="absolute inset-y-0 w-1/3 rounded-full bg-primary"
        animate={{ x: ["-100%", "300%"] }}
        transition={{ duration: 1.1, ease: "easeInOut", repeat: Infinity }}
      />
    </div>
  );
}

export function UpdateProgressModal() {
  const t = useTranslations("DesktopUpdate");
  const { status, error, visible, dismiss, reopen, retry, close } = useUpdateInstall();

  if (!status) return null;

  const pct = pctOf(status);
  const phase: UpdatePhase = status.phase;
  const locked = phase === "restarting"; // force-open, non-dismissible
  const open = locked || (visible && !error) || (!!error && visible);

  const label =
    error != null
      ? t("failed")
      : phase === "installing"
        ? t("installing")
        : phase === "restarting"
          ? t("restarting")
          : pct !== null
            ? t("downloadingPct", { pct })
            : t("downloading");

  // Corner pill when the run is active but the modal is dismissed (no error).
  if (!open && !error) {
    return (
      <button
        type="button"
        onClick={reopen}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-medium shadow-lg"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        {pct !== null ? t("pillPct", { pct }) : t("pill")}
      </button>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (locked || error) return; // restart & errors don't backdrop-dismiss
        if (!o) dismiss();
      }}
    >
      <DialogContent
        className="sm:max-w-[400px]"
        hideClose={locked || !!error ? undefined : undefined}
      >
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        {error != null ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{error}</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={retry}>{t("retry")}</Button>
              <Button size="sm" variant="outline" onClick={close}>{t("close")}</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-1">
            {pct !== null && phase === "downloading" ? (
              <Progress value={pct} />
            ) : (
              <IndeterminateBar />
            )}
            <AnimatePresence mode="wait">
              <motion.p
                key={label}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="text-sm text-muted-foreground"
              >
                {label}
              </motion.p>
            </AnimatePresence>
            <p className="text-xs text-muted-foreground/70">{t("reassurance")}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

Note on `hideClose`: check `ui/dialog.tsx` for whether `DialogContent` accepts a prop to hide the close button. If it does, pass it truthy when `locked`. If it does NOT, delete the `hideClose` line — the `onOpenChange` guard already blocks dismissal during restart, and the close button clicking through is acceptable (restart is sub-second). Do not invent the prop.

- [ ] **Step 2: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: no new errors from `update-progress-modal.tsx`. (Namespace keys resolve at runtime via en.json — added in Task 6; tsc does not type-check message keys.)

- [ ] **Step 3: Commit**

```bash
git add apps/desktop-ui/src/components/desktop/update-progress-modal.tsx
git commit -m "feat(updater): app-wide update progress modal + corner pill"
```

---

### Task 4: Mount modal app-wide + rewire the auto-check toast

**Files:**
- Modify: `apps/desktop-ui/src/app/layout.tsx` (near line 123, where `<DesktopInit />` mounts)
- Modify: `apps/desktop-ui/src/components/desktop/desktop-init.tsx:69-80`

**Interfaces:**
- Consumes: `UpdateProgressModal` (Task 3), `startUpdate` (Task 2).

- [ ] **Step 1: Mount the modal in `layout.tsx`**

Add the import and render it right after `<DesktopInit />`:

```tsx
import { UpdateProgressModal } from "@/components/desktop/update-progress-modal";
// ...
<DesktopInit />
<UpdateProgressModal />
```

- [ ] **Step 2: Rewire the toast action in `desktop-init.tsx`**

Replace the `onClick` (lines 69-80) so it hands off to the store instead of fire-and-forget. The toast text stays English (sibling, not migrated). Remove the `toast.loading`/`toast.error` install handling — the modal now owns progress and errors.

```tsx
action: {
  label: "Restart & update",
  onClick: () => {
    toast.dismiss("desktop-update");
    void import("@/lib/desktop/use-update-install").then((m) => m.startUpdate());
  },
},
```

(The `import("@/lib/desktop/updater")` at line 58 for `checkForUpdate` stays; only the install branch changes.)

- [ ] **Step 3: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Verify existing suites still green**

Run: `./node_modules/.bin/jest src/lib/__tests__/updater-status.test.ts src/lib/__tests__/use-update-install.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop-ui/src/app/layout.tsx apps/desktop-ui/src/components/desktop/desktop-init.tsx
git commit -m "feat(updater): route auto-check toast into the progress modal"
```

---

### Task 5: Rewire settings dialog + About card to the store

**Files:**
- Modify: `apps/desktop-ui/src/components/desktop/desktop-update-dialog.tsx`
- Modify: `apps/desktop-ui/src/components/desktop/app-version-label.tsx:33-49`

**Interfaces:**
- Consumes: `startUpdate` (Task 2).

- [ ] **Step 1: `desktop-update-dialog.tsx` — delegate install to the store**

Remove the hand-rolled bar and local progress state; the app-wide modal renders progress. Delete the `pct` helper (lines 17-20), the `installing`/`progress` state (lines 32-33), the `percent` calc (line 63), and the inline bar block (lines 97-108). Replace `install` (lines 50-61) with:

```tsx
const install = async () => {
  const { startUpdate } = await import("@/lib/desktop/use-update-install");
  startUpdate();
  setOpen(false); // hand off to the app-wide progress modal
};
```

Drop the `DownloadProgress` import (line 15 → keep only `UpdateInfo`). The update card keeps its "Download & install" button (lines 109-114) which now calls `install`; remove the `installing ? ... : ...` conditional (lines 97-114) and always render the button, since progress moved out. The dialog's `onOpenChange` guard `!installing && setOpen(o)` (line 72) → just `setOpen(o)`.

- [ ] **Step 2: `app-version-label.tsx` — delegate install**

Replace `handleCheck` (lines 33-49) install branch:

```tsx
const handleCheck = async () => {
  setChecking(true);
  try {
    const { checkForUpdate } = await import("@/lib/desktop/updater");
    const update = await checkForUpdate();
    if (!update) {
      toast.success("You're on the latest version");
      return;
    }
    const { startUpdate } = await import("@/lib/desktop/use-update-install");
    startUpdate();
  } catch {
    toast.error("Couldn't check for updates");
  } finally {
    setChecking(false);
  }
};
```

(Toast strings stay English — sibling, not migrated.)

- [ ] **Step 3: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: no new errors; no dangling `DownloadProgress` / `pct` references.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop-ui/src/components/desktop/desktop-update-dialog.tsx apps/desktop-ui/src/components/desktop/app-version-label.tsx
git commit -m "feat(updater): route settings dialog + about card into progress modal"
```

---

### Task 6: `DesktopUpdate` i18n namespace (27 locales)

**Files:**
- Modify: `apps/desktop-ui/messages/en.json` (+ 26 others: `af, ar, ca, cs, da, de, el, es, fa, fr, id, it, ja, ko, ms, nb, nl, pl, pt, pt-BR, ru, sv, tr, uk, vi, zh`)

**Interfaces:**
- Consumes: nothing. Produces the `DesktopUpdate` namespace consumed by Task 3.

- [ ] **Step 1: Add the English block to `en.json`**

Add a top-level `"DesktopUpdate"` namespace (place it alphabetically-ish near other Desktop* / Settings blocks; exact position doesn't matter):

```json
"DesktopUpdate": {
  "title": "Updating MyDevTools",
  "downloading": "Downloading update…",
  "downloadingPct": "Downloading update… {pct}%",
  "installing": "Installing update…",
  "restarting": "Restarting MyDevTools…",
  "reassurance": "Your offline data is never touched.",
  "failed": "Update failed to install",
  "retry": "Retry",
  "close": "Close",
  "pill": "Updating…",
  "pillPct": "Updating… {pct}%"
}
```

- [ ] **Step 2: Add translated blocks to the 26 locale files**

For each locale file, add the same `DesktopUpdate` namespace with the values translated into that language. Keep the `{pct}` ICU placeholder verbatim (no space changes inside braces), keep "MyDevTools" as the untranslated product name. Example (`fr.json`):

```json
"DesktopUpdate": {
  "title": "Mise à jour de MyDevTools",
  "downloading": "Téléchargement de la mise à jour…",
  "downloadingPct": "Téléchargement de la mise à jour… {pct} %",
  "installing": "Installation de la mise à jour…",
  "restarting": "Redémarrage de MyDevTools…",
  "reassurance": "Vos données hors ligne ne sont jamais touchées.",
  "failed": "Échec de l'installation de la mise à jour",
  "retry": "Réessayer",
  "close": "Fermer",
  "pill": "Mise à jour…",
  "pillPct": "Mise à jour… {pct} %"
}
```

There are no ICU plural forms in this namespace (only a `{pct}` number substitution), so ru/uk/pl/cs/ar need no few/many/plural categories here — plain translated strings suffice.

- [ ] **Step 3: Validate all 27 files parse and contain the namespace**

Run:
```bash
cd apps/desktop-ui && for f in messages/*.json; do node -e "const j=require('./$f'); if(!j.DesktopUpdate||!j.DesktopUpdate.title){console.error('MISSING DesktopUpdate in $f');process.exit(1)}" || exit 1; done && echo "all 27 OK"
```
Expected: `all 27 OK` (also proves every file is still valid JSON).

- [ ] **Step 4: Commit**

```bash
git add apps/desktop-ui/messages/*.json
git commit -m "i18n(updater): add DesktopUpdate namespace across 27 locales"
```

---

### Task 7: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Typecheck the whole app**

Run: `cd apps/desktop-ui && ./node_modules/.bin/tsc --noEmit`
Expected: no errors introduced by this work.

- [ ] **Step 2: Run the new tests + confirm no regressions in touched areas**

Run: `cd apps/desktop-ui && ./node_modules/.bin/jest src/lib/__tests__/updater-status.test.ts src/lib/__tests__/use-update-install.test.ts`
Expected: PASS. (Known pre-existing failing suites — react-window, pending-invitations-badge, encrypted-tool-placeholder, workspace-store — are unrelated; do not fix here.)

- [ ] **Step 3: Manual smoke (documented, run in a real desktop build)**

Against the release endpoint with a newer build available:
1. Launch → auto-check toast appears → click **Restart & update** → toast dismisses, modal opens showing a moving Downloading bar with %, then **Installing update…**, then **Restarting MyDevTools…**, then relaunch.
2. During download, close the modal → corner pill shows `Updating… N%` → click it → modal reopens.
3. Settings → Check for updates → Download & install → dialog closes, same modal takes over.
4. Force an error (offline mid-download) → modal shows the error + Retry/Close; Retry restarts.

- [ ] **Step 4: Commit (if any doc/notes changed)** — otherwise nothing to commit.

---

## Self-Review

**Spec coverage:**
- Phase model (downloading/installing/restarting/error) → Task 1 (phases) + Task 3 (error UI). ✓
- `useUpdateInstall` hook + imperative `startUpdate` for the toast → Task 2. ✓
- App-wide `<UpdateProgressModal>` mounted in layout → Tasks 3–4. ✓
- Corner return pill / dismissible flow → Task 3. ✓
- `restarting` forces modal open → Task 3 (`locked`). ✓
- Indeterminate bar when `total` null, no fake percent → Task 1 `pctOf` + Task 3 `IndeterminateBar`. ✓
- Rewire all three triggers → Tasks 4 (toast) + 5 (dialog, About). ✓
- Reuse `ui/progress.tsx`, drop hand-rolled bar → Task 5. ✓
- 27-locale `DesktopUpdate` namespace, siblings not migrated → Task 6. ✓
- No Rust changes → honored throughout. ✓

**Placeholder scan:** No TBD/TODO. The only conditional instruction (`hideClose` in Task 3) is explicitly resolved: check the prop, use it or delete the line — not left open. Locale translations in Task 6 are content the implementer produces per-locale, with a worked `fr` example and a validation gate; the key set and English source are fully specified.

**Type consistency:** `UpdateStatus`/`UpdatePhase`/`reduceDownloadEvent`/`pctOf` defined in Task 1, consumed by the same names in Tasks 2–3. `startUpdate`/`dismiss`/`reopen`/`retry`/`close` defined in Task 2, used by the same names in Tasks 3–5. Callback signature change (`DownloadProgress` → `UpdateStatus`) is propagated to every consumer (Tasks 4–5 remove the old references). ✓
