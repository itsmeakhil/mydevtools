/**
 * Desktop remote bridge: calls FastAPI through the Rust `remote_api` command.
 * HttpOnly JWT cookies live in a Rust-side persistent jar (never the webview),
 * so the existing backend cookie flow works unchanged and without CORS.
 */
import type { LocalApiResponse } from "./bridge";

export const DESKTOP_BACKEND_BASE: string =
  process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
  "http://localhost:8000";

/**
 * Web origin the system browser opens for sign-in. In dev the webview is served
 * over http(s) (localhost:3000) and shares the same backend — reuse that origin
 * so the minted token validates. The packaged app runs on tauri://localhost, so
 * it falls back to the configured public site.
 */
export function desktopWebBase(): string {
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (origin.startsWith("http://") || origin.startsWith("https://")) {
      return origin;
    }
  }
  return process.env.NEXT_PUBLIC_SITE_URL || "https://mydevtools.tech";
}

export async function remoteApi(
  method: string,
  path: string,
  body?: string
): Promise<LocalApiResponse> {
  const { invoke } = await import("@tauri-apps/api/core");
  const url = new URL(path, DESKTOP_BACKEND_BASE).toString();
  return invoke<LocalApiResponse>("remote_api", { method, url, body: body ?? null });
}

// ── Session state (module-level; survives route changes, not restarts —
//    restarts recover via the persisted Rust cookie jar + checkRemoteSession) ─

let sessionOk = false;

export function hasRemoteSession(): boolean {
  return sessionOk;
}

export function setRemoteSession(ok: boolean): void {
  if (sessionOk === ok) return;
  sessionOk = ok;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mydevtools:desktop-session", { detail: { ok } }));
  }
}

/** Authenticated remote call with the web's 401→refresh→retry ladder. */
export async function remoteApiAuthed(
  method: string,
  path: string,
  body?: string
): Promise<LocalApiResponse> {
  let res = await remoteApi(method, path, body);
  if (res.status === 401) {
    const refr = await remoteApi("POST", "/api/v1/auth/refresh");
    if (refr.status >= 200 && refr.status < 300) {
      res = await remoteApi(method, path, body);
    }
  }
  if (res.status === 401 || res.status === 403) {
    setRemoteSession(false);
  }
  return res;
}

/** Probe the backend session (e.g. on startup, after network regain). */
export async function checkRemoteSession(): Promise<boolean> {
  try {
    const res = await remoteApiAuthed("GET", "/api/v1/auth/session/check");
    setRemoteSession(res.status >= 200 && res.status < 300);
  } catch {
    setRemoteSession(false);
  }
  return sessionOk;
}

/** Exchange a Firebase ID token for backend cookies (into the Rust jar). */
export async function desktopEstablishSession(idToken: string): Promise<void> {
  const res = await remoteApi(
    "POST",
    "/api/v1/auth/session",
    // long_lived → 60-day refresh cookie for the desktop app.
    JSON.stringify({ id_token: idToken, check_revoked: false, long_lived: true })
  );
  if (res.status < 200 || res.status >= 300) {
    setRemoteSession(false);
    throw new Error(`Desktop session exchange failed (${res.status})`);
  }
  setRemoteSession(true);
}

export async function desktopSignOut(): Promise<void> {
  try {
    await remoteApi("POST", "/api/v1/auth/logout");
  } catch {
    // best-effort; jar is cleared regardless
  }
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("clear_remote_session");
  setRemoteSession(false);
}
