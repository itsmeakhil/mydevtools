/**
 * content-envelope.test.ts
 *
 * Round-trip + detection tests for note/snippet body envelopes.
 *
 * encryption.ts reaches for `window.crypto`, and jest-environment-node exposes
 * neither `window` nor (in some versions) `globalThis.crypto.subtle`. Polyfill
 * both from node:crypto before the module under test loads.
 */
import { webcrypto } from "node:crypto"

if (typeof globalThis.crypto === "undefined") {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, writable: true, configurable: true })
}
// encryption.ts reaches for window.crypto / window.btoa / window.atob; shim them
// onto a window stub for jest-environment-node (no DOM globals present).
const g = globalThis as unknown as { window?: Record<string, unknown>; btoa: unknown; atob: unknown }
g.window = g.window ?? {}
g.window.crypto = globalThis.crypto
g.window.btoa = g.btoa
g.window.atob = g.atob

import { encryptField, decryptField, isEnvelope } from "@/lib/content-envelope"

async function makeKey(): Promise<CryptoKey> {
  return webcrypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]) as Promise<CryptoKey>
}

describe("content-envelope", () => {
  test("isEnvelope only matches { encrypted, iv } string pairs", () => {
    expect(isEnvelope({ encrypted: "a", iv: "b" })).toBe(true)
    expect(isEnvelope({ blocks: [] })).toBe(false)
    expect(isEnvelope("plain code")).toBe(false)
    expect(isEnvelope(null)).toBe(false)
    expect(isEnvelope({ encrypted: 1, iv: 2 })).toBe(false)
  })

  test("round-trips an object body (note content)", async () => {
    const key = await makeKey()
    const content = { blocks: [{ type: "p", text: "secret 🔐" }] }
    const env = await encryptField(key, content)
    expect(isEnvelope(env)).toBe(true)
    expect(JSON.stringify(env)).not.toContain("secret")
    expect(await decryptField(key, env)).toEqual(content)
  })

  test("round-trips a string body (snippet code)", async () => {
    const key = await makeKey()
    const code = "const x = 42\n// π"
    const env = await encryptField(key, code)
    expect(await decryptField<string>(key, env)).toBe(code)
  })

  test("wrong key fails to decrypt", async () => {
    const env = await encryptField(await makeKey(), "data")
    await expect(decryptField(await makeKey(), env)).rejects.toThrow()
  })
})
