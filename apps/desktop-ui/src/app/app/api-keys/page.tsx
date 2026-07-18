"use client"

import { useEffect, useRef } from "react"
import { AddApiKeyDialog } from "@/components/api-key-vault/add-api-key-dialog"
import { ApiKeyList } from "@/components/api-key-vault/api-key-list"
import { useApiKeyVaultStore, type ApiKeyEntry, type ApiKeyEnv } from "@/store/api-key-vault-store"
import { ToolHeader } from "@/components/tools/tool-header"
import { useVaultGuard } from "@/hooks/use-vault-guard"
import { VaultLockedPlaceholder } from "@/components/vault-locked-placeholder"
import { VaultRestoringSkeleton } from "@/components/vault-restoring-skeleton"
import useAuth from "@/utils/useAuth"
import { useIsMobile } from "@/components/hooks/use-mobile"
import { listApiKeyEntries } from "@/lib/api-key-vault-api"
import { decryptData } from "@/lib/encryption"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { EncryptedToolPlaceholder } from "@/components/encrypted-tool-placeholder"
import { useActiveWorkspace } from "@/store/workspace-store"
import { useCipherKey } from "@/lib/use-cipher-key"
import { hasWorkspaceEncryption } from "@/lib/workspace-rbac"

// ponytail: inline parser — one place uses it, no utils file
function parseApiKeyPayload(plain: string): Omit<ApiKeyEntry, "id" | "createdAt" | "updatedAt"> | null {
    try {
        const o = JSON.parse(plain)
        if (typeof o !== "object" || o === null) return null
        const env: ApiKeyEnv =
            o.env === "staging" || o.env === "production" ? o.env : "development"
        return {
            name: typeof o.name === "string" ? o.name : "",
            apiKey: typeof o.apiKey === "string" ? o.apiKey : "",
            secret: typeof o.secret === "string" ? o.secret : "",
            env,
            notes: typeof o.notes === "string" ? o.notes : "",
        }
    } catch {
        return null
    }
}

export default function ApiKeyVaultPage() {
    // ALL hooks must be called before any early return (Rules of Hooks).
    const activeWs = useActiveWorkspace()
    const { user, loading } = useAuth(true)
    const encryptionKey = useCipherKey()
    const { isUnlocked, isRestoring } = useVaultGuard()
    const { setEntries, setLoading, clearEntries } = useApiKeyVaultStore()
    const isMobile = useIsMobile()
    const loadedRef = useRef(false)

    // Regular async helper — not a hook, safe to define before useEffect.
    const loadEntries = async (key: CryptoKey, isCancelled: () => boolean) => {
        setLoading(true)
        try {
            const rows = await listApiKeyEntries()
            if (isCancelled()) return
            const decrypted = await Promise.all(
                rows.map(async (row) => {
                    try {
                        const plain = await decryptData(key, row.encryptedData, row.iv)
                        const parsed = parseApiKeyPayload(plain)
                        if (!parsed) return null
                        return {
                            id: row.id,
                            ...parsed,
                            createdAt: row.createdAt,
                            updatedAt: row.updatedAt,
                        } satisfies ApiKeyEntry
                    } catch {
                        return null
                    }
                })
            )
            if (isCancelled()) return
            setEntries(decrypted.filter((x): x is ApiKeyEntry => x !== null))
        } catch {
            if (!isCancelled()) toast.error("Failed to load API keys")
        } finally {
            if (!isCancelled()) setLoading(false)
        }
    }

    useEffect(() => {
        if (!encryptionKey || loadedRef.current) return
        loadedRef.current = true
        let cancelled = false
        loadEntries(encryptionKey, () => cancelled)

        return () => {
            cancelled = true
            clearEntries()
            loadedRef.current = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [encryptionKey])

    // Show placeholder for shared workspaces that have not yet enabled E2EE.
    // Forward-compat: when activeWs.settings?.encryption is set AND a wrappedDek
    // exists the normal flow runs (C-T9 will land the toggle UI).
    if (activeWs && !activeWs.is_personal && !hasWorkspaceEncryption(activeWs)) {
        return <EncryptedToolPlaceholder toolName="API Key Vault" />
    }

    if (isRestoring) return <VaultRestoringSkeleton />
    if (!isUnlocked) return <VaultLockedPlaceholder appName="API Keys" />

    if (loading) {
        return (
            <div className="h-full flex flex-col container mx-auto px-4 md:px-6 lg:px-8">
                <div className="flex justify-between items-center py-6 shrink-0">
                    <Skeleton className="h-9 w-56" />
                    <Skeleton className="h-9 w-40" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-36 w-full rounded-xl" />
                    ))}
                </div>
            </div>
        )
    }

    if (!user) return null

    return (
        <div
            className={
                isMobile
                    ? "h-full bg-background flex flex-col min-h-0"
                    : "h-full flex flex-col container mx-auto px-4 md:px-6 lg:px-8 min-h-0"
            }
        >
            <ToolHeader
                title="API Keys"
                description="AES-256-GCM encrypted and stored on your device."
                toolId="/app/api-keys"
                className="shrink-0 px-0 sm:px-0"
            />

            <div className="flex-1 min-h-0 flex flex-col">
                <ApiKeyList />
            </div>

            {isMobile && <AddApiKeyDialog />}
        </div>
    )
}
