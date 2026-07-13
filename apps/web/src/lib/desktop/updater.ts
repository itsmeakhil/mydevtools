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
import type { Update } from "@tauri-apps/plugin-updater";

import { isDesktop } from "./is-desktop";

export type UpdateInfo = {
  version: string;
  currentVersion: string;
  notes?: string;
  date?: string;
};

export type DownloadProgress = { downloaded: number; total: number | null };

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
  onProgress?: (p: DownloadProgress) => void
): Promise<void> {
  if (!pending) {
    await checkForUpdate();
    if (!pending) throw new Error("No update available to install");
  }
  const update = pending;
  let downloaded = 0;
  let total: number | null = null;

  await update.downloadAndInstall((event) => {
    switch (event.event) {
      case "Started":
        total = event.data.contentLength ?? null;
        break;
      case "Progress":
        downloaded += event.data.chunkLength;
        onProgress?.({ downloaded, total });
        break;
      case "Finished":
        onProgress?.({ downloaded, total });
        break;
    }
  });

  // Restart into the freshly installed version.
  const { relaunch } = await import("@tauri-apps/plugin-process");
  await relaunch();
}

/** The running app's version (for display). Empty string on web. */
export async function currentAppVersion(): Promise<string> {
  if (!isDesktop()) return "";
  const { getVersion } = await import("@tauri-apps/api/app");
  return getVersion();
}
