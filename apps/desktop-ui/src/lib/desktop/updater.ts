/**
 * Desktop auto-update (Tauri updater plugin).
 *
 * Checks a signed release manifest, downloads the new app bundle, swaps it in
 * place, and relaunches — the user never re-downloads/installs by hand. Only the
 * `.app` bundle is replaced; the local SQLCipher database in Application Support
 * is never touched, so offline data survives every update. Schema changes are
 * handled separately by the versioned migrations (with a pre-upgrade snapshot).
 *
 * Every update is verified against the updater public key baked into
 * tauri.conf.json before it's allowed to install.
 */
import type { DownloadEvent, Update } from "@tauri-apps/plugin-updater";

import { isDesktop } from "./is-desktop";

export type UpdateInfo = {
  version: string;
  currentVersion: string;
  notes?: string;
  date?: string;
};

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

// Handle to the Update object between check() and install so we don't re-check.
let pending: Update | null = null;

/** Check the release endpoint for a newer signed build. null = up to date. */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!isDesktop()) return null;
  const { check } = await import("@tauri-apps/plugin-updater");
  const update = await check();
  pending = update ?? null;
  if (!update) return null;
  return {
    version: update.version,
    currentVersion: update.currentVersion,
    notes: update.body || undefined,
    date: update.date || undefined,
  };
}

/**
 * Download + install the update found by checkForUpdate(), then relaunch.
 * Re-checks first if nothing is pending (e.g. called directly).
 */
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

/** The running app's version (for display). Empty string on web. */
export async function currentAppVersion(): Promise<string> {
  if (!isDesktop()) return "";
  const { getVersion } = await import("@tauri-apps/api/app");
  return getVersion();
}
