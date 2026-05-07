import { proxyJsonAuthed } from "@/lib/backend-auth"
import type { CodeSnippet } from "@/store/snippet-manager-store"

const BACKEND_BASE_URL: string =
  process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
  "http://localhost:8000"

function extractError(data: unknown): string {
  if (typeof data === "string" && data.trim()) return data
  if (data && typeof data === "object" && "detail" in data) {
    const d = (data as { detail: unknown }).detail
    if (typeof d === "string") return d
    try { return JSON.stringify(d) } catch { return "Request failed" }
  }
  return "Request failed"
}

async function snippetRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const { status, data } = await proxyJsonAuthed<T>(BACKEND_BASE_URL, method, path, body)
  if (status < 200 || status >= 300) throw new Error(extractError(data))
  return data as T
}

export async function listCodeSnippetsApi(): Promise<CodeSnippet[]> {
  return snippetRequest<CodeSnippet[]>("GET", "/api/v1/code-snippets")
}

export type CodeSnippetCreatePayload = Pick<
  CodeSnippet,
  "title" | "language" | "code"
> &
  Partial<Pick<CodeSnippet, "id" | "tags" | "pinned" | "createdAt" | "updatedAt">>

export async function createCodeSnippetApi(
  payload: CodeSnippetCreatePayload
): Promise<CodeSnippet> {
  return snippetRequest<CodeSnippet>("POST", "/api/v1/code-snippets", payload)
}

export async function patchCodeSnippetApi(
  id: string,
  patch: Partial<Pick<CodeSnippet, "title" | "language" | "code" | "tags" | "pinned">>
): Promise<CodeSnippet> {
  return snippetRequest<CodeSnippet>("PATCH", `/api/v1/code-snippets/${id}`, patch)
}

export async function deleteCodeSnippetApi(id: string): Promise<void> {
  await snippetRequest<void>("DELETE", `/api/v1/code-snippets/${id}`)
}

export function isSnippetDuplicateError(err: unknown): boolean {
  return err instanceof Error && /409|already exists|Snippet id already/i.test(err.message)
}
