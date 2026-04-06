"use client"

import React, { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    AlertTriangle,
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
import { deriveKey, generateSalt, createKeyVerifier, verifyKey } from "@/lib/encryption"
import { saveMasterKey, loadMasterKey, clearMasterKey } from "@/lib/key-storage"
import { getMasterVaultOrNull, setupMasterVault, type MasterVaultOut } from "@/lib/global-vault-api"
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

// ── Gate component ────────────────────────────────────────────────────────────

type GateMode = "loading" | "setup" | "unlock"

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
    const initRef = useRef(false)

    const strength = calcStrength(password)
    const confirmMismatch = confirmPassword.length > 0 && confirmPassword !== password

    // ── initialisation ──────────────────────────────────────────────────────

    useEffect(() => {
        // Skip if: already unlocked, no user, or already initialised this mount
        if (isUnlocked || !user || initRef.current) return
        initRef.current = true
        initGate()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, isUnlocked])

    const initGate = async () => {
        // Fast path: vault not configured — no network call needed
        if (vaultStatus === "not-configured") { setMode("setup"); return }

        // Always fetch vault data so local component state is populated.
        // We cannot skip this even when vaultStatus === "locked" because `vault`
        // is local React state that resets on every component mount.
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

            // Attempt auto-unlock from IndexedDB
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
                // Key invalid / stale → clear and ask for password
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
            const key  = await deriveKey(password, salt)
            const verifierData = await createKeyVerifier(key)

            const vaultData = await setupMasterVault({ salt, verifier: verifierData })
            setVault(vaultData)

            await saveMasterKey(key)
            setKey(key)
            resetForm()
            toast.success("Master password created — your data is protected.")
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
            const key   = await deriveKey(password, vault.salt)
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

    // ── render ───────────────────────────────────────────────────────────────

    // Pass-through: not authenticated (auth guards handle the redirect)
    if (!user) return <>{children}</>

    // Pass-through: already unlocked
    if (isUnlocked) return <>{children}</>

    // Loading spinner while the vault check is in flight
    if (mode === "loading") {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
        )
    }

    // ── full-screen overlay (setup | unlock) ──────────────────────────────────
    const isSetup = mode === "setup"

    return (
        <>
            {/* Render children behind the overlay so layout stays mounted */}
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
                            {isSetup ? "Create Your Master Password" : "Unlock Your Data"}
                        </h1>
                        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                            {isSetup
                                ? "Your master password encrypts all your data client-side. It never leaves your device."
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

                    {/* Form */}
                    <motion.form
                        onSubmit={isSetup ? handleSetup : handleUnlock}
                        className="space-y-4"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
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
                    </motion.form>

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
