# Update Progress Modal — Design

**Date:** 2026-07-23
**Scope:** `apps/desktop-ui` (Tauri desktop UI). No Rust changes.

## Problem

When a new signed build is available the app surfaces a persistent toast
(`desktop-init.tsx`). Clicking **Restart & update** calls `installUpdate()`
with **no progress callback** — the toast flips to a static "Downloading…"
line, then 10–60s later the app relaunches with no further signal. To the user
this reads as a frozen / buggy app: no motion, no percentage, then a sudden
disappearance and restart.

The settings "Check for updates" dialog *does* draw a progress bar, but it
stops at the download percentage and then goes silent through install +
relaunch. The About-card check button is also fire-and-forget.

**Goal:** every path that installs an update shows a continuously-animated,
phase-narrated progress UI so the user always knows the app is working and is
about to restart.

## Current flow (map)

| File | Role |
|---|---|
| `src/lib/desktop/updater.ts` | `checkForUpdate()` / `installUpdate(onProgress)` / `currentAppVersion()`. Sees every Tauri `DownloadEvent` (`Started`/`Progress`/`Finished`) then `relaunch()`. |
| `src/components/desktop/desktop-init.tsx` | App-wide launch + 6h auto-check → persistent toast. **Fire-and-forget install (the bug).** Mounted via `app/layout.tsx:123`. |
| `src/components/desktop/desktop-update-dialog.tsx` | Settings "Check for updates" modal + hand-rolled download-only bar. |
| `src/components/desktop/app-version-label.tsx` | Settings About card check button. Fire-and-forget install. |
| `src/components/ui/progress.tsx` | Radix progress bar, already in repo, currently unused by updater. |

## Design (Approach A — shared app-wide modal)

### 1. Phase model in `updater.ts`

Replace the `onProgress?: (p: DownloadProgress)` callback with a single status
callback that narrates the whole install:

```ts
export type UpdatePhase = "downloading" | "installing" | "restarting";
export type UpdateStatus = {
  phase: UpdatePhase;
  downloaded: number;
  total: number | null;
};

export async function installUpdate(
  onStatus?: (s: UpdateStatus) => void
): Promise<void>
```

Phase transitions inside the existing `downloadAndInstall` callback:

- `Started` → capture `total`, emit `downloading` (downloaded 0).
- `Progress` → accumulate, emit `downloading`.
- `Finished` → emit `installing` (Tauri is now swapping the bundle in place).
- After `downloadAndInstall` resolves → emit `restarting`, then `relaunch()`.

`total` may be `null` (server sends no `Content-Length`) → the UI shows an
indeterminate bar, never a fabricated percentage.

### 2. `useUpdateInstall()` hook (new: `src/lib/desktop/use-update-install.ts`)

Owns install state for the whole app. Returns:

```ts
{
  status: UpdateStatus | null,   // null = idle / not installing
  error: string | null,
  start: () => void,             // idempotent: no-op if already running
  dismiss: () => void,           // hides modal, keeps corner pill (see §4)
  reopen: () => void,            // corner pill → reopen modal
  visible: boolean,              // modal open?
}
```

`start()` calls `installUpdate(setStatus)` and catches errors into `error`.
Because success ends in `relaunch()`, there is no "done" state — the process
dies. State lives in a module-level store (tiny `useSyncExternalStore` or a
2-field zustand-free pub/sub) so the app-wide modal and any trigger share one
instance regardless of where in the tree they mount.

### 3. `<UpdateProgressModal>` (new: `src/components/desktop/update-progress-modal.tsx`)

Mounted once, app-wide, next to `DesktopInit` in `app/layout.tsx`. Reads the
hook. Renders nothing when `status` is null.

Per phase (framer-motion crossfade between phase labels):

| Phase | Bar | Copy |
|---|---|---|
| `downloading` (total known) | determinate `<Progress value={pct}/>` | `Downloading update… {pct}%` |
| `downloading` (total null) | indeterminate shimmer | `Downloading update…` |
| `installing` | indeterminate shimmer | `Installing update…` |
| `restarting` | indeterminate shimmer | `Restarting MyDevTools…` |
| error | none | error text + **Retry** / **Close** |

- All copy through `useTranslations("DesktopUpdate")` (new namespace) — no
  hardcoded strings (project rule).
- Dialog enter animation via framer-motion; indeterminate bar is a CSS
  keyframe shimmer (no JS).
- **Dismissible while `downloading`/`installing`** (close X + backdrop) per
  user choice. **`restarting` forces the modal open** (no dismiss) — the
  restart is imminent, so the user must see it; dismissing a 0.5s phase would
  just flash.
- Header line: "Version X is available" style + reassurance ("Your offline
  data is never touched.").

### 4. Corner return pill (new, in the same modal file or a sibling)

When the user dismisses the modal mid-install, a small fixed bottom-right pill
stays: spinner + `Updating… {pct}%`, clickable to `reopen()`. Visible whenever
`status !== null && !visible`. Uses the same hook. This is the "dismissible +
corner return" flow.

### 5. Wire the three triggers to the hook

- **`desktop-init.tsx`** — toast action `onClick` → `start()` (via the shared
  store's imperative `startUpdate()` export, since the toast callback isn't a
  React child of the provider). Drop the fire-and-forget `installUpdate()` +
  manual `toast.loading`. Toast dismisses; modal takes over.
- **`desktop-update-dialog.tsx`** — replace the hand-rolled bar; call
  `start()` and let the app-wide modal render progress. Dialog just triggers
  and closes. (Removes `pct()` + inline bar markup.)
- **`app-version-label.tsx`** — check button, on update-found → `start()`.

### Error handling

- `installUpdate` throws (download/verify/IO fail) → hook sets `error`, modal
  shows Retry/Close. Retry re-runs `start()`. Close clears state.
- Signature verification failure surfaces as the thrown error message (already
  the case in the Tauri plugin) — shown verbatim, no silent swallow.

## What we are NOT building (YAGNI)

- No full-screen takeover overlay (user chose contained modal).
- No Rust-side changes — the plugin already emits everything needed.
- No zustand store / global state lib — one tiny module-level pub/sub is
  enough for a single ephemeral install.
- No "update history" / changelog viewer beyond the existing `notes` line.
- No background silent-install — install stays user-initiated (existing
  product behavior; relaunch is never sprung silently).

## Testing

- Unit: `installUpdate` phase sequencing — feed a fake `Update` whose
  `downloadAndInstall` invokes the callback with `Started`→`Progress`×N→
  `Finished`, assert emitted phases are `downloading…`, then `installing`,
  then `restarting`, and `relaunch` called last. (`updater` mockable via the
  dynamic-import boundary.)
- Unit: `pct` / percentage helper — `total: null` → indeterminate (no number);
  clamps at 100.
- Manual: real update against the release endpoint — verify each phase label
  renders, dismiss→pill→reopen works, error path shows Retry.

## Files

**New:** `use-update-install.ts`, `update-progress-modal.tsx`, `DesktopUpdate`
i18n namespace (en + 26 locales).
**Edit:** `updater.ts`, `desktop-init.tsx`, `desktop-update-dialog.tsx`,
`app-version-label.tsx`, `app/layout.tsx`.
