"use client"

import { useEffect, useCallback, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { usePasswordStore } from "@/store/password-store"
import { checkPasswordsBreached } from "@/lib/hibp"
import { useOnlineSession } from "@/hooks/use-online-session"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { ShieldX, Loader2, RefreshCw, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react"

interface BreachCheckDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function BreachCheckDialog({ open, onOpenChange }: BreachCheckDialogProps) {
    const t = useTranslations("PasswordManager.breach")
    const {
        passwords,
        breachResults,
        breachStatus,
        breachProgress,
        setBreachResults,
        setBreachStatus,
        setBreachProgress,
        clearBreachResults,
    } = usePasswordStore()

    const { online } = useOnlineSession()

    const runBreachCheck = useCallback(async () => {
        if (passwords.length === 0) return
        // Breach check reaches HaveIBeenPwned (via the Rust proxy on desktop) —
        // needs a connection. Don't attempt it offline.
        if (typeof navigator !== "undefined" && !navigator.onLine) {
            setBreachStatus("error")
            return
        }
        clearBreachResults()
        setBreachStatus("checking")
        try {
            const results = await checkPasswordsBreached(
                passwords.map((p) => ({ id: p.id, password: p.password })),
                (checked, total) => setBreachProgress(checked, total)
            )
            setBreachResults(results)
            setBreachStatus("done")
        } catch {
            setBreachStatus("error")
        }
    }, [passwords, clearBreachResults, setBreachStatus, setBreachProgress, setBreachResults])

    // Auto-start check when dialog opens and no results yet (online only)
    useEffect(() => {
        if (open && breachStatus === "idle" && online) {
            runBreachCheck()
        }
    }, [open, breachStatus, online, runBreachCheck])

    const { breached, unknown, cleanCount } = useMemo(() => {
        const breached: { id: string; service: string; username: string; count: number }[] = []
        const unknown: { id: string; service: string }[] = []
        let cleanCount = 0
        for (const p of passwords) {
            const result = breachResults.get(p.id)
            if (!result) continue
            if (result.status === "breached") {
                breached.push({ id: p.id, service: p.service, username: p.username, count: result.count })
            } else if (result.status === "unknown") {
                unknown.push({ id: p.id, service: p.service })
            } else {
                cleanCount++
            }
        }
        breached.sort((a, b) => b.count - a.count)
        return { breached, unknown, cleanCount }
    }, [passwords, breachResults])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldX className="h-5 w-5 text-muted-foreground" />
                        {t("title")}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {breachStatus === "idle" && (
                        <div className="flex flex-col items-center gap-3 py-6 text-center">
                            <p className="text-sm text-muted-foreground">
                                {t("intro", { count: passwords.length })}
                            </p>
                            <Button onClick={runBreachCheck} className="gap-2" disabled={!online}>
                                <ShieldX className="h-4 w-4" />
                                {t("run")}
                            </Button>
                            {!online && (
                                <p className="text-xs text-muted-foreground">{t("needsConnection")}</p>
                            )}
                        </div>
                    )}

                    {breachStatus === "checking" && (
                        <div className="space-y-3 py-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                                {t("progress", {
                                    checked: breachProgress.checked,
                                    total: breachProgress.total,
                                })}
                            </div>
                            <Progress
                                value={
                                    breachProgress.total > 0
                                        ? (breachProgress.checked / breachProgress.total) * 100
                                        : 0
                                }
                                className="h-2"
                            />
                            <p className="text-xs text-muted-foreground">{t("kAnonymity")}</p>
                        </div>
                    )}

                    {breachStatus === "error" && (
                        <div className="flex flex-col items-center gap-3 py-6 text-center">
                            <p className="text-sm text-destructive">{t("failed")}</p>
                            <Button variant="outline" onClick={runBreachCheck} className="gap-2">
                                <RefreshCw className="h-4 w-4" />
                                {t("retry")}
                            </Button>
                        </div>
                    )}

                    {breachStatus === "done" && (
                        <div className="space-y-4">
                            {/*
                              * "No breaches found" may only be claimed when every
                              * entry actually resolved. With any unknown in the
                              * set the run is partial, and saying otherwise would
                              * be the false assurance this state exists to avoid.
                              */}
                            {breached.length === 0 && unknown.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 py-6 text-center">
                                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                                    <p className="font-medium">{t("noneFound")}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {t("allChecked", { count: cleanCount })}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {breached.length > 0 && (
                                        <>
                                            <div className="flex items-center gap-3">
                                                <span className="text-3xl font-bold text-red-500">
                                                    {breached.length}
                                                </span>
                                                <div>
                                                    <p className="font-medium text-red-500">
                                                        {t("foundInBreaches", { count: breached.length })}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {t("changeNow")}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5 max-h-56 overflow-y-auto">
                                                {breached.map((entry) => (
                                                    <div
                                                        key={entry.id}
                                                        className="flex items-center justify-between rounded-lg bg-red-500/10 border border-red-500/10 px-3 py-2.5"
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-medium truncate">
                                                                    {entry.service}
                                                                </p>
                                                                {entry.username && (
                                                                    <p className="text-xs text-muted-foreground truncate">
                                                                        {entry.username}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span
                                                            className={cn(
                                                                "text-xs font-medium shrink-0 ml-3",
                                                                entry.count > 1000
                                                                    ? "text-red-500"
                                                                    : "text-orange-500"
                                                            )}
                                                        >
                                                            {t("exposedTimes", { count: entry.count })}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {unknown.length > 0 && (
                                        <div className="space-y-1.5">
                                            <p className="flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
                                                <HelpCircle className="h-4 w-4 shrink-0" />
                                                {t("unknownHeading", { count: unknown.length })}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {t("unknownBody")}
                                            </p>
                                            <div className="max-h-32 overflow-y-auto space-y-1">
                                                {unknown.map((entry) => (
                                                    <div
                                                        key={entry.id}
                                                        className="rounded-md bg-amber-500/10 px-3 py-1.5 text-xs truncate"
                                                    >
                                                        {entry.service}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {breached.length > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            {t("useGenerator")}
                                        </p>
                                    )}
                                </>
                            )}

                            <div className="flex justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={runBreachCheck}
                                    className="gap-1.5"
                                >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    {t("checkAgain")}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
