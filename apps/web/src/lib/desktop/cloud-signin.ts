/**
 * Desktop cloud sign-in: OAuth popups don't work in WKWebView, so sign-in
 * happens in the system browser (web login page with ?desktop=1), which mints
 * a Firebase custom token and hands it back via the mydevtools:// deep link.
 */
import { signInWithCustomToken } from "firebase/auth";

import { auth } from "@/database/firebase";
import { establishBackendSession } from "@/lib/backend-auth";
import { checkRemoteSession, DESKTOP_WEB_BASE } from "./remote";

/** Open the web login page in the system browser. */
export async function startCloudSignIn(): Promise<void> {
  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(`${DESKTOP_WEB_BASE}/login?desktop=1`);
}

async function handleDeepLink(urls: string[]): Promise<void> {
  for (const raw of urls) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      continue;
    }
    if (url.protocol !== "mydevtools:" || url.hostname !== "auth") continue;
    const token = url.searchParams.get("token");
    if (!token) continue;
    const cred = await signInWithCustomToken(auth, token);
    const idToken = await cred.user.getIdToken();
    await establishBackendSession(idToken);
    await checkRemoteSession();
    // Refresh workspaces so remote orgs/workspaces appear in the switcher.
    const { useWorkspaceStore } = await import("@/store/workspace-store");
    await useWorkspaceStore.getState().loadFromBackend().catch(() => {});
  }
}

/** Listen for deep-link sign-in callbacks (and process a cold-start URL). */
export async function initDeepLinkListener(): Promise<void> {
  const { onOpenUrl, getCurrent } = await import("@tauri-apps/plugin-deep-link");
  await onOpenUrl((urls) => {
    void handleDeepLink(urls).catch((e) => console.error("Desktop sign-in failed:", e));
  });
  const initial = await getCurrent().catch(() => null);
  if (initial?.length) {
    void handleDeepLink(initial).catch((e) => console.error("Desktop sign-in failed:", e));
  }
}
