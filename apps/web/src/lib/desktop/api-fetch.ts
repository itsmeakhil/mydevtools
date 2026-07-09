import { isDesktop } from "./is-desktop";
import { localApi, normalizeBackendPath, toResponse } from "./bridge";

/**
 * Desktop-aware fetch for same-origin `/api/...` paths.
 *
 * On web this is a plain `fetch` pass-through. On desktop it routes
 * `/api/backend/*` (and `/api/v1/*`) paths to the Rust local router.
 * Remote routing (shared workspaces / sync) is layered on in Phase 4.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  if (!isDesktop()) {
    return fetch(path, init);
  }
  const method = (init?.method || "GET").toUpperCase();
  const body = typeof init?.body === "string" ? init.body : undefined;
  const res = await localApi(method, normalizeBackendPath(path), body);
  return toResponse(res);
}
