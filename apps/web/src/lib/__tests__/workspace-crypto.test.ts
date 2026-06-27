/**
 * workspace-crypto.test.ts
 *
 * Round-trip tests for client-side workspace crypto helpers.
 *
 * Node's jest-environment-node may not expose `globalThis.crypto.subtle` in all
 * versions, so we polyfill from node:crypto before any module under test loads.
 */

import { webcrypto } from "node:crypto"

// Polyfill globalThis.crypto so workspace-crypto.ts getSubtle() finds it
// before falling back to require("node:crypto").
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

// Also polyfill Buffer if running in a future browser-like environment
// (jest-environment-node always has Buffer, so this is a no-op there)
if (typeof globalThis.Buffer === "undefined") {
  // @ts-expect-error
  globalThis.Buffer = Buffer
}

import {
  generateUserKeypair,
  unwrapUserPrivateKey,
  generateWorkspaceDek,
  wrapDekForMember,
  unwrapDek,
  encryptEntry,
  decryptEntry,
  dekFingerprint,
  type EncryptionBlob,
} from "@/lib/workspace-crypto"

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Create an AES-GCM master key (simulates what PBKDF2 returns in encryption.ts). */
async function makeMasterKey(): Promise<CryptoKey> {
  return webcrypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  ) as Promise<CryptoKey>
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("workspace-crypto", () => {
  // ── encryptEntry / decryptEntry ──────────────────────────────────────────────

  describe("encryptEntry / decryptEntry", () => {
    it("round-trips a plaintext string with the same DEK", async () => {
      const dek = await generateWorkspaceDek()
      const plaintext = "super-secret tool value"
      const blob = await encryptEntry(dek, plaintext)
      const result = await decryptEntry(dek, blob)
      expect(result).toBe(plaintext)
    })

    it("round-trips an empty string", async () => {
      const dek = await generateWorkspaceDek()
      const blob = await encryptEntry(dek, "")
      expect(await decryptEntry(dek, blob)).toBe("")
    })

    it("round-trips a long multi-line string", async () => {
      const dek = await generateWorkspaceDek()
      const long = "x".repeat(10_000) + "\n" + "y".repeat(10_000)
      const blob = await encryptEntry(dek, long)
      expect(await decryptEntry(dek, blob)).toBe(long)
    })

    it("produces different ciphertexts for the same plaintext (fresh IV each time)", async () => {
      const dek = await generateWorkspaceDek()
      const plaintext = "same plaintext"
      const blob1 = await encryptEntry(dek, plaintext)
      const blob2 = await encryptEntry(dek, plaintext)
      // IVs must differ — same IV reuse would be catastrophic
      expect(blob1.iv).not.toBe(blob2.iv)
      expect(blob1.encrypted).not.toBe(blob2.encrypted)
    })

    it("throws when decrypting with the wrong DEK", async () => {
      const dek1 = await generateWorkspaceDek()
      const dek2 = await generateWorkspaceDek()
      const blob = await encryptEntry(dek1, "secret")
      await expect(decryptEntry(dek2, blob)).rejects.toThrow()
    })
  })

  // ── generateUserKeypair / unwrapUserPrivateKey ────────────────────────────────

  describe("generateUserKeypair / unwrapUserPrivateKey", () => {
    it("round-trips: generated keypair private key can be unwrapped", async () => {
      const masterKey = await makeMasterKey()
      const { publicKey, privateKeyEncrypted } = await generateUserKeypair(masterKey)

      expect(typeof publicKey).toBe("string")
      expect(publicKey.length).toBeGreaterThan(0)
      expect(typeof privateKeyEncrypted.encrypted).toBe("string")
      expect(typeof privateKeyEncrypted.iv).toBe("string")

      const privateKey = await unwrapUserPrivateKey(masterKey, privateKeyEncrypted)
      expect(privateKey.type).toBe("private")
      expect(privateKey.extractable).toBe(false)
    })

    it("throws when unwrapping with the wrong masterKey", async () => {
      const masterKey = await makeMasterKey()
      const wrongKey = await makeMasterKey()
      const { privateKeyEncrypted } = await generateUserKeypair(masterKey)
      await expect(unwrapUserPrivateKey(wrongKey, privateKeyEncrypted)).rejects.toThrow()
    })

    it("returns a non-extractable private key after unwrap", async () => {
      const masterKey = await makeMasterKey()
      const { privateKeyEncrypted } = await generateUserKeypair(masterKey)
      const privateKey = await unwrapUserPrivateKey(masterKey, privateKeyEncrypted)
      expect(privateKey.extractable).toBe(false)
    })
  })

  // ── wrapDekForMember / unwrapDek ─────────────────────────────────────────────

  describe("wrapDekForMember / unwrapDek — two-user scenario", () => {
    /**
     * Alice generates the workspace DEK and wraps it for Bob.
     * Bob unwraps it. The two DEKs must have identical fingerprints.
     */
    it("Alice wraps DEK for Bob; Bob unwraps and gets the same DEK", async () => {
      const aliceMaster = await makeMasterKey()
      const bobMaster = await makeMasterKey()

      const aliceKeypair = await generateUserKeypair(aliceMaster)
      const bobKeypair = await generateUserKeypair(bobMaster)

      const alicePrivate = await unwrapUserPrivateKey(aliceMaster, aliceKeypair.privateKeyEncrypted)
      const bobPrivate = await unwrapUserPrivateKey(bobMaster, bobKeypair.privateKeyEncrypted)

      // Alice creates the workspace DEK and wraps it for Bob
      const dek = await generateWorkspaceDek()
      const aliceFp = await dekFingerprint(dek)

      const wrapped = await wrapDekForMember(
        dek,
        alicePrivate,
        bobKeypair.publicKey,
        aliceKeypair.publicKey,
      )

      // Bob unwraps the DEK
      const bobDek = await unwrapDek(wrapped, bobPrivate)
      const bobFp = await dekFingerprint(bobDek)

      expect(bobFp).toBe(aliceFp)
    })

    it("Bob can encrypt entries; Alice can decrypt them after unwrapping DEK", async () => {
      const aliceMaster = await makeMasterKey()
      const bobMaster = await makeMasterKey()

      const aliceKeypair = await generateUserKeypair(aliceMaster)
      const bobKeypair = await generateUserKeypair(bobMaster)

      const alicePrivate = await unwrapUserPrivateKey(aliceMaster, aliceKeypair.privateKeyEncrypted)
      const bobPrivate = await unwrapUserPrivateKey(bobMaster, bobKeypair.privateKeyEncrypted)

      // Alice creates DEK; wraps for herself AND Bob
      const dek = await generateWorkspaceDek()

      const wrappedForBob = await wrapDekForMember(
        dek,
        alicePrivate,
        bobKeypair.publicKey,
        aliceKeypair.publicKey,
      )
      // Bob wraps for Alice so Alice can reconstruct (symmetric ECDH)
      const wrappedForAlice = await wrapDekForMember(
        dek,
        bobPrivate,
        aliceKeypair.publicKey,
        bobKeypair.publicKey,
      )

      const bobDek = await unwrapDek(wrappedForBob, bobPrivate)
      const aliceDek = await unwrapDek(wrappedForAlice, alicePrivate)

      // Bob encrypts; Alice decrypts
      const plaintext = "workspace secret from Bob"
      const blob = await encryptEntry(bobDek, plaintext)
      const decrypted = await decryptEntry(aliceDek, blob)
      expect(decrypted).toBe(plaintext)
    })

    it("unwrapDek fails when recipient uses wrong private key", async () => {
      const aliceMaster = await makeMasterKey()
      const bobMaster = await makeMasterKey()
      const eveMaster = await makeMasterKey()

      const aliceKeypair = await generateUserKeypair(aliceMaster)
      const bobKeypair = await generateUserKeypair(bobMaster)
      const eveKeypair = await generateUserKeypair(eveMaster)

      const alicePrivate = await unwrapUserPrivateKey(aliceMaster, aliceKeypair.privateKeyEncrypted)
      const evePrivate = await unwrapUserPrivateKey(eveMaster, eveKeypair.privateKeyEncrypted)

      const dek = await generateWorkspaceDek()
      const wrappedForBob = await wrapDekForMember(
        dek,
        alicePrivate,
        bobKeypair.publicKey,
        aliceKeypair.publicKey,
      )

      // Eve tries to unwrap with her private key — should fail or produce garbage DEK
      // AES-GCM authentication tag mismatch → throws
      await expect(unwrapDek(wrappedForBob, evePrivate)).rejects.toThrow()
    })
  })

  // ── dekFingerprint ───────────────────────────────────────────────────────────

  describe("dekFingerprint", () => {
    it("is deterministic for the same key", async () => {
      const dek = await generateWorkspaceDek()
      const fp1 = await dekFingerprint(dek)
      const fp2 = await dekFingerprint(dek)
      expect(fp1).toBe(fp2)
    })

    it("differs for different DEKs", async () => {
      const dek1 = await generateWorkspaceDek()
      const dek2 = await generateWorkspaceDek()
      expect(await dekFingerprint(dek1)).not.toBe(await dekFingerprint(dek2))
    })

    it("returns a non-empty base64 string", async () => {
      const dek = await generateWorkspaceDek()
      const fp = await dekFingerprint(dek)
      expect(typeof fp).toBe("string")
      expect(fp.length).toBeGreaterThan(0)
      // SHA-256 → 32 bytes → 44 base64 chars (with padding)
      expect(fp.length).toBe(44)
    })
  })
})
