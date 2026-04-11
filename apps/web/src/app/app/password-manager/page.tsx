"use client"

import { useEffect, useRef } from "react"
import { AddPasswordDialog } from "@/components/password-manager/add-password-dialog"
import { PasswordList } from "@/components/password-manager/password-list"
import { usePasswordStore, type PasswordEntry } from "@/store/password-store"
import { useMasterKeyStore } from "@/store/master-key-store"
import useAuth from "@/utils/useAuth"
import { useIsMobile } from "@/components/hooks/use-mobile"
import { useTranslations } from "next-intl"
import { listPasswordEntries } from "@/lib/password-manager-api"
import { decryptData } from "@/lib/encryption"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

export default function PasswordManagerPage() {
    const t = useTranslations("PasswordManager.page")
    const { user, loading } = useAuth(true)
    const { encryptionKey } = useMasterKeyStore()
    const { setPasswords, setLoading, clearPasswords } = usePasswordStore()
    const isMobile = useIsMobile()
    const loadedRef = useRef(false)

    useEffect(() => {
        if (!encryptionKey || loadedRef.current) return
        loadedRef.current = true
        loadPasswords(encryptionKey)

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
            const rows = await listPasswordEntries()

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
                    <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
                    <AddPasswordDialog />
                </div>
            )}

            <PasswordList />

            {isMobile && <AddPasswordDialog />}
        </div>
    )
}
