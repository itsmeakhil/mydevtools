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
    score: number // 0–5
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
        "1. On the unlock screen, click \"Use backup code instead\".",
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

// ── Gate component ────────────────────────────────────────────────────────────

type GateMode = "loading" | "setup" | "backup-codes" | "unlock" | "use-backup-code"

interface MasterPasswordGateProps {
    children: React.ReactNode
}

export function MasterPasswordGate({ children }: MasterPasswordGateProps) {
    const { user } = useAuth(false)
    const { isUnlocked, vaultStatus, setKey, clearKey, setVaultStatus } = useMasterKeyStore()

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
        if (vaultStatus === "not-configured") { setMode("setup"); return }

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

            // Generate backup codes and encrypt each one with the master password
            const codes = generateBackupCodes(8)
            const encryptedCodes = await Promise.all(
                codes.map(code => encryptWithBackupCode(code, password))
            )
            await storeBackupCodes(encryptedCodes)

            await saveMasterKey(key)
            setKey(key)
            setBackupCodes(codes)
            resetForm()

            // Show backup codes step before passing through
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
        // Accept with or without dashes; reconstruct codeId from first 6 non-dash chars
        const stripped = normalized.replace(/-/g, "")
        // Reformat as XXXXXX-XXXXXX-XXXXXX to extract codeId
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

    if (mode === "loading") {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
        )
    }

    // ── backup codes display (post-setup) ─────────────────────────────────────
    if (mode === "backup-codes") {
        return (
            <>
                <div aria-hidden className="pointer-events-none opacity-0 select-none">
                    {children}
                </div>
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm px-4">
                    <motion.div
                        className="w-full max-w-[480px]"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <div className="mb-6 flex flex-col items-center text-center">
                            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/10">
                                <CheckCircle2 className="h-10 w-10 text-green-500" />
                            </div>
                            <h1 className="text-2xl font-bold">Save Your Backup Codes</h1>
                            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                                Master password created. Store these codes securely — each works once
                                to recover access if you forget your password.
                            </p>
                        </div>

                        <Alert className="mb-4 border-orange-500/40 bg-orange-500/5">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <AlertDescription className="text-xs leading-relaxed">
                                <strong>Download or copy these now.</strong> You cannot view them again after leaving this screen.
                            </AlertDescription>
                        </Alert>

                        <div className="mb-4 grid grid-cols-2 gap-2">
                            {backupCodes.map((code, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => copyCode(code, i)}
                                    className="group flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-left text-sm font-mono transition-colors hover:bg-muted"
                                >
                                    <span className="text-muted-foreground mr-1.5 text-xs">{i + 1}.</span>
                                    <span className="flex-1 tracking-wide">{code}</span>
                                    {copiedIndex === i ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                    ) : (
                                        <Copy className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => downloadBackupCodesFile(backupCodes, user?.email)}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Download codes
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={() => setBackupCodesAcknowledged(true)}
                            >
                                I've saved my codes
                            </Button>
                        </div>

                        <div className="mt-4 flex items-center justify-center gap-1.5 text-muted-foreground/60">
                            <Shield className="h-3.5 w-3.5" />
                            <span className="text-xs">Zero-knowledge · Encrypted locally · Never sent to our servers</span>
                        </div>
                    </motion.div>
                </div>
            </>
        )
    }

    // ── full-screen overlay (setup | unlock | use-backup-code) ────────────────
    const isSetup = mode === "setup"
    const isBackupCodeMode = mode === "use-backup-code"

    return (
        <>
            <div aria-hidden className="pointer-events-none opacity-0 select-none">
                {children}
            </div>

            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm px-4">
                <motion.div
                    className="w-full max-w-[420px]"
                    animate={shake ? { x: [0, -10, 10, -8, 8, -5, 5, 0] } : {}}
                    transition={{ duration: 0.5 }}
                >
                    {/* Icon + heading */}
                    <motion.div
                        className="mb-8 flex flex-col items-center text-center"
                        initial={{ opacity: 0, y: -16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <div
                            className={cn(
                                "mb-4 flex h-20 w-20 items-center justify-center rounded-full",
                                isSetup
                                    ? "bg-gradient-to-br from-green-500/20 to-emerald-500/10"
                                    : "bg-gradient-to-br from-primary/20 to-primary/5",
                            )}
                        >
                            {isSetup ? (
                                <ShieldCheck className="h-10 w-10 text-green-500" />
                            ) : (
                                <Lock className="h-10 w-10 text-primary" />
                            )}
                        </div>

                        <h1 className="text-2xl font-bold">
                            {isSetup
                                ? "Create Your Master Password"
                                : isBackupCodeMode
                                ? "Use Backup Code"
                                : "Unlock Your Data"}
                        </h1>
                        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                            {isSetup
                                ? "Your master password encrypts all your data client-side. It never leaves your device."
                                : isBackupCodeMode
                                ? "Enter one of your saved backup codes to recover access."
                                : "Enter your master password to decrypt and access your data."}
                        </p>
                    </motion.div>

                    {/* Data-loss warning (setup only) */}
                    <AnimatePresence>
                        {isSetup && (
                            <motion.div
                                key="warning"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-4 overflow-hidden"
                            >
                                <Alert className="border-orange-500/40 bg-orange-500/5">
                                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                                    <AlertDescription className="text-xs leading-relaxed">
                                        <strong>There is no password reset.</strong> If you lose
                                        your master password, all your encrypted data will be
                                        permanently inaccessible.
                                    </AlertDescription>
                                </Alert>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Backup code form */}
                    <AnimatePresence mode="wait">
                        {isBackupCodeMode ? (
                            <motion.form
                                key="backup-code-form"
                                onSubmit={handleBackupCodeUnlock}
                                className="space-y-4"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.25 }}
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
                                        className="font-mono tracking-widest"
                                        autoFocus
                                        autoComplete="off"
                                        disabled={submitting}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Each code can only be used once.
                                    </p>
                                </div>

                                <AnimatePresence>
                                    {error && (
                                        <motion.div
                                            key="error"
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <Alert variant="destructive" className="py-2">
                                                <AlertTriangle className="h-4 w-4" />
                                                <AlertDescription className="text-sm">{error}</AlertDescription>
                                            </Alert>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    size="lg"
                                    disabled={submitting || !backupCodeInput.trim()}
                                >
                                    {submitting && (
                                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                                    )}
                                    Recover access
                                </Button>

                                <button
                                    type="button"
                                    onClick={() => { setMode("unlock"); setError("") }}
                                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    ← Back to password unlock
                                </button>
                            </motion.form>
                        ) : (
                            /* Password form (setup | unlock) */
                            <motion.form
                                key="password-form"
                                onSubmit={isSetup ? handleSetup : handleUnlock}
                                className="space-y-4"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.25 }}
                            >
                                {/* Password field */}
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
                                            autoComplete={isSetup ? "new-password" : "current-password"}
                                            disabled={submitting}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((v) => !v)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                                            tabIndex={-1}
                                            aria-label={showPassword ? "Hide password" : "Show password"}
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
                                                            "h-1 flex-1 rounded-full transition-colors duration-300",
                                                            i <= strength.score
                                                                ? strength.barColor
                                                                : "bg-muted",
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                            <div className="mt-1 flex items-center justify-between">
                                                <span className="text-xs font-medium text-muted-foreground">
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

                                {/* Confirm password (setup only) */}
                                <AnimatePresence>
                                    {isSetup && (
                                        <motion.div
                                            key="confirm"
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="overflow-hidden space-y-1.5"
                                        >
                                            <Label htmlFor="mp-confirm">Confirm master password</Label>
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
                                                        confirmMismatch && "border-destructive focus-visible:ring-destructive",
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
                                    {error && (
                                        <motion.div
                                            key="error"
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <Alert variant="destructive" className="py-2">
                                                <AlertTriangle className="h-4 w-4" />
                                                <AlertDescription className="text-sm">{error}</AlertDescription>
                                            </Alert>
                                        </motion.div>
                                    )}
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
                                    {submitting && (
                                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                                    )}
                                    {isSetup ? "Create Master Password" : "Unlock"}
                                </Button>

                                {/* Backup code fallback (unlock only) */}
                                {!isSetup && (
                                    <button
                                        type="button"
                                        onClick={() => { setMode("use-backup-code"); setError("") }}
                                        className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        Forgot your password? Use a backup code
                                    </button>
                                )}
                            </motion.form>
                        )}
                    </AnimatePresence>

                    {/* Zero-knowledge footer */}
                    <motion.div
                        className="mt-6 flex items-center justify-center gap-1.5 text-muted-foreground/60"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Shield className="h-3.5 w-3.5" />
                        <span className="text-xs">
                            Zero-knowledge · Encrypted locally · Never sent to our servers
                        </span>
                    </motion.div>
                </motion.div>
            </div>
        </>
    )
}
