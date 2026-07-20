/**
 * Cross-tool secret variables for the api-client.
 *
 * Request fields may reference secrets stored in the API Key Vault and the
 * Environment Manager without copying them into api-client environments:
 *
 *   {{vault.<name>}}                        → API-key entry's `apiKey` (matched by entry name)
 *   {{vault.<name>.secret}}                 → that entry's `secret` field
 *   {{env.<project>.<environment>.<KEY>}}   → Environment Manager variable
 *
 * Both stores are E2E-encrypted; resolution fetches and decrypts on demand
 * with the active cipher key and returns a plain token→value map for the
 * send-path substitution. Nothing is cached or persisted in plaintext.
 * Project/environment names containing "." are not addressable (split on ".").
 */

import { listApiKeyEntries } from "@/lib/api-key-vault-api"
import { listEnvSetEntries } from "@/lib/environment-manager-api"
import { decryptData } from "@/lib/encryption"
import { parseApiKeyPayload } from "@/lib/api-key-vault-utils"
import { parseEnvPayloadJson } from "@/lib/environment-manager-utils"

export interface VaultKeyLike {
    name: string
    apiKey: string
    secret: string
}

export interface EnvSetLike {
    project: string
    environment: string
    variables: Array<{ key: string; value: string }>
}

/** Extract `vault.*` / `env.*` placeholder keys from raw request text. */
export function collectSecretTokens(texts: Array<string | undefined | null>): string[] {
    const tokens = new Set<string>()
    for (const text of texts) {
        if (!text) continue
        for (const m of text.matchAll(/\{\{(.+?)\}\}/g)) {
            const key = m[1].trim()
            if (key.startsWith("vault.") || key.startsWith("env.")) tokens.add(key)
        }
    }
    return [...tokens]
}

/** Pure token→value resolution over already-decrypted entries. Unresolvable tokens are omitted. */
export function buildSecretMap(
    tokens: string[],
    vaultKeys: VaultKeyLike[],
    envSets: EnvSetLike[],
): Record<string, string> {
    const map: Record<string, string> = {}
    for (const token of tokens) {
        if (token.startsWith("vault.")) {
            const raw = token.slice("vault.".length)
            // An entry literally named "<raw>" wins over the ".secret" reading.
            const literal = vaultKeys.find((e) => e.name === raw)
            if (literal) {
                map[token] = literal.apiKey
                continue
            }
            if (raw.endsWith(".secret")) {
                const name = raw.slice(0, -".secret".length)
                const entry = vaultKeys.find((e) => e.name === name)
                if (entry) map[token] = entry.secret
            }
        } else {
            const parts = token.slice("env.".length).split(".")
            if (parts.length < 3) continue
            const [project, environment, ...rest] = parts
            const key = rest.join(".")
            const set = envSets.find((s) => s.project === project && s.environment === environment)
            const variable = set?.variables.find((v) => v.key === key)
            if (variable) map[token] = variable.value
        }
    }
    return map
}

/**
 * Resolve secret tokens found in `texts`. Returns {} when none are present.
 * Throws a user-facing message when tokens exist but the vault is locked.
 */
export async function resolveSecretVariables(
    texts: Array<string | undefined | null>,
    cipherKey: CryptoKey | null,
): Promise<Record<string, string>> {
    const tokens = collectSecretTokens(texts)
    if (tokens.length === 0) return {}
    if (!cipherKey) {
        throw new Error("Vault is locked — unlock your master password to resolve {{vault.*}} / {{env.*}} variables.")
    }
    const needVault = tokens.some((t) => t.startsWith("vault."))
    const needEnv = tokens.some((t) => t.startsWith("env."))
    const [keyRows, envRows] = await Promise.all([
        needVault ? listApiKeyEntries() : Promise.resolve([]),
        needEnv ? listEnvSetEntries() : Promise.resolve([]),
    ])
    const vaultKeys = (
        await Promise.all(
            keyRows.map(async (row) => {
                try {
                    return parseApiKeyPayload(await decryptData(cipherKey, row.encryptedData, row.iv))
                } catch {
                    return null
                }
            }),
        )
    ).filter((e): e is NonNullable<typeof e> => e !== null)
    const envSets = (
        await Promise.all(
            envRows.map(async (row) => {
                try {
                    return parseEnvPayloadJson(await decryptData(cipherKey, row.encryptedData, row.iv))
                } catch {
                    return null
                }
            }),
        )
    ).filter((e): e is NonNullable<typeof e> => e !== null)
    return buildSecretMap(tokens, vaultKeys, envSets)
}
