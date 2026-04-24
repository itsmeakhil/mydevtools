"use client"

import React, { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    AlertTriangle,
    CheckCircle2,
    Copy,
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/logo"
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
} from "@/lib/encryption"
import { saveMasterKey, loadMasterKey, clearMasterKey } from "@/lib/key-storage"
import {
    getMasterVaultOrNull,
    setupMasterVault,
    storeBackupCodes,
    lookupBackupCode,
    markBackupCodeUsed,
    type MasterVaultOut,
} from "@/lib/global-vault-api"
import { useMasterKeyStore } from "@/store/master-key-store"

// ── Password-strength helpers ─────────────────────────────────────────────────

type StrengthResult = {
    score: number
    label: string
    barColor: string
    hint: string
}

function calcStrength(pw: string): StrengthResult {
    if (!pw) return { score: 0, label: "", barColor: "bg-muted", hint: "" }

    let score = 0
    const hints: string[] = []

    if (pw.length >= 12) score++
    else hints.push("use ≥ 12 characters")
    if (/[A-Z]/.test(pw)) score++
    else hints.push("add uppercase letters")
    if (/[a-z]/.test(pw)) score++
    else hints.push("add lowercase letters")
    if (/[0-9]/.test(pw)) score++
    else hints.push("add numbers")
    if (/[^A-Za-z0-9]/.test(pw)) score++
    else hints.push("add special characters")

    const labels = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"]
    const colors = [
        "bg-muted",
        "bg-destructive",
        "bg-orange-500",
        "bg-yellow-500",
        "bg-green-500",
        "bg-emerald-500",
    ]

    return {
        score,
        label: labels[score] ?? "",
        barColor: colors[score] ?? "bg-muted",
        hint: hints[0] ?? "",
    }
}

// ── Download helper ───────────────────────────────────────────────────────────

function downloadBackupCodesFile(codes: string[], userEmail?: string | null) {
    const date = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    })
    const lines = [
        "========================================",
        "  MYDEVTOOLS — MASTER PASSWORD BACKUP",
        "========================================",
        "",
        `Account : ${userEmail ?? "unknown"}`,
        `Created : ${date}`,
        "",
        "BACKUP CODES",
        "------------",
        "Each code can be used exactly once to recover access",
        "if you forget your master password.",
        "",
        ...codes.map((c, i) => `  ${String(i + 1).padStart(2, "0")}. ${c}`),
        "",
        "INSTRUCTIONS",
        "------------",
        '1. On the unlock screen, click "Use backup code instead".',
        "2. Enter one of the codes above (dashes optional).",
        "3. The code will be consumed — cross it off this list.",
        "4. Once all codes are used, generate new ones from Settings.",
        "",
        "Keep this file somewhere safe (password manager, printed copy).",
        "Anyone with these codes can access your encrypted data.",
        "",
        "========================================",
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "mydevtools-backup-codes.txt"
    a.click()
    URL.revokeObjectURL(url)
}

// ── Shared background — mirrors the login page layout exactly ─────────────────

function GateBackground({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative min-h-screen overflow-hidden bg-background">
            {/* Primary radial glow at top — same as login page */}
            <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-8%,hsl(var(--primary)/0.14),transparent_55%)]"
                aria-hidden
            />
            {/* Fade to background */}
            <div
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,hsl(var(--background))_58%)]"
                aria-hidden
            />
            {/* Grid — same as login page */}
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.4] dark:opacity-[0.22] [background-image:linear-gradient(hsl(var(--border)/0.55)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.55)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_35%,black,transparent)]"
                aria-hidden
            />

            {/* Content */}
            <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
                {children}
            </div>
        </div>
    )
}

// ── Gate component ────────────────────────────────────────────────────────────

type GateMode = "loading" | "setup" | "backup-codes" | "unlock" | "use-backup-code"

interface MasterPasswordGateProps {
    children: React.ReactNode
}

