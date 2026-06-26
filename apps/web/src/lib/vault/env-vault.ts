/**
 * AES-GCM-encrypted env-variable vault.
 *
 * Secrets land in the cloud as ciphertext only — server never sees plaintext.
 * Key derives from a passphrase via PBKDF2-SHA256 (250k iterations). Passphrase
 * is held in memory only and re-prompted after page reload.
 */

const PBKDF2_ITERATIONS = 250_000
const PBKDF2_HASH = "SHA-256"
const SALT_BYTES = 16
const IV_BYTES = 12

const enc = new TextEncoder()
const dec = new TextDecoder()

function b64encode(bytes: Uint8Array): string {
    let bin = ""
    for (const b of bytes) bin += String.fromCharCode(b)
    return btoa(bin)
}

function b64decode(s: string): Uint8Array {
    const bin = atob(s)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    const baseKey = await crypto.subtle.importKey(
        "raw",
        enc.encode(passphrase) as BufferSource,
        { name: "PBKDF2" },
        false,
        ["deriveKey"],
    )
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: PBKDF2_HASH },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
    )
}

export interface VaultEntry {
    /** Prefix `vault:` so substitution + UI can tell encrypted vs plaintext at a glance. */
    encrypted: string
}

/** Encrypt a plaintext secret with the passphrase. Salt + IV are prepended to the ciphertext. */
export async function encryptSecret(plaintext: string, passphrase: string): Promise<VaultEntry> {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
    const key = await deriveKey(passphrase, salt)
    const cipher = new Uint8Array(await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv as BufferSource },
        key,
        enc.encode(plaintext) as BufferSource,
    ))
    // Pack: salt(16) | iv(12) | ciphertext
    const packed = new Uint8Array(salt.length + iv.length + cipher.length)
    packed.set(salt, 0)
    packed.set(iv, salt.length)
    packed.set(cipher, salt.length + iv.length)
    return { encrypted: `vault:${b64encode(packed)}` }
}

export async function decryptSecret(entry: VaultEntry | string, passphrase: string): Promise<string> {
    const raw = typeof entry === "string" ? entry : entry.encrypted
    if (!raw.startsWith("vault:")) throw new Error("Not a vault entry")
    const packed = b64decode(raw.slice("vault:".length))
    if (packed.length < SALT_BYTES + IV_BYTES + 1) throw new Error("Malformed vault entry")
    const salt = packed.slice(0, SALT_BYTES)
    const iv = packed.slice(SALT_BYTES, SALT_BYTES + IV_BYTES)
    const cipher = packed.slice(SALT_BYTES + IV_BYTES)
    const key = await deriveKey(passphrase, salt)
    const plain = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv as BufferSource },
        key,
        cipher as BufferSource,
    )
    return dec.decode(plain)
}

export function isVaultValue(value: string): boolean {
    return value.startsWith("vault:")
}
