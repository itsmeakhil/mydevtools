/**
 * Thin wrappers over Tauri `invoke()`. Only ever called behind `isDesktop()`,
 * and `@tauri-apps/api` is imported dynamically so web bundles never pull it in.
 */

export type LocalApiResponse = {
  status: number;
  body: string;
};

async function invoke<T>(cmd: string, args: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}

/**
 * Call the Rust local router (SQLCipher-backed, mirrors FastAPI `/api/v1/*`).
 * Path must be a normalized `/api/v1/...` path.
 */
export function localApi(
  method: string,
  path: string,
  body?: string
): Promise<LocalApiResponse> {
  return invoke<LocalApiResponse>("local_api", { method, path, body: body ?? null });
}

/** Normalize a same-origin `/api/backend/<rest>` path to FastAPI `/api/v1/<rest>` (query preserved). */
export function normalizeBackendPath(path: string): string {
  if (path.startsWith("/api/backend/")) {
    return "/api/v1/" + path.slice("/api/backend/".length);
  }
  return path;
}

/** Build a synthetic fetch Response from a local_api result. */
export function toResponse(r: LocalApiResponse): Response {
  return new Response(r.body || null, {
    status: r.status,
    headers: { "Content-Type": "application/json" },
  });
}
