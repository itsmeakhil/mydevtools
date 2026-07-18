"use client"

import { useEffect, useRef } from "react"
import { AddPasswordDialog } from "@/components/password-manager/add-password-dialog"
import { PasswordList } from "@/components/password-manager/password-list"
import { usePasswordStore, type PasswordEntry } from "@/store/password-store"
import { useMasterKeyStore } from "@/store/master-key-store"
import { useVaultGuard } from "@/hooks/use-vault-guard"
import { VaultLockedPlaceholder } from "@/components/vault-locked-placeholder"
import { VaultRestoringSkeleton } from "@/components/vault-restoring-skeleton"
import useAuth from "@/utils/useAuth"
import { useIsMobile } from "@/components/hooks/use-mobile"
import { useTranslations } from "next-intl"
import { listPasswordEntries } from "@/lib/password-manager-api"
import { decryptData } from "@/lib/encryption"
import { getCipherKey } from "@/lib/cipher-key"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchAllPages } from "@/lib/fetch-all-pages"
import { EncryptedToolPlaceholder } from "@/components/encrypted-tool-placeholder"
import { useActiveWorkspace } from "@/store/workspace-store"
import { hasWorkspaceEncryption } from "@/lib/workspace-rbac"
import { IconShieldLock } from "@tabler/icons-react"
import { CATEGORY_ACCENT } from "@/components/dashboard/types"
import { cn } from "@/lib/utils"

const PASSWORDS_PAGE_SIZE = 500

// ponytail: C-T6 DEK integration — apply getCipherKey / useCipherKey to
// remaining call sites (import-export-dialog, any future bulk operations)
// in a follow-up once C-T9 workspace encryption toggle ships.

export default function PasswordManagerPage() {
    const t = useTranslations("PasswordManager.page")
    const activeWs = useActiveWorkspace()
    const { user, loading } = useAuth(true)
    const { encryptionKey } = useMasterKeyStore()
    const { isUnlocked, isRestoring } = useVaultGuard()
    const { setPasswords, setLoading, clearPasswords } = usePasswordStore()
    const isMobile = useIsMobile()
    const loadedRef = useRef(false)

    // Placeholder gate computed up-front; the actual early return happens AFTER
    // every hook below so React sees a stable hook order across renders.
    const needsEncryptionGate =
        !!activeWs && !activeWs.is_personal && !hasWorkspaceEncryption(activeWs)

    useEffect(() => {
        if (!encryptionKey || loadedRef.current) return
        loadedRef.current = true
        // Resolve the correct cipher key (master key for personal, DEK for shared)
        // before loading passwords so the correct key is used for decryption.
        getCipherKey(activeWs, encryptionKey).then((key) => {
            if (key) loadPasswords(key)
        })

        return () => {
            // Clear decrypted passwords from memory when leaving the page
            clearPasswords()
            loadedRef.current = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [encryptionKey])

    const loadPasswords = async (key: CryptoKey) => {
        setLoading(true)
        try {
            const rows = await fetchAllPages({
                pageSize: PASSWORDS_PAGE_SIZE,
                fetchPage: (skip, limit) => listPasswordEntries({ skip, limit }),
            })

            const decrypted = await Promise.all(
                rows.map(async (row) => {
                    try {
                        const plain = await decryptData(key, row.encryptedData, row.iv)
                        const parsed = JSON.parse(plain)
                        return {
                            id: row.id,
                            ...parsed,
                            createdAt: row.createdAt,
                            updatedAt: row.updatedAt,
                        } as PasswordEntry
                    } catch {
                        return null
                    }
                }),
            )

            setPasswords(decrypted.filter((p): p is PasswordEntry => p !== null))
        } catch {
            toast.error(t("loadFailed"))
        } finally {
            setLoading(false)
        }
    }

    if (needsEncryptionGate) return <EncryptedToolPlaceholder toolName="Password Manager" />
    if (isRestoring) return <VaultRestoringSkeleton />
    if (!isUnlocked) return <VaultLockedPlaceholder appName="Password Manager" />

    if (loading) {
        return (
            <div className="h-full flex flex-col container mx-auto px-4 md:px-6 lg:px-8">
                <div className="flex justify-between items-center py-6 shrink-0">
                    <Skeleton className="h-9 w-48" />
                    <Skeleton className="h-9 w-36" />
                </div>
                <div className="flex gap-3 mb-6">
                    <Skeleton className="h-9 flex-1 max-w-sm" />
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-20" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
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
                    ? "h-full bg-background"
                    : "h-full flex flex-col container mx-auto px-4 md:px-6 lg:px-8"
            }
        >
            {!isMobile && (
                <div className="flex justify-between items-center py-6 shrink-0">
                    <div className="flex items-center gap-3">
                        <span
                            className={cn(
                                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-inset ring-border/60",
                                CATEGORY_ACCENT.Security.bg,
                                CATEGORY_ACCENT.Security.text,
                            )}
                        >
                            <IconShieldLock className="h-[22px] w-[22px]" aria-hidden />
                        </span>
                        <h1 className="text-sm font-semibold tracking-tight">{t("title")}</h1>
                    </div>
                    <AddPasswordDialog />
                </div>
            )}

            <PasswordList />

            {isMobile && <AddPasswordDialog />}
        </div>
    )
}
