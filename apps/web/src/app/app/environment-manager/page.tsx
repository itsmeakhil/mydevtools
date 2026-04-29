"use client"

import { useEffect, useRef } from "react"
import { AddEnvironmentSetDialog } from "@/components/environment-manager/add-environment-set-dialog"
import { EnvironmentSetList } from "@/components/environment-manager/environment-set-list"
import { useEnvironmentManagerStore, type EnvSetEntry } from "@/store/environment-manager-store"
import { useMasterKeyStore } from "@/store/master-key-store"
import { useVaultGuard } from "@/hooks/use-vault-guard"
import { VaultLockedPlaceholder } from "@/components/vault-locked-placeholder"
import useAuth from "@/utils/useAuth"
import { useIsMobile } from "@/components/hooks/use-mobile"
import { useTranslations } from "next-intl"
import { listEnvSetEntries } from "@/lib/environment-manager-api"
import { decryptData } from "@/lib/encryption"
import { parseEnvPayloadJson } from "@/lib/environment-manager-utils"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

export default function EnvironmentManagerPage() {
    const t = useTranslations("EnvironmentManager.page")
    const { user, loading } = useAuth(true)
    const { encryptionKey } = useMasterKeyStore()
    const { isUnlocked } = useVaultGuard()
    const { setSets, setLoading, clearSets } = useEnvironmentManagerStore()
    const isMobile = useIsMobile()
    const loadedRef = useRef(false)

    useEffect(() => {
        if (!encryptionKey || loadedRef.current) return
        loadedRef.current = true
        loadSets(encryptionKey)

        return () => {
            clearSets()
            loadedRef.current = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [encryptionKey])

    const loadSets = async (key: CryptoKey) => {
        setLoading(true)
        try {
            const rows = await listEnvSetEntries()
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
            setSets(decrypted.filter((x): x is EnvSetEntry => x !== null))
        } catch {
            toast.error(t("loadFailed"))
        } finally {
            setLoading(false)
        }
    }

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

    return (
        <div
            className={
                isMobile
                    ? "h-full bg-background flex flex-col min-h-0"
                    : "h-full flex flex-col container mx-auto px-4 md:px-6 lg:px-8 min-h-0"
            }
        >
            {!isMobile && (
                <div className="flex justify-between items-center py-6 shrink-0">
                    <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
                    <AddEnvironmentSetDialog />
                </div>
            )}

            <div className="flex-1 min-h-0 flex flex-col">
                <EnvironmentSetList />
            </div>

            {isMobile && <AddEnvironmentSetDialog />}
        </div>
    )
}
