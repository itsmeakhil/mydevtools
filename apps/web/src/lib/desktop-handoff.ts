/**
 * Web-side desktop sign-in handoff. Runs in the SYSTEM BROWSER (not the Tauri
 * webview) on the `/login?desktop=1&cb=<port>` page: mints a short-lived
 * Firebase custom token for the current session and hands it back to the
 * desktop app via the loopback callback (or the mydevtools:// deep link).
 *
 * Called both after a fresh OAuth login and when the browser is already signed
 * in (so an existing session doesn't just bounce to /dashboard).
 */
import { backendFetch } from "@/lib/backend-auth";

/** True if the current URL is a desktop sign-in handoff. */
export function isDesktopHandoff(search: string): boolean {
  return new URLSearchParams(search).get("desktop") === "1";
}

/**
 * Mint the desktop token and redirect to the app. Returns false if it couldn't
 * (caller decides what to do). On success it navigates away, so the promise
 * effectively never resolves in the happy path.
 */
export async function handoffDesktopToken(search: string): Promise<boolean> {
  const params = new URLSearchParams(search);
  if (params.get("desktop") !== "1") return false;
  try {
    const res = await backendFetch("/api/backend/auth/desktop-token", { method: "POST" });
    if (!res.ok) return false;
    const { token } = (await res.json()) as { token: string };
    const cb = params.get("cb");
    window.location.href = cb
      ? `http://127.0.0.1:${cb}/callback?token=${encodeURIComponent(token)}`
      : `mydevtools://auth?token=${encodeURIComponent(token)}`;
    return true;
  } catch {
    return false;
  }
}
