"use client"

import React, { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    AlertTriangle,
    CheckCircle2,
    Download,
    Eye,
    EyeOff,
    KeyRound,
    Lock,
    Shield,
    ShieldCheck,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import useAuth from "@/utils/useAuth"
import {
    deriveKey,
    generateSalt,
    createKeyVerifier,
    verifyKey,
    generateBackupCodes,
    encryptWithBackupCode,
    decryptWithBackupCode,
    backupCodeId,
} from "@/lib/encryption"
import {
    setupMasterVault,
    storeBackupCodes,
    lookupBackupCode,
    markBackupCodeUsed,
    unlockSecureVault,
} from "@/lib/global-vault-api"
import { useMasterKeyStore } from "@/store/master-key-store"
import { calcStrength } from "./master-password-gate/password-strength"
import { downloadBackupCodesFile } from "./master-password-gate/backup-codes-file"
import { BackupCodesGrid } from "./master-password-gate/backup-codes-grid"
import { Spinner, ErrorBanner } from "./master-password-gate/gate-helpers"

// ── Gate modal ────────────────────────────────────────────────────────────────

type GateMode = "setup" | "backup-codes" | "unlock" | "use-backup-code"

export function MasterPasswordGate() {
    const { user } = useAuth(false)
    const {
        vault,
        vaultStatus,
        vaultGateOpen,
        restoreError,
        setKey,
        setVaultStatus,
        setRestoreError,
        closeVaultGate,
    } = useMasterKeyStore()

    const [mode, setMode] = useState<GateMode>("unlock")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [shake, setShake] = useState(false)
    const [backupCodes, setBackupCodes] = useState<string[]>([])
    const [backupCodesAcknowledged, setBackupCodesAcknowledged] = useState(false)
    const [backupCodeInput, setBackupCodeInput] = useState("")

    const strength = calcStrength(password)
    const confirmMismatch = confirmPassword.length > 0 && confirmPassword !== password

    const retryAttemptedRef = useRef(false)

    useEffect(() => {
        if (!vaultGateOpen) {
            resetForm()
            setMode("unlock")
            retryAttemptedRef.current = false
            return
        }
        if (vaultStatus === "not-configured") {
            setMode("setup")
            return
        }
        // Recovery: if the gate opens while locked but vault was never cached
        // (boot-time restore errored), retry restoration once per gate-open session.
        if (vaultStatus === "locked" && !vault && !retryAttemptedRef.current) {
            retryAttemptedRef.current = true
            setRestoreError(null)
            setVaultStatus("restoring")
            return
        }
        setMode("unlock")
    }, [vaultGateOpen, vaultStatus, vault, setRestoreError, setVaultStatus])

    // ── helpers ──────────────────────────────────────────────────────────────

    const triggerShake = () => {
        setShake(true)
        setTimeout(() => setShake(false), 600)
    }

    const resetForm = () => {
        setPassword("")
        setConfirmPassword("")
        setError("")
    }

    // ── form handlers ─────────────────────────────────────────────────────────

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!password || !confirmPassword) return
        if (password !== confirmPassword) {
            setError("Passwords do not match.")
            triggerShake()
            return
        }
        if (!strength.acceptable) {
            setError("Use at least 12 characters with upper, lower, number and symbol; avoid common passwords.")
            triggerShake()
            return
        }

        setSubmitting(true)
        setError("")
        try {
            const salt = await generateSalt()
            const key = await deriveKey(password, salt)
            const verifierData = await createKeyVerifier(key)
            await setupMasterVault({ salt, verifier: verifierData })

            const codes = generateBackupCodes(8)
            const encryptedCodes = await Promise.all(
                codes.map((code) => encryptWithBackupCode(code, password)),
            )
            await storeBackupCodes(encryptedCodes)

            await unlockSecureVault(password)
            setKey(key)
            setBackupCodes(codes)
            resetForm()
            setMode("backup-codes")
        } catch (err: any) {
            console.error("[MasterPasswordGate] setup error:", err)
            setError(err?.message ?? "Failed to create master password. Please try again.")
        } finally {
            setSubmitting(false)
        }
    }

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!password || !vault) return

        setSubmitting(true)
        setError("")
        try {
            // Try current iteration count first, then legacy 100k for existing vaults
            let key = await deriveKey(password, vault.salt, 600000)
            let valid = await verifyKey(key, vault.verifier.encrypted, vault.verifier.iv)
            if (!valid) {
                // ponytail: legacy 100k vaults stay as-is; upgrade to 600k when a
                // change-master-password flow lands (re-derives for free), or adopt
                // DEK indirection. Silent re-encryption isn't crash-safe (entries
                // local, verifier remote — no atomic cross-store commit).
                key = await deriveKey(password, vault.salt, 100000)
                valid = await verifyKey(key, vault.verifier.encrypted, vault.verifier.iv)
            }

            if (valid) {
                await unlockSecureVault(password)
                setKey(key)
                resetForm()
            } else {
                setError("Incorrect master password.")
                triggerShake()
            }
        } catch (err) {
            console.error("[MasterPasswordGate] unlock error:", err)
            setError("Failed to unlock. Please try again.")
        } finally {
            setSubmitting(false)
        }
    }

    const handleBackupCodeUnlock = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!backupCodeInput || !vault) return

        const normalized = backupCodeInput.trim().toUpperCase().replace(/\s/g, "")
        const stripped = normalized.replace(/-/g, "")
        // Must match the storage-side id exactly — both go through backupCodeId.
        const codeId = backupCodeId(stripped)

        setSubmitting(true)
        setError("")
        try {
            const codeData = await lookupBackupCode(codeId)
            const masterPassword = await decryptWithBackupCode(
                stripped,
                codeData.codeSalt,
                codeData.encrypted,
                codeData.iv,
            )
            let key = await deriveKey(masterPassword, vault.salt, 600000)
            let valid = await verifyKey(key, vault.verifier.encrypted, vault.verifier.iv)
            if (!valid) {
                // ponytail: legacy 100k fallback — see handleUnlock note above.
                key = await deriveKey(masterPassword, vault.salt, 100000)
                valid = await verifyKey(key, vault.verifier.encrypted, vault.verifier.iv)
            }

            if (!valid) {
                setError("Backup code is incorrect.")
                triggerShake()
                return
            }

            // Unlock first, burn the code second: a failed burn leaves a code
            // the user can retry with, while burning first would spend it on an
            // unlock that never happened.
            await unlockSecureVault(masterPassword)
            setKey(key)
            await markBackupCodeUsed(codeId).catch((err) =>
                console.error("[MasterPasswordGate] failed to consume backup code:", err),
            )
            toast.success("Unlocked via backup code. That code is now consumed.")
        } catch (err: any) {
            console.error("[MasterPasswordGate] backup code unlock error:", err)
            setError(err?.message ?? "Invalid backup code. Please try another.")
            triggerShake()
        } finally {
            setSubmitting(false)
        }
    }

    // After setup, show backup codes step — keep modal open until acknowledged
    const showBackupCodes = mode === "backup-codes" && !backupCodesAcknowledged
    const dialogOpen = vaultGateOpen || showBackupCodes

    if (!user) return null

    const isSetup = mode === "setup"
    const isBackupCodeMode = mode === "use-backup-code"

    return (
        <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
                // Only allow closing if we're not mid-setup or showing backup codes
                if (!open && !showBackupCodes) closeVaultGate()
            }}
        >
            <DialogContent
                className="max-w-[460px] p-0 gap-0 overflow-hidden border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl"
                onInteractOutside={(e) => {
                    // Prevent closing during backup codes step
                    if (showBackupCodes) e.preventDefault()
                }}
            >
                {/* Premium branded top accent (deck signature) */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/[0.07] via-violet-500/[0.04] to-transparent"
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
                />

                {/* Hidden accessible title/description for screen readers */}
                <DialogHeader className="sr-only">
                    <DialogTitle>
                        {isSetup
                            ? "Create Master Password"
                            : mode === "backup-codes"
                              ? "Save Your Backup Codes"
                              : "Unlock Your Vault"}
                    </DialogTitle>
                    <DialogDescription>
                        {isSetup
                            ? "Set up encryption for your sensitive data."
                            : "Enter your master password to access encrypted data."}
                    </DialogDescription>
                </DialogHeader>

                <motion.div
                    className="p-8"
                    animate={shake ? { x: [0, -10, 10, -8, 8, -5, 5, 0] } : {}}
                    transition={{ duration: 0.5 }}
                >
                    {/* ── Backup codes display (post-setup) ─────────────────── */}
                    {mode === "backup-codes" ? (
                        <div className="space-y-5">
                            <div className="flex flex-col items-center text-center">
                                <div className="relative mb-4">
                                    <div className="absolute inset-0 rounded-full bg-emerald-500/15 blur-lg" />
                                    <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
                                        <CheckCircle2 className="h-7 w-7 text-emerald-500 dark:text-emerald-400" />
                                    </div>
                                </div>
                                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                                    Save Your Backup Codes
                                </h2>
                                <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
                                    Store these safely — each works once to recover access if you forget your master password.
                                </p>
                            </div>

                            <Alert className="border-orange-500/30 bg-orange-500/5">
                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                                <AlertDescription className="text-xs leading-relaxed">
                                    <strong>You cannot view these again</strong> after leaving this screen. Download or copy now.
                                </AlertDescription>
                            </Alert>

                            <BackupCodesGrid codes={backupCodes} />

                            <div className="flex gap-2.5">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => downloadBackupCodesFile(backupCodes, user?.email)}
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Download
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={() => setBackupCodesAcknowledged(true)}
                                >
                                    I've saved my codes
                                </Button>
                            </div>

                            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60">
                                <Shield className="h-3 w-3" />
                                Zero-knowledge · Encrypted locally
                            </p>
                        </div>
                    ) : (
                        /* ── Loading / setup / unlock ─────────────────────── */
                        <div className="space-y-6">
                            {/* Icon + heading */}
                            <div className="flex flex-col items-center text-center">
                                <div className="relative mb-4">
                                    <div
                                        className={cn(
                                            "absolute inset-0 rounded-full",
                                            isSetup ? "bg-emerald-500/15" : "bg-primary/10",
                                        )}
                                    />
                                    <div
                                        className={cn(
                                            "relative flex h-[60px] w-[60px] items-center justify-center rounded-full border shadow-sm",
                                            isSetup
                                                ? "border-emerald-500/30 bg-gradient-to-b from-emerald-500/20 to-emerald-500/[0.04] ring-1 ring-inset ring-emerald-500/10"
                                                : "border-border bg-gradient-to-b from-muted to-muted/40 ring-1 ring-inset ring-border/50",
                                        )}
                                    >
                                        {isSetup ? (
                                            <ShieldCheck className="h-7 w-7 text-emerald-500 dark:text-emerald-400" />
                                        ) : (
                                            <Lock className="h-7 w-7 text-foreground/70" />
                                        )}
                                    </div>
                                </div>

                                <h2 className="text-[1.2rem] font-semibold tracking-tight text-foreground">
                                    {isSetup
                                        ? "Create Master Password"
                                        : isBackupCodeMode
                                          ? "Use Backup Code"
                                          : "Unlock Your Data"}
                                </h2>
                                <p className="mt-1.5 max-w-[260px] text-sm leading-relaxed text-muted-foreground">
                                    {isSetup
                                        ? "Encrypts your sensitive data client-side. Never leaves your device."
                                        : isBackupCodeMode
                                          ? "Enter one of your saved backup codes to recover access."
                                          : "Enter your master password to decrypt and access your data."}
                                </p>
                            </div>

                            {/* Setup warning */}
                            <AnimatePresence>
                                {isSetup && (
                                    <motion.div
                                        key="warning"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <Alert className="border-orange-500/30 bg-orange-500/5">
                                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                                            <AlertDescription className="text-xs leading-relaxed">
                                                <strong>No password reset.</strong> If you lose it, all
                                                encrypted data is permanently inaccessible.
                                            </AlertDescription>
                                        </Alert>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Forms */}
                            <AnimatePresence mode="wait">
                                {isBackupCodeMode ? (
                                        <motion.form
                                            key="backup-form"
                                            onSubmit={handleBackupCodeUnlock}
                                            className="space-y-4"
                                            initial={{ opacity: 0, x: 16 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -16 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <div className="space-y-1.5">
                                                <Label htmlFor="backup-code">Backup code</Label>
                                                <Input
                                                    id="backup-code"
                                                    placeholder="XXXXXX-XXXXXX-XXXXXX"
                                                    value={backupCodeInput}
                                                    onChange={(e) => {
                                                        setBackupCodeInput(e.target.value)
                                                        setError("")
                                                    }}
                                                    className="text-center font-mono tracking-[0.2em]"
                                                    autoFocus
                                                    autoComplete="off"
                                                    disabled={submitting}
                                                />
                                                <p className="text-center text-xs text-muted-foreground/70">
                                                    Each code can only be used once
                                                </p>
                                            </div>

                                            <AnimatePresence>
                                                {error && <ErrorBanner message={error} />}
                                            </AnimatePresence>

                                            <Button
                                                type="submit"
                                                className="w-full"
                                                size="lg"
                                                disabled={submitting || !backupCodeInput.trim()}
                                            >
                                                {submitting && <Spinner />}
                                                Recover access
                                            </Button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setMode("unlock")
                                                    setError("")
                                                }}
                                                className="flex w-full cursor-pointer items-center justify-center text-xs text-muted-foreground transition-colors duration-150 hover:text-foreground"
                                            >
                                                ← Back to password unlock
                                            </button>
                                        </motion.form>
                                    ) : (
                                        <motion.form
                                            key="password-form"
                                            onSubmit={isSetup ? handleSetup : handleUnlock}
                                            className="space-y-4"
                                            initial={{ opacity: 0, x: -16 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 16 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <div className="space-y-1.5">
                                                <Label htmlFor="mp-password">Master password</Label>
                                                <div className="relative">
                                                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                    <Input
                                                        id="mp-password"
                                                        type={showPassword ? "text" : "password"}
                                                        placeholder={
                                                            isSetup
                                                                ? "Create a strong master password"
                                                                : "Enter your master password"
                                                        }
                                                        value={password}
                                                        onChange={(e) => {
                                                            setPassword(e.target.value)
                                                            setError("")
                                                        }}
                                                        className="pl-9 pr-10"
                                                        autoFocus
                                                        autoComplete={
                                                            isSetup ? "new-password" : "current-password"
                                                        }
                                                        disabled={submitting}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword((v) => !v)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground transition-colors duration-150 hover:text-foreground"
                                                        tabIndex={-1}
                                                        aria-label={
                                                            showPassword ? "Hide password" : "Show password"
                                                        }
                                                    >
                                                        {showPassword ? (
                                                            <EyeOff className="h-4 w-4" />
                                                        ) : (
                                                            <Eye className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Strength meter (setup only) */}
                                            <AnimatePresence>
                                                {isSetup && password && (
                                                    <motion.div
                                                        key="strength"
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: "auto" }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="flex gap-1">
                                                            {[1, 2, 3, 4, 5].map((i) => (
                                                                <div
                                                                    key={i}
                                                                    className={cn(
                                                                        "h-[3px] flex-1 rounded-full transition-colors duration-300",
                                                                        i <= strength.score
                                                                            ? strength.barColor
                                                                            : "bg-muted",
                                                                    )}
                                                                />
                                                            ))}
                                                        </div>
                                                        <div className="mt-1.5 flex items-center justify-between">
                                                            <span className="text-xs text-muted-foreground">
                                                                {strength.label}
                                                            </span>
                                                            {strength.hint && (
                                                                <span className="text-xs text-muted-foreground/70">
                                                                    Tip: {strength.hint}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Confirm (setup only) */}
                                            <AnimatePresence>
                                                {isSetup && (
                                                    <motion.div
                                                        key="confirm"
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: "auto" }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="overflow-hidden space-y-1.5"
                                                    >
                                                        <Label htmlFor="mp-confirm">
                                                            Confirm master password
                                                        </Label>
                                                        <div className="relative">
                                                            <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                            <Input
                                                                id="mp-confirm"
                                                                type={showPassword ? "text" : "password"}
                                                                placeholder="Re-enter your master password"
                                                                value={confirmPassword}
                                                                onChange={(e) => {
                                                                    setConfirmPassword(e.target.value)
                                                                    setError("")
                                                                }}
                                                                className={cn(
                                                                    "pl-9",
                                                                    confirmMismatch &&
                                                                        "border-destructive focus-visible:ring-destructive",
                                                                )}
                                                                autoComplete="new-password"
                                                                disabled={submitting}
                                                            />
                                                        </div>
                                                        {confirmMismatch && (
                                                            <p className="text-xs text-destructive">
                                                                Passwords do not match.
                                                            </p>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            <AnimatePresence>
                                                {(error || restoreError) && <ErrorBanner message={error || restoreError!} />}
                                            </AnimatePresence>

                                            <Button
                                                type="submit"
                                                className="w-full"
                                                size="lg"
                                                disabled={
                                                    submitting ||
                                                    !password ||
                                                    (isSetup && confirmMismatch)
                                                }
                                            >
                                                {submitting && <Spinner />}
                                                {isSetup ? "Create Master Password" : "Unlock"}
                                            </Button>

                                            {!isSetup && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setMode("use-backup-code")
                                                        setError("")
                                                    }}
                                                    className="flex w-full cursor-pointer items-center justify-center gap-1 text-xs text-muted-foreground transition-colors duration-150 hover:text-foreground"
                                                >
                                                    Forgot your password?{" "}
                                                    <span className="underline underline-offset-2">
                                                        Use a backup code
                                                    </span>
                                                </button>
                                            )}
                                        </motion.form>
                                    )}
                                </AnimatePresence>

                            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60">
                                <Shield className="h-3 w-3" />
                                Zero-knowledge · Encrypted locally · Never sent to our servers
                            </p>
                        </div>
                    )}
                </motion.div>
            </DialogContent>
        </Dialog>
    )
}

