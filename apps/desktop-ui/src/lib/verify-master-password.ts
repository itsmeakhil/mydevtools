import { deriveKey, verifyKey } from "@/lib/encryption"
import { getMasterVaultOrNull } from "@/lib/global-vault-api"

export const CURRENT_KDF_ITERATIONS = 600_000
/** Vaults created before the iteration count was raised. */
const LEGACY_KDF_ITERATIONS = 100_000

/**
 * Derives a key from `password` and checks it against the stored verifier,
 * trying the current iteration count and then the legacy one.
 *
 * Extracted so the unlock gate and any re-authentication prompt share one
 * implementation — the fallback is easy to forget, and forgetting it locks
 * every pre-upgrade vault out of whichever flow omitted it.
 *
 * Returns the derived key on success, null when the password is wrong.
 */
export async function verifyMasterPassword(
    password: string,
    vault: { salt: string; verifier: { encrypted: string; iv: string } }
): Promise<CryptoKey | null> {
    for (const iterations of [CURRENT_KDF_ITERATIONS, LEGACY_KDF_ITERATIONS]) {
        const key = await deriveKey(password, vault.salt, iterations)
        if (await verifyKey(key, vault.verifier.encrypted, vault.verifier.iv)) return key
    }
    return null
}

/**
 * Re-authentication for an action that exposes the whole vault at once.
 * Fetches the vault record itself so callers need nothing but the password.
 */
export async function reauthenticate(password: string): Promise<boolean> {
    const vault = await getMasterVaultOrNull()
    if (!vault) return false
    return (await verifyMasterPassword(password, vault)) !== null
}
