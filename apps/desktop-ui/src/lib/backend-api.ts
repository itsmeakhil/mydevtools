import { proxyJsonAuthed } from "@/lib/backend-auth"

export const BACKEND_BASE_URL: string =
  process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
  "http://localhost:8000"

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

export async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const { status, data } = await proxyJsonAuthed<T>(BACKEND_BASE_URL, method, path, body)
  if (status < 200 || status >= 300) throw new Error(extractBackendError(data))
  return data as T
}
