/**
 * WebAuthn user-presence gate for the env vault.
 *
 * The credential ID lives in localStorage; on each unlock we require the
 * authenticator to assert presence (Touch ID, security key tap, etc.). The
 * passphrase itself is still required for the AES-GCM key — WebAuthn only
 * gates **when** the user is allowed to enter it.
 *
 * Holds an in-memory "unlocked until" timestamp so back-to-back vault reads
 * within the next 5 min don't re-prompt.
 */

const CRED_KEY = "mdt-vault-credential-id"
const UNLOCK_TTL_MS = 5 * 60 * 1000

let unlockedUntil = 0

function isWebAuthnAvailable(): boolean {
    return typeof window !== "undefined" &&
        typeof window.PublicKeyCredential !== "undefined" &&
        typeof navigator?.credentials?.create === "function"
}

function b64ToBuf(b64: string): ArrayBuffer {
    const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/"))
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out.buffer
}

function bufToB64(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf)
    let bin = ""
    for (const b of bytes) bin += String.fromCharCode(b)
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function randomChallenge(): ArrayBuffer {
    const c = new Uint8Array(32)
    crypto.getRandomValues(c)
    return c.buffer
}

export function hasVaultCredential(): boolean {
    if (typeof window === "undefined") return false
    return !!localStorage.getItem(CRED_KEY)
}

export async function registerVaultCredential(displayName: string): Promise<void> {
    if (!isWebAuthnAvailable()) throw new Error("WebAuthn not supported in this browser")
    const credential = await navigator.credentials.create({
        publicKey: {
            challenge: randomChallenge(),
            rp: { name: "mydevtools api client" },
            user: {
                id: crypto.getRandomValues(new Uint8Array(16)),
                name: displayName,
                displayName,
            },
            pubKeyCredParams: [
                { type: "public-key", alg: -7 },   // ES256
                { type: "public-key", alg: -257 }, // RS256
            ],
            authenticatorSelection: {
                userVerification: "preferred",
                residentKey: "preferred",
            },
            timeout: 60_000,
        },
    }) as PublicKeyCredential | null
    if (!credential) throw new Error("Credential creation aborted")
    localStorage.setItem(CRED_KEY, bufToB64(credential.rawId))
}

export async function assertVaultPresence(): Promise<void> {
    if (Date.now() < unlockedUntil) return
    if (!isWebAuthnAvailable()) throw new Error("WebAuthn unavailable; configure passphrase-only mode")
    const credId = localStorage.getItem(CRED_KEY)
    if (!credId) throw new Error("No vault credential registered")

    const assertion = await navigator.credentials.get({
        publicKey: {
            challenge: randomChallenge(),
            allowCredentials: [{ id: b64ToBuf(credId), type: "public-key" }],
            userVerification: "preferred",
            timeout: 60_000,
        },
    }) as PublicKeyCredential | null
    if (!assertion) throw new Error("Presence assertion failed")
    unlockedUntil = Date.now() + UNLOCK_TTL_MS
}

export function lockVault(): void {
    unlockedUntil = 0
}

export function isVaultUnlocked(): boolean {
    return Date.now() < unlockedUntil
}

export function clearVaultCredential(): void {
    if (typeof window === "undefined") return
    localStorage.removeItem(CRED_KEY)
    unlockedUntil = 0
}