export function MasterPasswordGate({ children }: MasterPasswordGateProps) {
    const { user } = useAuth(false)
    const { isUnlocked, vaultStatus, setKey, setVaultStatus } = useMasterKeyStore()

    const [mode, setMode] = useState<GateMode>("loading")
    const [vault, setVault] = useState<MasterVaultOut | null>(null)
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [shake, setShake] = useState(false)
    const [backupCodes, setBackupCodes] = useState<string[]>([])
    const [backupCodesAcknowledged, setBackupCodesAcknowledged] = useState(false)
    const [backupCodeInput, setBackupCodeInput] = useState("")
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
    const initRef = useRef(false)

    const strength = calcStrength(password)
    const confirmMismatch = confirmPassword.length > 0 && confirmPassword !== password

    // ── initialisation ──────────────────────────────────────────────────────

    useEffect(() => {
        if (isUnlocked || !user || initRef.current) return
        initRef.current = true
        initGate()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, isUnlocked])

    const initGate = async () => {
        if (vaultStatus === "not-configured") {
            setMode("setup")
            return
        }
        try {
            const vaultData = await getMasterVaultOrNull()
            if (!vaultData) {
                setVaultStatus("not-configured")
                setMode("setup")
                return
            }
            setVault(vaultData)
            setVaultStatus("locked")
            setMode("unlock")

            const savedKey = await loadMasterKey()
            if (savedKey) {
                const valid = await verifyKey(
                    savedKey,
                    vaultData.verifier.encrypted,
                    vaultData.verifier.iv,
                )
                if (valid) {
                    setKey(savedKey)
                    return
                }
                await clearMasterKey()
            }
        } catch (err) {
            console.error("[MasterPasswordGate] init error:", err)
            setError("Could not connect. Please refresh the page.")
            setMode("unlock")
        }
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    const triggerShake = () => {
        setShake(true)
        setTimeout(() => setShake(false), 600)
    }

    const resetForm = () => {
        setPassword("")
        setConfirmPassword("")
        setError("")
    }

    const copyCode = async (code: string, index: number) => {
        await navigator.clipboard.writeText(code)
        setCopiedIndex(index)
        setTimeout(() => setCopiedIndex(null), 1500)
    }

    // ── form handlers ────────────────────────────────────────────────────────

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!password || !confirmPassword) return
        if (password !== confirmPassword) {
            setError("Passwords do not match.")
            triggerShake()
            return
        }
        if (strength.score < 2) {
            setError("Password is too weak — please make it stronger.")
            triggerShake()
            return
        }

        setSubmitting(true)
        setError("")
        try {
            const salt = await generateSalt()
            const key = await deriveKey(password, salt)
            const verifierData = await createKeyVerifier(key)
            const vaultData = await setupMasterVault({ salt, verifier: verifierData })
            setVault(vaultData)

            const codes = generateBackupCodes(8)
            const encryptedCodes = await Promise.all(
                codes.map((code) => encryptWithBackupCode(code, password)),
            )
            await storeBackupCodes(encryptedCodes)

            await saveMasterKey(key)
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
            const key = await deriveKey(password, vault.salt)
            const valid = await verifyKey(key, vault.verifier.encrypted, vault.verifier.iv)

            if (valid) {
                await saveMasterKey(key)
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
        const withDashes = `${stripped.slice(0, 6)}-${stripped.slice(6, 12)}-${stripped.slice(12, 18)}`
        const codeId = withDashes.slice(0, 6)

        setSubmitting(true)
        setError("")
        try {
            const codeData = await lookupBackupCode(codeId)
            const masterPassword = await decryptWithBackupCode(
                withDashes,
                codeData.codeSalt,
                codeData.encrypted,
                codeData.iv,
            )
            const key = await deriveKey(masterPassword, vault.salt)
            const valid = await verifyKey(key, vault.verifier.encrypted, vault.verifier.iv)

            if (!valid) {
                setError("Backup code is incorrect.")
                triggerShake()
                return
            }

            await markBackupCodeUsed(codeId)
            await saveMasterKey(key)
            setKey(key)
            toast.success("Unlocked via backup code. That code is now consumed.")
        } catch (err: any) {
            console.error("[MasterPasswordGate] backup code unlock error:", err)
            setError(err?.message ?? "Invalid backup code. Please try another.")
            triggerShake()
        } finally {
            setSubmitting(false)
        }
    }

    // ── render ───────────────────────────────────────────────────────────────

    if (!user) return <>{children}</>
    if (isUnlocked && (mode !== "backup-codes" || backupCodesAcknowledged)) return <>{children}</>

    // Loading
    if (mode === "loading") {
        return (
            <GateBackground>
                <div className="flex flex-col items-center gap-3">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-foreground" />
                    <p className="text-sm text-muted-foreground">Checking vault…</p>
                </div>
            </GateBackground>
        )
    }

    // ── Backup codes display (post-setup) ─────────────────────────────────────
    if (mode === "backup-codes") {
        return (
            <>
                <div aria-hidden className="pointer-events-none opacity-0 select-none">
                    {children}
                </div>
                <GateBackground>
                    <motion.div
                        className="w-full max-w-[500px] space-y-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                        {/* Logo */}
                        <div className="flex justify-center">
                            <Logo size={40} showText />
                        </div>

                        {/* Card — same style as login page */}
                        <div className="rounded-2xl border border-border/50 bg-card/75 p-8 shadow-xl shadow-black/[0.04] ring-1 ring-black/[0.03] backdrop-blur-xl dark:bg-card/55 dark:shadow-black/30 dark:ring-white/[0.06]">
                            {/* Icon + heading */}
                            <div className="mb-6 flex flex-col items-center text-center">
                                <div className="relative mb-4">
                                    <div className="absolute inset-0 rounded-full bg-emerald-500/15 blur-lg" />
                                    <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
                                        <CheckCircle2 className="h-7 w-7 text-emerald-500 dark:text-emerald-400" />
                                    </div>
                                </div>
                                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                                    Save Your Backup Codes
                                </h1>
                                <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
                                    Store these safely — each works once to recover access if you forget your master password.
                                </p>
                            </div>

                            {/* Warning */}
                            <Alert className="mb-5 border-orange-500/30 bg-orange-500/5">
                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                                <AlertDescription className="text-xs leading-relaxed">
                                    <strong>You cannot view these again</strong> after leaving this screen. Download or copy now.
                                </AlertDescription>
                            </Alert>

                            {/* Codes grid */}
                            <div className="mb-5 grid grid-cols-2 gap-2">
                                {backupCodes.map((code, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => copyCode(code, i)}
                                        className="group flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5 transition-colors duration-150 hover:bg-muted"
                                    >
                                        <span className="w-4 shrink-0 text-xs text-muted-foreground/50">
                                            {i + 1}
                                        </span>
                                        <span className="flex-1 font-mono text-xs tracking-wider text-foreground/80">
                                            {code}
                                        </span>
                                        {copiedIndex === i ? (
                                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                        ) : (
                                            <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Actions */}
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
                        </div>

                        {/* Footer */}
                        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60">
                            <Shield className="h-3 w-3" />
                            Zero-knowledge · Encrypted locally · Never sent to our servers
                        </p>
                    </motion.div>
                </GateBackground>
            </>
        )
    }

    // ── Main gate (setup | unlock | use-backup-code) ──────────────────────────

    const isSetup = mode === "setup"
    const isBackupCodeMode = mode === "use-backup-code"

    return (
        <>
            <div aria-hidden className="pointer-events-none opacity-0 select-none">
                {children}
            </div>

            <GateBackground>
                <motion.div
                    className="w-full max-w-[420px] space-y-6"
                    animate={shake ? { x: [0, -10, 10, -8, 8, -5, 5, 0] } : {}}
                    transition={{ duration: 0.5 }}
                >
                    {/* Logo */}
                    <motion.div
                        className="flex justify-center"
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35 }}
                    >
                        <Logo size={40} showText />
                    </motion.div>

                    {/* Card — same style as login page */}
                    <motion.div
                        className="rounded-2xl border border-border/50 bg-card/75 p-8 shadow-xl shadow-black/[0.04] ring-1 ring-black/[0.03] backdrop-blur-xl dark:bg-card/55 dark:shadow-black/30 dark:ring-white/[0.06]"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
                    >
                        {/* Icon + heading */}
                        <div className="mb-7 flex flex-col items-center text-center">
                            <div className="relative mb-5">
                                {/* Pulsing ring */}
                                <motion.div
                                    className={cn(
                                        "absolute inset-0 rounded-full",
                                        isSetup ? "bg-emerald-500/15" : "bg-primary/10",
                                    )}
                                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                />
                                {/* Icon circle */}
                                <div
                                    className={cn(
                                        "relative flex h-[68px] w-[68px] items-center justify-center rounded-full border",
                                        isSetup
                                            ? "border-emerald-500/25 bg-emerald-500/8"
                                            : "border-border bg-muted/60",
                                    )}
                                >
                                    {isSetup ? (
                                        <ShieldCheck className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />
                                    ) : (
                                        <Lock className="h-8 w-8 text-foreground/70" />
                                    )}
                                </div>
                            </div>

                            <h1 className="text-[1.35rem] font-semibold tracking-tight text-foreground">
                                {isSetup
                                    ? "Create Master Password"
                                    : isBackupCodeMode
                                      ? "Use Backup Code"
                                      : "Unlock Your Data"}
                            </h1>
                            <p className="mt-2 max-w-[270px] text-sm leading-relaxed text-muted-foreground">
                                {isSetup
                                    ? "Encrypts all your data client-side. Never leaves your device."
                                    : isBackupCodeMode
                                      ? "Enter one of your saved backup codes to recover access."
                                      : "Enter your master password to decrypt and access your data."}
                            </p>
                        </div>

                        {/* Warning (setup only) */}
                        <AnimatePresence>
                            {isSetup && (
                                <motion.div
                                    key="warning"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mb-5 overflow-hidden"
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
                                    {/* Password */}
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

                                    {/* Error */}
                                    <AnimatePresence>
                                        {error && <ErrorBanner message={error} />}
                                    </AnimatePresence>

                                    {/* Submit */}
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

                                    {/* Backup code fallback (unlock only) */}
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
                    </motion.div>

                    {/* Footer */}
                    <motion.p
                        className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.45 }}
                    >
                        <Shield className="h-3 w-3" />
                        Zero-knowledge · Encrypted locally · Never sent to our servers
                    </motion.p>
                </motion.div>
            </GateBackground>
        </>
    )
}

// ── Small reusable pieces ─────────────────────────────────────────────────────

function Spinner() {
    return (
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
    )
}

function ErrorBanner({ message }: { message: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
        >
            <Alert variant="destructive" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">{message}</AlertDescription>
            </Alert>
        </motion.div>
    )
}
