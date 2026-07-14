import { apiRequest } from "@/lib/backend-api"
import type { CodeSnippet } from "@/store/snippet-manager-store"

const BASE = "/api/v1/code-snippets"

export async function listCodeSnippetsApi(): Promise<CodeSnippet[]> {
  return apiRequest<CodeSnippet[]>("GET", BASE)
}

export type CodeSnippetCreatePayload = Pick<
  CodeSnippet,
  "title" | "language" | "code"
> &
  Partial<Pick<CodeSnippet, "id" | "tags" | "pinned" | "createdAt" | "updatedAt">>

export async function createCodeSnippetApi(
  payload: CodeSnippetCreatePayload
): Promise<CodeSnippet> {
  return apiRequest<CodeSnippet>("POST", BASE, payload)
}

export async function patchCodeSnippetApi(
  id: string,
  patch: Partial<Pick<CodeSnippet, "title" | "language" | "code" | "tags" | "pinned">>
): Promise<CodeSnippet> {
  return apiRequest<CodeSnippet>("PATCH", `${BASE}/${id}`, patch)
}

export async function deleteCodeSnippetApi(id: string): Promise<void> {
  await apiRequest<void>("DELETE", `${BASE}/${id}`)
}

export function isSnippetDuplicateError(err: unknown): boolean {
  return err instanceof Error && /409|already exists|Snippet id already/i.test(err.message)
}
