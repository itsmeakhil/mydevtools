"use client"

import { useEffect, useRef } from "react"
import { AddEnvironmentSetDialog } from "@/components/environment-manager/add-environment-set-dialog"
import { EnvironmentSetList } from "@/components/environment-manager/environment-set-list"
import { useEnvironmentManagerStore, type EnvSetEntry } from "@/store/environment-manager-store"
import { useVaultGuard } from "@/hooks/use-vault-guard"
import { VaultLockedPlaceholder } from "@/components/vault-locked-placeholder"
import { VaultRestoringSkeleton } from "@/components/vault-restoring-skeleton"
import useAuth from "@/utils/useAuth"
import { useIsMobile } from "@/components/hooks/use-mobile"
import { useTranslations } from "next-intl"
import { listEnvSetEntries } from "@/lib/environment-manager-api"
import { decryptData } from "@/lib/encryption"
import { parseEnvPayloadJson } from "@/lib/environment-manager-utils"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { EncryptedToolPlaceholder } from "@/components/encrypted-tool-placeholder"
import { useActiveWorkspace } from "@/store/workspace-store"
import { useCipherKey } from "@/lib/use-cipher-key"
import { hasWorkspaceEncryption } from "@/lib/workspace-rbac"

export default function EnvironmentManagerPage() {
    const t = useTranslations("EnvironmentManager.page")
    const activeWs = useActiveWorkspace()
    const { user, loading } = useAuth(true)
    const encryptionKey = useCipherKey()
    const { isUnlocked, isRestoring } = useVaultGuard()
    const { setSets, setLoading, clearSets } = useEnvironmentManagerStore()
    const isMobile = useIsMobile()
    const loadedRef = useRef(false)

    // Regular async helper — not a hook, safe to define before useEffect.
    const loadSets = async (key: CryptoKey, isCancelled: () => boolean) => {
        setLoading(true)
        try {
            const rows = await listEnvSetEntries()
            if (isCancelled()) return
            const decrypted = await Promise.all(
                rows.map(async (row) => {
                    try {
                        const plain = await decryptData(key, row.encryptedData, row.iv)
                        const parsed = parseEnvPayloadJson(plain)
                        if (!parsed) return null
                        return {
                            id: row.id,
                            ...parsed,
                            createdAt: row.createdAt,
                            updatedAt: row.updatedAt,
                        } satisfies EnvSetEntry
                    } catch {
                        return null
                    }
                })
            )
            if (isCancelled()) return
            setSets(decrypted.filter((x): x is EnvSetEntry => x !== null))
        } catch {
            if (!isCancelled()) toast.error(t("loadFailed"))
        } finally {
            if (!isCancelled()) setLoading(false)
        }
    }

    // ALL hooks must be called before any early return (Rules of Hooks).
    useEffect(() => {
        if (!encryptionKey || loadedRef.current) return
        loadedRef.current = true
        let cancelled = false
        loadSets(encryptionKey, () => cancelled)

        return () => {
            cancelled = true
            clearSets()
            loadedRef.current = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [encryptionKey])

    // Show placeholder for shared workspaces that have not yet enabled E2EE.
    // Forward-compat: when activeWs.settings?.encryption is set AND a wrappedDek
    // exists the normal flow runs (C-T9 will land the toggle UI).
    if (activeWs && !activeWs.is_personal && !hasWorkspaceEncryption(activeWs)) {
        return <EncryptedToolPlaceholder toolName="Environment Manager" />
    }

    if (isRestoring) return <VaultRestoringSkeleton />
    if (!isUnlocked) return <VaultLockedPlaceholder appName="Environment Manager" />

    if (loading) {
        return (
            <div className="h-full flex flex-col container mx-auto px-4 md:px-6 lg:px-8">
                <div className="flex justify-between items-center py-6 shrink-0">
                    <Skeleton className="h-9 w-56" />
                    <Skeleton className="h-9 w-40" />
                </div>
                <div className="flex gap-3 mb-6">
                    <Skeleton className="h-9 flex-1 max-w-sm" />
                    <Skeleton className="h-9 w-24" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-44 w-full rounded-xl" />
                    ))}
                </div>
            </div>
        )
    }

    if (!user) return null

    // Tool identity lives in the ToolSidebarLayout header EnvironmentSetList
    // renders — no separate page header row.
    return (
        <div className="h-full min-h-0 bg-background">
            <EnvironmentSetList />
            {isMobile && <AddEnvironmentSetDialog />}
        </div>
    )
}
