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

import { backendFetch } from "./backend-auth"

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
    const res = await backendFetch("/api/backend/auth/master-vault")
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
    const res = await backendFetch("/api/backend/auth/master-vault", {
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
