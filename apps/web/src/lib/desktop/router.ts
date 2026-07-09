/**
 * Desktop data routing: decides per request whether a normalized
 * `/api/v1/...` path is served by the local SQLCipher store or the remote
 * FastAPI backend.
 *
 * Rules:
 *  - remote-only tools (url-shortener, s3-drive, game-scores, dns-lookup)
 *    always go remote;
 *  - the workspaces API merges the always-present local personal workspace
 *    with remote orgs/workspaces when signed in;
 *  - a non-local active workspace routes everything remote (shared/team
 *    workspaces are cloud-only);
 *  - everything else is local.
 */
import { localApi, type LocalApiResponse } from "./bridge";
import { hasRemoteSession, remoteApiAuthed } from "./remote";

export const LOCAL_WORKSPACE_ID = "local-personal";

const REMOTE_ONLY_PREFIXES = [
  "/api/v1/url-shortener",
  "/api/v1/s3-drive",
  "/api/v1/game-scores",
  "/api/v1/dns-lookup",
];

export function activeWorkspaceId(): string {
  if (typeof window === "undefined") return LOCAL_WORKSPACE_ID;
  try {
    const raw = window.localStorage.getItem("mdt-workspace-store");
    if (!raw) return LOCAL_WORKSPACE_ID;
    const parsed = JSON.parse(raw) as { state?: { activeWorkspaceId?: string | null } };
    return parsed.state?.activeWorkspaceId || LOCAL_WORKSPACE_ID;
  } catch {
    return LOCAL_WORKSPACE_ID;
  }
}

export function isRemoteWorkspaceActive(): boolean {
  return activeWorkspaceId() !== LOCAL_WORKSPACE_ID;
}

function parseArray(res: LocalApiResponse): unknown[] {
  try {
    const v = JSON.parse(res.body);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

async function workspacesFetch(
  method: string,
  path: string,
  body?: string
): Promise<LocalApiResponse> {
  const bare = path.split("?")[0];
  if (method === "GET" && (bare === "/api/v1/workspaces-api/orgs" || bare === "/api/v1/workspaces-api/workspaces")) {
    const local = await localApi(method, path, body);
    if (!hasRemoteSession()) return local;
    try {
      const remote = await remoteApiAuthed(method, path, body);
      if (remote.status >= 200 && remote.status < 300) {
        const merged = [...parseArray(local), ...parseArray(remote)];
        return { status: 200, body: JSON.stringify(merged) };
      }
    } catch {
      // offline / backend unreachable — local list is still valid
    }
    return local;
  }
  if (method === "POST" && bare === "/api/v1/workspaces-api/workspaces/active") {
    // Always record locally; propagate to the backend cookie when the target
    // is a remote workspace and we have a session.
    const local = await localApi(method, path, body);
    let workspaceId = "";
    try {
      workspaceId = (JSON.parse(body || "{}") as { workspace_id?: string }).workspace_id || "";
    } catch {
      /* ignore */
    }
    if (workspaceId && workspaceId !== LOCAL_WORKSPACE_ID && hasRemoteSession()) {
      try {
        return await remoteApiAuthed(method, path, body);
      } catch {
        return { status: 503, body: JSON.stringify({ detail: "Backend unreachable" }) };
      }
    }
    return local;
  }
  // Workspace detail / membership / crypto endpoints: local id → local, else remote.
  if (bare.includes(`/${LOCAL_WORKSPACE_ID}`) || !hasRemoteSession()) {
    return localApi(method, path, body);
  }
  return remoteApiAuthed(method, path, body);
}

/** Route a normalized `/api/v1/...` request (desktop only). */
export async function desktopDataFetch(
  method: string,
  path: string,
  body?: string
): Promise<LocalApiResponse> {
  if (REMOTE_ONLY_PREFIXES.some((p) => path.startsWith(p))) {
    if (!hasRemoteSession()) {
      return {
        status: 503,
        body: JSON.stringify({ detail: "This tool requires a network connection and cloud sign-in" }),
      };
    }
    return remoteApiAuthed(method, path, body);
  }
  if (path.startsWith("/api/v1/workspaces-api/")) {
    return workspacesFetch(method, path, body);
  }
  if (isRemoteWorkspaceActive() && hasRemoteSession()) {
    return remoteApiAuthed(method, path, body);
  }
  return localApi(method, path, body);
}
