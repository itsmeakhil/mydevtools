/**
 * workspace-crypto.ts
 *
 * Client-side Web Crypto helpers for workspace end-to-end encryption.
 *
 * Key hierarchy:
 *   masterKey (AES-GCM, from PBKDF2 — see encryption.ts)
 *     └─ wraps user's X25519/P-256 private key
 *   X25519/P-256 keypair (ECDH)
 *     └─ ECDH → HKDF → KEK (AES-GCM)
 *         └─ wraps DEK (AES-GCM-256 per workspace)
 *   DEK
 *     └─ encrypts individual tool entries
 *
 * Curve selection: X25519 preferred, ECDH P-256 fallback.
 * ponytail: revisit when Web Crypto X25519 lands consistently in our target
 * runtimes (browsers + Node ≥20). Remove selectCurve() and the P-256 fallback
 * once the baseline is confirmed.
 */

// ── Globals ───────────────────────────────────────────────────────────────────

/**
 * Resolve `crypto.subtle` in both browser and Node test environments.
 * In Node jest-environment-node the global `crypto` may be undefined or lack
 * `subtle`; `node:crypto` always exposes a compliant implementation.
 */
function getSubtle(): SubtleCrypto {
  // globalThis.crypto is available in Node ≥19 and all modern browsers.
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle
  }
  // Fallback for older Node / jest-environment-node where globalThis.crypto is absent.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { webcrypto } = require("node:crypto") as typeof import("node:crypto")
  return webcrypto.subtle as unknown as SubtleCrypto
}

function getRandomValues(buf: Uint8Array): Uint8Array {
  if (typeof globalThis.crypto !== "undefined") {
    return globalThis.crypto.getRandomValues(buf)
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { webcrypto } = require("node:crypto") as typeof import("node:crypto")
  return webcrypto.getRandomValues(buf) as Uint8Array
}

// ── Base64 helpers ─────────────────────────────────────────────────────────────

function bufToB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]!)
  return Buffer.from(binary, "binary").toString("base64")
}

function b64ToBuf(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"))
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type EncryptionBlob = { encrypted: string; iv: string }
export type WrappedDek = EncryptionBlob & { senderPublicKey: string }

// ── Curve selection ───────────────────────────────────────────────────────────

let _curveCache: "X25519" | "P-256" | null = null

/**
 * Detects which ECDH curve is available in the current runtime.
 * X25519 is preferred; P-256 is the fallback.
 *
 * ponytail: once X25519 is universally supported (Node ≥20 stable, Chrome/FF/Safari
 * evergreen), drop the fallback and hard-code "X25519".
 */
async function selectCurve(): Promise<"X25519" | "P-256"> {
  if (_curveCache) return _curveCache
  const subtle = getSubtle()
  try {
    await subtle.generateKey({ name: "X25519" } as AlgorithmIdentifier, true, ["deriveBits"])
    _curveCache = "X25519"
  } catch {
    _curveCache = "P-256"
  }
  return _curveCache
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Coerce a Uint8Array to BufferSource. Newer TS DOM types reject
 * `Uint8Array<ArrayBufferLike>` directly; this view-copy resolves the variance.
 */
function bs(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer
}

/** AES-GCM encrypt raw bytes with an AES-GCM key. */
async function aesGcmEncrypt(key: CryptoKey, plaintext: ArrayBuffer): Promise<EncryptionBlob> {
  const subtle = getSubtle()
  const iv = getRandomValues(new Uint8Array(12))
  const ciphertext = await subtle.encrypt({ name: "AES-GCM", iv: bs(iv) }, key, plaintext)
  return { encrypted: bufToB64(ciphertext), iv: bufToB64(iv) }
}

/** AES-GCM decrypt an EncryptionBlob with an AES-GCM key. */
async function aesGcmDecrypt(key: CryptoKey, blob: EncryptionBlob): Promise<ArrayBuffer> {
  const subtle = getSubtle()
  return subtle.decrypt(
    { name: "AES-GCM", iv: bs(b64ToBuf(blob.iv)) },
    key,
    bs(b64ToBuf(blob.encrypted)),
  )
}

/** HKDF-Extract-Expand: derive a 256-bit AES-GCM KEK from raw shared-secret bytes. */
async function deriveKek(sharedSecretBytes: ArrayBuffer): Promise<CryptoKey> {
  const subtle = getSubtle()
  const ikm = await subtle.importKey("raw", sharedSecretBytes, "HKDF", false, [
    "deriveKey",
  ])
  return subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      // Zero salt is intentional: the ECDH shared secret already provides
      // sufficient entropy. Using a fixed salt keeps the protocol stateless.
      salt: bs(new Uint8Array(32)),
      // ponytail: info is not bound to workspaceId (L-2). A fully-compromised
      // server could replay a wrap+fingerprint pair from one workspace into
      // another (server-induced split-view DoS — NOT a confidentiality break,
      // the server never holds a plaintext DEK; and the M-1 fingerprint check in
      // workspace-dek-store already blocks the confidentiality path). Binding
      // ws_id here would close it but is a breaking HKDF change: needs a
      // "workspace-dek-wrap-v2" scheme + a forced re-wrap migration for every
      // member. Upgrade path: version the blob, try v2 then v1 on unwrap, rotate.
      info: bs(new TextEncoder().encode("workspace-dek-wrap-v1")),
    },
    ikm,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  )
}

