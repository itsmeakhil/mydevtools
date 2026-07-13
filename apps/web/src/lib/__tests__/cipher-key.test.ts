/**
 * cipher-key.test.ts
 *
 * Unit tests for getCipherKey() — workspaces are single-user (personal), so the
 * cipher key is always the master key.
 */

import { webcrypto } from "node:crypto"

// Polyfill globalThis.crypto for jest-environment-node
if (typeof globalThis.crypto === "undefined") {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    writable: true,
    configurable: true,
  })
} else if (!globalThis.crypto.subtle) {
  // @ts-expect-error — polyfill subtle on existing partial crypto
  globalThis.crypto.subtle = webcrypto.subtle
}

import { getCipherKey } from "@/lib/cipher-key"
import type { Workspace } from "@/lib/workspace-api"

// ── Helpers ────────────────────────────────────────────────────────────────────

async function makeKey(): Promise<CryptoKey> {
  return webcrypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]) as Promise<CryptoKey>
}

function personalWs(overrides?: Partial<Workspace>): Workspace {
  return {
    id: "ws-personal-1",
    name: "My Workspace",
    slug: "my-workspace",
    is_personal: true,
    kind: "personal",
    ws_role: "admin",
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("getCipherKey", () => {
  it("returns null when workspace is null", async () => {
    const masterKey = await makeKey()
    const result = await getCipherKey(null, masterKey)
    expect(result).toBeNull()
  })

  it("returns masterKey for a personal workspace", async () => {
    const masterKey = await makeKey()
    const result = await getCipherKey(personalWs(), masterKey)
    expect(result).toBe(masterKey)
  })

  it("returns null for a personal workspace when masterKey is null", async () => {
    const result = await getCipherKey(personalWs(), null)
    expect(result).toBeNull()
  })
})
