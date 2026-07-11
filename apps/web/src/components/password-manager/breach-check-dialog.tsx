"use client"

import { useEffect, useCallback, useState } from "react"
import { usePasswordStore } from "@/store/password-store"
import { checkPasswordsBreached } from "@/lib/hibp"
import { useOnlineSession } from "@/hooks/use-online-session"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { ShieldX, Loader2, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react"

interface BreachCheckDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function BreachCheckDialog({ open, onOpenChange }: BreachCheckDialogProps) {
    const {
        passwords,
        breachCounts,
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

    const breachedEntries = passwords
        .filter((p) => (breachCounts.get(p.id) ?? 0) > 0)
        .map((p) => ({ ...p, breachCount: breachCounts.get(p.id) ?? 0 }))
        .sort((a, b) => b.breachCount - a.breachCount)

    const breachedCount = breachStatus === "done" ? breachedEntries.length : 0

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldX className="h-5 w-5 text-muted-foreground" />
                        Data Breach Check
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {breachStatus === "idle" && (
                        <div className="flex flex-col items-center gap-3 py-6 text-center">
                            <p className="text-sm text-muted-foreground">
                                Checks all {passwords.length} passwords against Have I Been Pwned.
                                Only a 5-char hash prefix is sent — your passwords never leave your browser.
                            </p>
                            <Button onClick={runBreachCheck} className="gap-2" disabled={!online}>
                                <ShieldX className="h-4 w-4" />
                                Run Check
                            </Button>
                            {!online && (
                                <p className="text-xs text-muted-foreground">
                                    Needs an internet connection.
                                </p>
                            )}
                        </div>
                    )}

                    {breachStatus === "checking" && (
                        <div className="space-y-3 py-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                                Checking {breachProgress.checked} / {breachProgress.total} passwords…
                            </div>
                            <Progress
                                value={
                                    breachProgress.total > 0
                                        ? (breachProgress.checked / breachProgress.total) * 100
                                        : 0
                                }
                                className="h-2"
                            />
                            <p className="text-xs text-muted-foreground">
                                Using k-anonymity — no password leaves your browser.
                            </p>
                        </div>
                    )}

                    {breachStatus === "error" && (
                        <div className="flex flex-col items-center gap-3 py-6 text-center">
                            <p className="text-sm text-destructive">Check failed. Verify your connection and try again.</p>
                            <Button variant="outline" onClick={runBreachCheck} className="gap-2">
                                <RefreshCw className="h-4 w-4" />
                                Retry
                            </Button>
                        </div>
                    )}

                    {breachStatus === "done" && (
                        <div className="space-y-4">
                            {breachedCount === 0 ? (
                                <div className="flex flex-col items-center gap-2 py-6 text-center">
                                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                                    <p className="font-medium">No breached passwords found</p>
                                    <p className="text-sm text-muted-foreground">
                                        All {passwords.length} passwords checked — none appear in known data breaches.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl font-bold text-red-500">{breachedCount}</span>
                                        <div>
                                            <p className="font-medium text-red-500">
                                                {breachedCount === 1 ? "password" : "passwords"} found in data breaches
                                            </p>
                                            <p className="text-xs text-muted-foreground">Change these immediately</p>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                                        {breachedEntries.map((entry) => (
                                            <div
                                                key={entry.id}
                                                className="flex items-center justify-between rounded-lg bg-red-500/10 border border-red-500/10 px-3 py-2.5"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium truncate">{entry.service}</p>
                                                        {entry.username && (
                                                            <p className="text-xs text-muted-foreground truncate">{entry.username}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className={cn("text-xs font-medium shrink-0 ml-3", entry.breachCount > 1000 ? "text-red-500" : "text-orange-500")}>
                                                    {entry.breachCount.toLocaleString()}× exposed
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    <p className="text-xs text-muted-foreground">
                                        Use the password generator to create strong replacements.
                                    </p>
                                </>
                            )}

                            <div className="flex justify-end">
                                <Button variant="outline" size="sm" onClick={runBreachCheck} className="gap-1.5">
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    Check Again
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