/** Generate an ECDH keypair with the runtime-selected curve. */
async function generateKeypair(curve: "X25519" | "P-256"): Promise<CryptoKeyPair> {
  const subtle = getSubtle()
  const algorithm =
    curve === "X25519"
      ? ({ name: "X25519" } as AlgorithmIdentifier)
      : ({ name: "ECDH", namedCurve: "P-256" } as EcKeyGenParams)
  return subtle.generateKey(algorithm, true, ["deriveBits"]) as Promise<CryptoKeyPair>
}

/** Serialize a public key to base64-encoded SPKI. */
async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const subtle = getSubtle()
  const spki = await subtle.exportKey("spki", publicKey)
  return bufToB64(spki)
}

/** Import a base64-encoded SPKI public key. */
async function importPublicKey(b64Spki: string, curve: "X25519" | "P-256"): Promise<CryptoKey> {
  const subtle = getSubtle()
  const algorithm =
    curve === "X25519"
      ? ({ name: "X25519" } as AlgorithmIdentifier)
      : ({ name: "ECDH", namedCurve: "P-256" } as EcKeyImportParams)
  return subtle.importKey("spki", bs(b64ToBuf(b64Spki)), algorithm, true, [])
}

/** Derive the ECDH shared secret (raw bits) between a private key and a public key. */
async function ecdhDeriveBits(privateKey: CryptoKey, publicKey: CryptoKey): Promise<ArrayBuffer> {
  const subtle = getSubtle()
  const curve = await selectCurve()
  return subtle.deriveBits(
    curve === "X25519"
      ? ({ name: "X25519", public: publicKey } as AlgorithmIdentifier)
      : ({ name: "ECDH", public: publicKey } as EcdhKeyDeriveParams),
    privateKey,
    256,
  )
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a new ECDH keypair for a user.
 * The private key is encrypted (AES-GCM) with the user's masterKey so it can be
 * persisted server-side without exposing it in plaintext.
 *
 * @returns publicKey – base64 SPKI (share with workspace members)
 * @returns privateKeyEncrypted – AES-GCM blob of the PKCS-8 private key
 */
export async function generateUserKeypair(masterKey: CryptoKey): Promise<{
  publicKey: string
  privateKeyEncrypted: EncryptionBlob
}> {
  const subtle = getSubtle()
  const curve = await selectCurve()
  const keypair = await generateKeypair(curve)
  const pkcs8 = await subtle.exportKey("pkcs8", keypair.privateKey)
  const privateKeyEncrypted = await aesGcmEncrypt(masterKey, pkcs8)
  const publicKey = await exportPublicKey(keypair.publicKey)
  return { publicKey, privateKeyEncrypted }
}

/**
 * Decrypt a wrapped private key blob using the user's masterKey.
 * Returns a CryptoKey ready for ECDH deriveBits.
 */
export async function unwrapUserPrivateKey(
  masterKey: CryptoKey,
  blob: EncryptionBlob,
): Promise<CryptoKey> {
  const subtle = getSubtle()
  const curve = await selectCurve()
  const pkcs8 = await aesGcmDecrypt(masterKey, blob)
  const algorithm =
    curve === "X25519"
      ? ({ name: "X25519" } as AlgorithmIdentifier)
      : ({ name: "ECDH", namedCurve: "P-256" } as EcKeyImportParams)
  return subtle.importKey("pkcs8", pkcs8, algorithm, false, ["deriveBits"])
}

/**
 * Generate a fresh workspace Data Encryption Key (DEK).
 * AES-GCM-256, extractable so it can be wrapped for each member.
 */
export async function generateWorkspaceDek(): Promise<CryptoKey> {
  const subtle = getSubtle()
  return subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"])
}

/**
 * Wrap the workspace DEK for a recipient using ECDH + HKDF + AES-GCM.
 *
 * Protocol:
 *   1. ECDH(myPrivate, recipientPublic) → sharedSecret
 *   2. HKDF(sharedSecret, salt=0x00*32, info="workspace-dek-wrap-v1") → KEK
 *   3. AES-GCM-encrypt(rawDek, KEK) → WrappedDek
 *
 * The sender's public key is embedded in the blob so the recipient can
 * reconstruct the shared secret during unwrap.
 */
export async function wrapDekForMember(
  dek: CryptoKey,
  myPrivate: CryptoKey,
  recipientPublicKey: string,
  myPublicKey: string,
): Promise<WrappedDek> {
  const subtle = getSubtle()
  const curve = await selectCurve()
  const recipientPub = await importPublicKey(recipientPublicKey, curve)
  const sharedSecret = await ecdhDeriveBits(myPrivate, recipientPub)
  const kek = await deriveKek(sharedSecret)
  const rawDek = await subtle.exportKey("raw", dek)
  const blob = await aesGcmEncrypt(kek, rawDek)
  return { ...blob, senderPublicKey: myPublicKey }
}

/**
 * Unwrap a WrappedDek received from another workspace member.
 *
 * Protocol (reverse of wrapDekForMember):
 *   1. ECDH(myPrivate, senderPublic) → sharedSecret
 *   2. HKDF(sharedSecret) → KEK
 *   3. AES-GCM-decrypt(wrappedDek, KEK) → rawDek → importKey
 */
export async function unwrapDek(wrapped: WrappedDek, myPrivate: CryptoKey): Promise<CryptoKey> {
  const subtle = getSubtle()
  const curve = await selectCurve()
  const senderPub = await importPublicKey(wrapped.senderPublicKey, curve)
  const sharedSecret = await ecdhDeriveBits(myPrivate, senderPub)
  const kek = await deriveKek(sharedSecret)
  const blob: EncryptionBlob = { encrypted: wrapped.encrypted, iv: wrapped.iv }
  const rawDek = await aesGcmDecrypt(kek, blob)
  return subtle.importKey("raw", rawDek, { name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ])
}

/**
 * Encrypt a plaintext string with the workspace DEK.
 * Returns a base64 AES-GCM blob.
 */
export async function encryptEntry(dek: CryptoKey, plaintext: string): Promise<EncryptionBlob> {
  const encoded = new TextEncoder().encode(plaintext)
  return aesGcmEncrypt(dek, bs(encoded))
}

/**
 * Decrypt an EncryptionBlob back to a plaintext string using the workspace DEK.
 */
export async function decryptEntry(dek: CryptoKey, blob: EncryptionBlob): Promise<string> {
  const plaintext = await aesGcmDecrypt(dek, blob)
  return new TextDecoder().decode(plaintext)
}

/**
 * Fingerprint a DEK: SHA-256 of the raw key bytes, base64-encoded.
 * Useful for comparing DEKs across network boundaries without exposing key material.
 */
export async function dekFingerprint(dek: CryptoKey): Promise<string> {
  const subtle = getSubtle()
  const raw = await subtle.exportKey("raw", dek)
  const digest = await subtle.digest("SHA-256", raw)
  return bufToB64(digest)
}
