/**
 * "Move to vault": take literal credentials typed into request/folder auth
 * fields of a folder collection and store them as API Key Vault entries,
 * replacing each field value with a `{{vault.<name>}}` reference. The vault is
 * E2E-encrypted; references are safe to serialize to git-able files (the
 * serializer redacts literals, so moving is how a credential survives).
 *
 * `planVaultMoves` is pure (unit-testable); `moveCollectionSecretsToVault`
 * wraps it with the encrypt/create IO.
 */

import type { Collection, CollectionFolder, CollectionRequest, RequestAuth } from "@/components/api-client/types"
import { SENSITIVE_AUTH_FIELDS, isVariableReference, slugify } from "./file-store"

export interface VaultMovePlan {
    /** Entries to create: vault name → literal value. */
    creates: Array<{ name: string; value: string }>
    /** Tree with every moved field replaced by its `{{vault.<name>}}` token. */
    collection: Collection
    /** Total fields rewritten (creates + reuses of existing entries). */
    moved: number
}

function getAt(obj: Record<string, unknown>, path: string[]): unknown {
    let cur: unknown = obj
    for (const seg of path) {
        if (typeof cur !== "object" || cur === null) return undefined
        cur = (cur as Record<string, unknown>)[seg]
    }
    return cur
}

function setAt(obj: Record<string, unknown>, path: string[], value: string): void {
    let cur = obj
    for (const seg of path.slice(0, -1)) {
        cur = cur[seg] as Record<string, unknown>
    }
    cur[path[path.length - 1]] = value
}

/**
 * Compute the moves. `existingByName` = already-decrypted vault entries
 * (name → apiKey): an entry holding the same value is reused instead of
 * duplicated; a taken name with a different value gets a `-2` suffix.
 */
export function planVaultMoves(
    col: Collection,
    existingByName: Map<string, string>,
): VaultMovePlan {
    const creates: Array<{ name: string; value: string }> = []
    const plannedByName = new Map<string, string>()
    let moved = 0

    const vaultNameFor = (ownerName: string, field: string, value: string): string => {
        // Same value already in the vault (or planned)? Reuse its name.
        for (const [name, v] of existingByName) if (v === value) return name
        for (const [name, v] of plannedByName) if (v === value) return name
        const base = slugify(`${ownerName}-${field}`)
        let candidate = base
        for (let n = 2; existingByName.has(candidate) || plannedByName.has(candidate); n++) {
            candidate = `${base}-${n}`
        }
        plannedByName.set(candidate, value)
        creates.push({ name: candidate, value })
        return candidate
    }

    const moveAuth = (auth: RequestAuth | undefined, ownerName: string): RequestAuth | undefined => {
        if (!auth || auth.type === "none") return auth
        const copy = JSON.parse(JSON.stringify(auth)) as Record<string, unknown>
        let touched = false
        for (const path of SENSITIVE_AUTH_FIELDS) {
            const value = getAt(copy, path)
            if (typeof value === "string" && value !== "" && !isVariableReference(value)) {
                const name = vaultNameFor(ownerName, path[path.length - 1], value)
                setAt(copy, path, `{{vault.${name}}}`)
                touched = true
                moved++
            }
        }
        return touched ? (copy as unknown as RequestAuth) : auth
    }

    const visit = (items: (CollectionFolder | CollectionRequest)[]): (CollectionFolder | CollectionRequest)[] =>
        items.map((item) => {
            if ("type" in item && item.type === "folder") {
                return { ...item, defaultAuth: moveAuth(item.defaultAuth, item.name), items: visit(item.items) }
            }
            const req = item as CollectionRequest
            return { ...req, auth: moveAuth(req.auth, req.name) as CollectionRequest["auth"] }
        })

    return { creates, collection: { ...col, items: visit(col.items) }, moved }
}

/**
 * Execute a move against the real vault. Reads existing entries (to reuse /
 * avoid name collisions), creates the new ones, returns the rewritten tree.
 * Throws with a user-facing message when the vault is locked.
 */
export async function moveCollectionSecretsToVault(
    col: Collection,
    cipherKey: CryptoKey | null,
): Promise<{ collection: Collection; moved: number }> {
    if (!cipherKey) {
        throw new Error("Vault is locked — unlock your master password to move credentials.")
    }
    const [{ listApiKeyEntries, createApiKeyEntry }, { decryptData, encryptData }, { parseApiKeyPayload }] =
        await Promise.all([
            import("@/lib/api-key-vault-api"),
            import("@/lib/encryption"),
            import("@/lib/api-key-vault-utils"),
        ])

    const existingByName = new Map<string, string>()
    for (const row of await listApiKeyEntries()) {
        try {
            const entry = parseApiKeyPayload(await decryptData(cipherKey, row.encryptedData, row.iv))
            if (entry?.name) existingByName.set(entry.name, entry.apiKey)
        } catch {
            // Undecryptable row (other key / corrupt) — skip; worst case a name collision suffix.
        }
    }

    const plan = planVaultMoves(col, existingByName)
    for (const { name, value } of plan.creates) {
        const payload = JSON.stringify({
            name,
            apiKey: value,
            secret: "",
            env: "development",
            notes: "Moved from an API-client folder collection",
        })
        const { encrypted, iv } = await encryptData(cipherKey, payload)
        await createApiKeyEntry({ encryptedData: encrypted, iv })
    }
    return { collection: plan.collection, moved: plan.moved }
}
