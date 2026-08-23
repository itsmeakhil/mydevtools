/**
 * API client for the global master-password vault.
 *
 * The server stores only:
 *   • salt  — a random value used as PBKDF2 input
 *   • verifier — AES-GCM ciphertext of a known token encrypted with the
 *                derived key, used for local key-validity checks
 *
 * The raw master password and the derived CryptoKey are NEVER sent to or
 * stored on the server.
 */

import { apiFetch } from "./desktop/api-fetch"
import { isDesktop } from "./desktop/is-desktop"

export type KeyVerifier = {
    encrypted: string
    iv: string
}

export type MasterVaultOut = {
    salt: string
    verifier: KeyVerifier
    createdAt: number
}

export type MasterVaultSetupRequest = {
    salt: string
    verifier: KeyVerifier
}

/**
 * Returns the master vault metadata or `null` if the user has not yet set up
 * their master password.
 */
export async function getMasterVaultOrNull(): Promise<MasterVaultOut | null> {
    const res = await apiFetch("/api/backend/auth/master-vault")
    if (res.status === 404) return null
    if (!res.ok) {
        throw new Error(`Failed to fetch master vault (${res.status})`)
    }
    return (await res.json()) as MasterVaultOut
}

/**
 * Creates the master vault for the first time.
 * Only the PBKDF2 salt and an encrypted verification blob are sent — the
 * password itself stays on the client.
 */
export async function setupMasterVault(
    body: MasterVaultSetupRequest
): Promise<MasterVaultOut> {
    const res = await apiFetch("/api/backend/auth/master-vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    })
    if (!res.ok) {
        const detail = await res.text().catch(() => "")
        throw new Error(detail || `Failed to setup master vault (${res.status})`)
    }
    return (await res.json()) as MasterVaultOut
}

// ── Secure Files KEK (desktop only) ───────────────────────────────────────────

/**
 * After the webview has verified the master password, hand it to Rust once so
 * Secure Files can derive its own Argon2id key (held in memory, never stored).
 * Never blocks the webview unlock — a failure only leaves Secure Files locked.
 */
export async function unlockSecureVault(password: string): Promise<void> {
    if (!isDesktop()) return
    try {
        const res = await apiFetch("/api/backend/auth/master-vault/unlock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
        })
        if (!res.ok) console.warn("[secure-files] unlock failed:", res.status)
    } catch (err) {
        console.warn("[secure-files] unlock failed:", err)
    }
}

/** Drop the Rust-side Secure Files key. Fire-and-forget. */
export function lockSecureVault(): void {
    if (!isDesktop()) return
    void apiFetch("/api/backend/auth/master-vault/lock", { method: "POST" }).catch(() => {})
}

// ── Backup codes ──────────────────────────────────────────────────────────────

export type BackupCodeEntry = {
    codeId: string
    codeSalt: string
    encrypted: string
    iv: string
    used?: boolean
}

export type BackupCodeDataOut = {
    codeSalt: string
    encrypted: string
    iv: string
}

export async function storeBackupCodes(codes: BackupCodeEntry[]): Promise<void> {
    const res = await apiFetch("/api/backend/auth/backup-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes }),
    })
    if (!res.ok) {
        throw new Error(`Failed to store backup codes (${res.status})`)
    }
}

export async function lookupBackupCode(codeId: string): Promise<BackupCodeDataOut> {
    const res = await apiFetch("/api/backend/auth/backup-codes/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codeId }),
    })
    if (res.status === 404) throw new Error("Invalid or already-used backup code.")
    if (!res.ok) throw new Error(`Backup code lookup failed (${res.status})`)
    return (await res.json()) as BackupCodeDataOut
}

export async function markBackupCodeUsed(codeId: string): Promise<void> {
    const res = await apiFetch("/api/backend/auth/backup-codes/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codeId }),
    })
    if (!res.ok) {
        throw new Error(`Failed to consume backup code (${res.status})`)
    }
}

export type BackupCodeStatus = { total: number; remaining: number }

export async function getBackupCodeStatus(): Promise<BackupCodeStatus> {
    const res = await apiFetch("/api/backend/auth/backup-codes")
    if (!res.ok) throw new Error(`Backup code status failed (${res.status})`)
    return (await res.json()) as BackupCodeStatus
}
