/**
 * Desktop cloud sign-in. OAuth popups don't work in WKWebView, so sign-in
 * happens in the system browser (web login page with ?desktop=1).
 *
 * Return leg = loopback server: the app binds an ephemeral localhost port and
 * the browser redirects the minted Firebase custom token to
 * http://127.0.0.1:<port>/callback?token=... This works identically in
 * `tauri dev` and the packaged app (no mydevtools:// URL-scheme registration,
 * which macOS only routes to a bundled .app). The mydevtools:// deep link is
 * kept as a secondary path.
 */
import { signInWithCustomToken } from "firebase/auth";

import { auth } from "@/database/firebase";
import { establishBackendSession } from "@/lib/backend-auth";
import { checkRemoteSession, desktopWebBase } from "./remote";

/** Exchange a Firebase custom token for a session and enter the workspace. */
async function completeSignIn(token: string): Promise<void> {
  const cred = await signInWithCustomToken(auth, token);
  const idToken = await cred.user.getIdToken();
  await establishBackendSession(idToken);
  await checkRemoteSession();
  // Refresh workspaces so remote orgs/workspaces appear in the switcher.
  const { useWorkspaceStore } = await import("@/store/workspace-store");
  await useWorkspaceStore.getState().loadFromBackend().catch(() => {});
  // Signal the app to enter the workspace (DesktopInit routes via Next so
  // static-export paths resolve correctly).
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mydevtools:desktop-authed"));
  }
}

/**
 * Start the browser sign-in: bind the loopback callback server, open the system
 * browser at the login page with the callback port, and finish when the token
 * arrives. Resolves after the session is established.
 */
export async function startCloudSignIn(): Promise<void> {
  const { invoke, Channel } = await import("@tauri-apps/api/core");
  const { openUrl } = await import("@tauri-apps/plugin-opener");

  const portChannel = new Channel<{ port: number }>();
  portChannel.onmessage = (msg) => {
    if (msg.port) {
      void openUrl(`${desktopWebBase()}/login?desktop=1&cb=${msg.port}`);
    }
  };

  const token = await invoke<string>("await_browser_auth", { portChannel });
  await completeSignIn(token);
}

// ── Secondary path: mydevtools:// deep link (packaged app fallback) ──────────

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
    await completeSignIn(token);
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
