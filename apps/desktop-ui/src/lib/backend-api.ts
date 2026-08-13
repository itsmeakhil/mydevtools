/**
 * App data API.
 *
 * "Backend" here means the in-process Rust SQLCipher store, not a server —
 * there is none. `/api/v1/...` paths are the local router's contract (see
 * `src-tauri/src/router/mod.rs`); they are routed by `apiFetch`, never sent
 * over the network.
 */
import { apiFetch } from "@/lib/desktop/api-fetch"

export function extractBackendError(data: unknown): string {
  if (typeof data === "string" && data.trim()) return data
  if (data && typeof data === "object" && "detail" in data) {
    const d = (data as { detail: unknown }).detail
    if (typeof d === "string") return d
    try {
      return JSON.stringify(d)
    } catch {
      return "Request failed"
    }
  }
  return "Request failed"
}

/** Local call that surfaces the status instead of throwing on failure. */
export async function apiRequestRaw<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; data: T | null }> {
  const res = await apiFetch(path, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!text) return { status: res.status, data: null }
  try {
    return { status: res.status, data: JSON.parse(text) as T }
  } catch {
    return { status: res.status, data: text as unknown as T }
  }
}

/** Local call that throws the store's error message on any non-2xx status. */
export async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const { status, data } = await apiRequestRaw<T>(method, path, body)
  if (status < 200 || status >= 300) throw new Error(extractBackendError(data))
  return data as T
}
