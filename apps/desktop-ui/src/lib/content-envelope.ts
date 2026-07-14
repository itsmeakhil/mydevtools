/**
 * content-envelope.ts
 *
 * Field-level zero-knowledge envelopes for tool *content* (note bodies, snippet
 * code). The value is JSON-serialized, AES-GCM encrypted with the workspace
 * cipher key, and stored in place of the plaintext field as `{ encrypted, iv }`.
 * The server / local Rust store only ever see the opaque envelope.
 *
 * Metadata (title, language, tags, …) stays plaintext so search + list UI keep
 * working. Only the body is zero-knowledge.
 *
 * Reuses encryptData/decryptData (lib/encryption.ts) — same AES-GCM primitive
 * env-manager, password-manager and api-key-vault already ship.
 */
import { encryptData, decryptData } from "@/lib/encryption"

export type ContentEnvelope = { encrypted: string; iv: string }

/** True for a `{ encrypted, iv }` envelope — distinguishes encrypted from legacy plaintext. */
export function isEnvelope(value: unknown): value is ContentEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ContentEnvelope).encrypted === "string" &&
    typeof (value as ContentEnvelope).iv === "string"
  )
}

/** Encrypt any JSON-serializable field value into an envelope. */
export async function encryptField(key: CryptoKey, value: unknown): Promise<ContentEnvelope> {
  return encryptData(key, JSON.stringify(value ?? null))
}

/** Decrypt an envelope back to its original value. Throws on wrong key / corruption. */
export async function decryptField<T = unknown>(key: CryptoKey, env: ContentEnvelope): Promise<T> {
  return JSON.parse(await decryptData(key, env.encrypted, env.iv)) as T
}
