import { apiRequest } from "@/lib/backend-api"
import type { CodeSnippet } from "@/store/snippet-manager-store"
import { encryptField, decryptField, isEnvelope } from "@/lib/content-envelope"

const BASE = "/api/v1/code-snippets"

/**
 * Zero-knowledge: snippet `code` travels + rests as an AES-GCM envelope. Only
 * the body is encrypted; title/language/tags stay plaintext so list + search
 * work. Callers pass the workspace cipher key (from useCipherKey); the store
 * always holds decrypted plaintext code.
 */
type Key = CryptoKey | null

/** Decrypt a server snippet's `code` envelope into plaintext. Legacy plaintext
 *  snippets pass through; a locked/failed decrypt yields empty code (placeholder). */
async function decodeSnippet(key: Key, raw: CodeSnippet): Promise<CodeSnippet> {
  const code = (raw as { code: unknown }).code
  if (!isEnvelope(code)) return raw
  if (!key) return { ...raw, code: "" }
  try {
    return { ...raw, code: await decryptField<string>(key, code) }
  } catch {
    return { ...raw, code: "" }
  }
}

/** Encrypt plaintext code into an envelope for the wire. */
async function encodeCode(key: Key, code: string): Promise<{ encrypted: string; iv: string }> {
  if (!key) throw new Error("Vault is locked")
  return encryptField(key, code)
}

export async function listCodeSnippetsApi(key: Key): Promise<CodeSnippet[]> {
  const raw = await apiRequest<CodeSnippet[]>("GET", BASE)
  return Promise.all(raw.map((s) => decodeSnippet(key, s)))
}

export type CodeSnippetCreatePayload = Pick<
  CodeSnippet,
  "title" | "language" | "code"
> &
  Partial<Pick<CodeSnippet, "id" | "tags" | "pinned" | "createdAt" | "updatedAt">>

export async function createCodeSnippetApi(
  payload: CodeSnippetCreatePayload,
  key: Key
): Promise<CodeSnippet> {
  const body =
    payload.code !== undefined
      ? { ...payload, code: await encodeCode(key, payload.code) }
      : payload
  const created = await apiRequest<CodeSnippet>("POST", BASE, body)
  return decodeSnippet(key, created)
}

export async function patchCodeSnippetApi(
  id: string,
  patch: Partial<Pick<CodeSnippet, "title" | "language" | "code" | "tags" | "pinned">>,
  key: Key
): Promise<CodeSnippet> {
  const body =
    patch.code !== undefined
      ? { ...patch, code: await encodeCode(key, patch.code) }
      : patch
  const updated = await apiRequest<CodeSnippet>("PATCH", `${BASE}/${id}`, body)
  return decodeSnippet(key, updated)
}

export async function deleteCodeSnippetApi(id: string): Promise<void> {
  await apiRequest<void>("DELETE", `${BASE}/${id}`)
}

export function isSnippetDuplicateError(err: unknown): boolean {
  return err instanceof Error && /409|already exists|Snippet id already/i.test(err.message)
}
