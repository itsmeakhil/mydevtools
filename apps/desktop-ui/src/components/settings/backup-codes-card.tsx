"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { AlertTriangle, Download, KeyRound } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { generateBackupCodes, encryptWithBackupCode } from "@/lib/encryption"
import {
    getBackupCodeStatus,
    storeBackupCodes,
    type BackupCodeStatus,
} from "@/lib/global-vault-api"
import { verifyMasterPassword } from "@/lib/verify-master-password"
import { useMasterKeyStore } from "@/store/master-key-store"
import { BackupCodesGrid } from "@/components/master-password-gate/backup-codes-grid"
import { downloadBackupCodesFile } from "@/components/master-password-gate/backup-codes-file"
import useAuth from "@/utils/useAuth"

/**
 * Regenerate the master-password backup codes. Codes are only issued at vault
 * setup otherwise, so without this a user who burns all of them (or set the
 * vault up before codes existed) has no recovery path left.
 *
 * Storing a fresh set replaces the whole array, which is what invalidates the
 * old codes. Renders nothing until a vault exists.
 */
export function BackupCodesCard() {
    const t = useTranslations("SettingsPage.backupCodes")
    const { user } = useAuth(false)
    const { vault, vaultStatus } = useMasterKeyStore()
    const [status, setStatus] = useState<BackupCodeStatus | null>(null)
    const [password, setPassword] = useState("")
    const [busy, setBusy] = useState(false)
    const [codes, setCodes] = useState<string[]>([])

    useEffect(() => {
        if (vaultStatus === "not-configured" || vaultStatus === "restoring") return
        getBackupCodeStatus()
            .then(setStatus)
            .catch(() => setStatus(null))
    }, [vaultStatus])

    if (!vault || vaultStatus === "not-configured") return null

    const handleRegenerate = async () => {
        if (!password) return
        setBusy(true)
        try {
            const key = await verifyMasterPassword(password, vault)
            if (!key) {
                toast.error(t("wrongPassword"))
                return
            }
            const fresh = generateBackupCodes(8)
            await storeBackupCodes(
                await Promise.all(fresh.map((code) => encryptWithBackupCode(code, password)))
            )
            setCodes(fresh)
            setStatus({ total: fresh.length, remaining: fresh.length })
            setPassword("")
            toast.success(t("success"))
        } catch {
            toast.error(t("error"))
        } finally {
            setBusy(false)
        }
    }

    return (
        <Card className="rounded-2xl border border-border/60 bg-card/60 shadow-sm backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-violet-500/10 text-primary ring-1 ring-inset ring-border/50">
                        <KeyRound className="h-4 w-4" />
                    </span>
                    {t("title")}
                </CardTitle>
                <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {codes.length > 0 ? (
                    <>
                        <Alert className="border-orange-500/30 bg-orange-500/5">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <AlertDescription className="text-xs leading-relaxed">
                                {t("newCodesWarning")}
                            </AlertDescription>
                        </Alert>
                        <BackupCodesGrid codes={codes} />
                        <div className="flex gap-2.5">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => downloadBackupCodesFile(codes, user?.email)}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                {t("downloadButton")}
                            </Button>
                            <Button className="flex-1" onClick={() => setCodes([])}>
                                {t("doneButton")}
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <p className="text-xs text-muted-foreground">
                            {status && status.total > 0
                                ? t("remaining", {
                                      remaining: status.remaining,
                                      total: status.total,
                                  })
                                : t("none")}
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Input
                                type="password"
                                placeholder={t("passwordPlaceholder")}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleRegenerate()
                                }}
                                autoComplete="current-password"
                                className="sm:max-w-xs"
                                disabled={busy}
                            />
                            <Button onClick={handleRegenerate} disabled={busy || !password}>
                                {busy ? t("generating") : t("regenerateButton")}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">{t("hint")}</p>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
