"use client"

import { AddPasswordDialog } from "@/components/password-manager/add-password-dialog"
import { PasswordList } from "@/components/password-manager/password-list"
import { VaultLockScreen } from "@/components/password-manager/master-password-modal"
import { usePasswordStore } from "@/store/password-store"
import useAuth from "@/utils/useAuth"
import { useIsMobile } from "@/components/hooks/use-mobile"
import { useTranslations } from "next-intl"

export default function PasswordManagerPage() {
    const { user, loading } = useAuth(true);
    const { isUnlocked } = usePasswordStore()
    const isMobile = useIsMobile()
    const t = useTranslations("PasswordManager.page")

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">{t("loading")}</div>;
    }

    if (!user) {
        return null;
    }

    if (!isUnlocked) {
        return <VaultLockScreen />
    }

    return (
        <div className={isMobile
            ? "h-full bg-background"
            : "h-full flex flex-col container mx-auto px-4 md:px-6 lg:px-8"
        }>
            {/* Desktop header - hidden on mobile */}
            {!isMobile && (
                <div className="flex justify-between items-center py-6 shrink-0">
                    <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
                    <AddPasswordDialog />
                </div>
            )}

            <PasswordList />

            {/* Mobile FAB for add */}
            {isMobile && <AddPasswordDialog />}
        </div>
    )
}
