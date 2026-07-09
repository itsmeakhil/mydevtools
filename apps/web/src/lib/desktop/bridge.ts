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

/** Normalize a same-origin `/api/backend/<rest>` path to FastAPI `/api/v1/<rest>`. */
export function normalizeBackendPath(path: string): string {
  const stripped = path.split("?")[0];
  if (stripped.startsWith("/api/backend/")) {
    return "/api/v1/" + stripped.slice("/api/backend/".length);
  }
  return stripped;
}

/** Build a synthetic fetch Response from a local_api result. */
export function toResponse(r: LocalApiResponse): Response {
  return new Response(r.body || null, {
    status: r.status,
    headers: { "Content-Type": "application/json" },
  });
}
