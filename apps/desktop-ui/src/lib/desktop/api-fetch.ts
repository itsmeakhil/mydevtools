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

  // api-client HTTP proxy → Rust http_request (returns the /api/proxy envelope).
  if (path === "/api/proxy" || path.startsWith("/api/proxy?")) {
    const { invoke } = await import("@tauri-apps/api/core");
    const input = body ? JSON.parse(body) : {};
    const envelope = await invoke("http_request", { input });
    return new Response(JSON.stringify(envelope), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  // Native gRPC → Rust h2 transport (returns the /api/proxy-grpc envelope).
  if (path.startsWith("/api/proxy-grpc")) {
    const { invoke } = await import("@tauri-apps/api/core");
    const input = body ? JSON.parse(body) : {};
    const envelope = await invoke("proxy_grpc", { input });
    return new Response(JSON.stringify(envelope), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  // Advanced proxies not available on desktop yet (v1.1). Mock serving on
  // desktop goes through the Rust loopback server (`mock_server_start`), not
  // this path — the guard below only catches stale web-origin mock URLs.
  if (
    path.startsWith("/api/proxy-ntlm") ||
    path.startsWith("/api/proxy-spnego") ||
    path.startsWith("/api/mock")
  ) {
    return new Response(
      JSON.stringify({ error: "This feature is not available in the desktop app yet" }),
      { status: 501, headers: { "Content-Type": "application/json" } }
    );
  }

  const res = await localApi(method, normalizeBackendPath(path), body);
  return toResponse(res);
}
