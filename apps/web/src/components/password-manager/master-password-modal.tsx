"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock, KeyRound, AlertTriangle, Unlock, ShieldCheck } from "lucide-react"
import { usePasswordStore } from "@/store/password-store"
import { deriveKey, generateSalt, createKeyVerifier, verifyKey } from "@/lib/encryption"
import { auth } from "@/database/firebase"
import { onAuthStateChanged } from "firebase/auth"
import {
    getVaultOrNull,
    listPasswordEntries,
    setupVault,
} from "@/lib/password-manager-api"
import { loadKey, saveKey, clearKey } from "@/lib/key-storage"
import { decryptData } from "@/lib/encryption"
import { PasswordEntry } from "@/store/password-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useIsMobile } from "@/components/hooks/use-mobile"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"

export function VaultLockScreen() {
    const t = useTranslations("PasswordManager.vault")
    const { isUnlocked, setKey, setPasswords, setLoading: setPasswordsLoading } = usePasswordStore()
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [mode, setMode] = useState<"loading" | "setup" | "unlock">("loading")
    const [vaultSalt, setVaultSalt] = useState<string | null>(null)
    const [verifier, setVerifier] = useState<{ encrypted: string; iv: string } | null>(null)
    const [userId, setUserId] = useState<string | null>(null)
    const [shake, setShake] = useState(false)
    const isMobile = useIsMobile()

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid)
                await checkVaultStatus()
            } else {
                setUserId(null)
                setMode("loading")
            }
        })
        return () => unsubscribe()
    }, [])

    const fetchAndSetPasswords = async (key: CryptoKey) => {
        try {
            console.log("[Password Fetch] Starting to fetch passwords from API...")
            setPasswordsLoading(true)
            const rows = await listPasswordEntries()
            console.log(`[Password Fetch] Found ${rows.length} encrypted password(s)`)

            const decryptionPromises = rows.map(async (row) => {
                try {
                    const decryptedData = await decryptData(key, row.encryptedData, row.iv)
                    const parsedData = JSON.parse(decryptedData)

                    return {
                        id: row.id,
                        ...parsedData,
                        createdAt: row.createdAt,
                        updatedAt: row.updatedAt
                    } as PasswordEntry
                } catch (e) {
                    console.error(`[Password Fetch] Failed to decrypt password ${row.id}:`, e)
                    return null
                }
            })

            const results = await Promise.all(decryptionPromises)
            const loadedPasswords = results.filter((p): p is PasswordEntry => p !== null)

            console.log(`[Password Fetch] Successfully decrypted ${loadedPasswords.length} password(s)`)
            setPasswords(loadedPasswords)

            if (loadedPasswords.length === 0 && rows.length > 0) {
                console.warn("[Password Fetch] Warning: Found encrypted passwords but failed to decrypt any")
                toast.error(t("toastDecryptFailed"))
            }
        } catch (error) {
            console.error("[Password Fetch] Failed to fetch passwords:", error)
            toast.error(t("toastLoadFailed"))
            throw error // Re-throw so calling code knows fetch failed
        } finally {
            setPasswordsLoading(false)
        }
    }

    const checkVaultStatus = async () => {
        try {
            const vault = await getVaultOrNull()

            if (vault) {
                setVaultSalt(vault.salt)
                setVerifier(vault.verifier)
                setMode("unlock")

                // Try to auto-unlock
                try {
                    console.log("[Auto-unlock] Starting auto-unlock attempt...")
                    const savedKey = await loadKey()

                    if (!savedKey) {
                        console.log("[Auto-unlock] No saved key found in IndexedDB - user needs to unlock manually")
                        return
                    }

                    console.log("[Auto-unlock] Saved key found, verifying...")
                    const isValid = await verifyKey(savedKey, vault.verifier.encrypted, vault.verifier.iv)

                    if (!isValid) {
                        console.warn("[Auto-unlock] Saved key verification failed - clearing invalid key")
                        await clearKey()
                        return
                    }

                    console.log("[Auto-unlock] Key verified successfully, loading passwords...")
                    setKey(savedKey)
                    await fetchAndSetPasswords(savedKey)
                    console.log("[Auto-unlock] Auto-unlock completed successfully")
                    toast.success(t("toastUnlockedAuto"))
                    return
                } catch (e) {
                    console.error("[Auto-unlock] Auto-unlock failed with error:", e)
                    toast.error(t("toastAutoUnlockFailed"))
                    // Clear potentially corrupted key
                    try {
                        await clearKey()
                    } catch (clearErr) {
                        console.error("[Auto-unlock] Failed to clear corrupted key:", clearErr)
                    }
                }
            } else {
                setMode("setup")
            }
        } catch (err) {
            console.error("Error checking vault status:", err)
            setError(t("errorConnectFailed"))
            toast.error(t("toastConnectFailed"))
        }
    }

    const triggerShake = () => {
        setShake(true)
        setTimeout(() => setShake(false), 500)
    }

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!password || !vaultSalt || !verifier) return

        setLoading(true)
        setError("")

        try {
            console.log("[Manual Unlock] Deriving key from password...")
            const key = await deriveKey(password, vaultSalt)
            const isValid = await verifyKey(key, verifier.encrypted, verifier.iv)

            if (isValid) {
                console.log("[Manual Unlock] Password verified, unlocking vault...")
                setKey(key)

                // Try to save key for auto-unlock, but don't fail if it doesn't work
                try {
                    await saveKey(key)
                    console.log("[Manual Unlock] Key saved successfully for auto-unlock")
                } catch (saveErr) {
                    console.error("[Manual Unlock] Failed to save key (auto-unlock won't work on reload):", saveErr)
                    toast.error(t("toastAutoUnlockWarning"))
                }

                // Load passwords
                try {
                    await fetchAndSetPasswords(key)
                } catch (fetchErr) {
                    console.error("[Manual Unlock] Failed to fetch passwords:", fetchErr)
                    // Error already shown by fetchAndSetPasswords via toast
                }

                setPassword("")
            } else {
                console.warn("[Manual Unlock] Invalid password")
                setError(t("errorIncorrectPassword"))
                triggerShake()
            }
        } catch (err) {
            console.error("[Manual Unlock] Unlock failed:", err)
            setError(t("errorUnlockFailed"))
        } finally {
            setLoading(false)
        }
    }

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!password || !userId) return
        if (password !== confirmPassword) {
            setError(t("errorPasswordsMismatch"))
            triggerShake()
            return
        }
        if (password.length < 8) {
            setError(t("errorPasswordTooShort"))
            triggerShake()
            return
        }

        setLoading(true)
        setError("")

        try {
            const salt = await generateSalt()
            const key = await deriveKey(password, salt)
            const verifierData = await createKeyVerifier(key)

            await setupVault({
                salt,
                verifier: verifierData,
                createdAt: Date.now(),
            })

            setKey(key)
            await saveKey(key)
            setPassword("")
            setConfirmPassword("")
        } catch (err) {
            console.error(err)
            setError(t("errorSetupFailed"))
        } finally {
            setLoading(false)
        }
    }

    if (mode === "loading") {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
            </div>
        )
    }

    // Mobile full-screen experience
    if (isMobile) {
        return (
            <div
                className={cn(
                    "min-h-screen flex flex-col bg-background px-6 py-8 safe-area-inset",
                    shake && "animate-shake"
                )}
                style={shake ? { animation: "shake 0.5s cubic-bezier(.36,.07,.19,.97) both" } : {}}
            >
                <style jsx>{`
                    @keyframes shake {
                        10%, 90% { transform: translate3d(-2px, 0, 0); }
                        20%, 80% { transform: translate3d(3px, 0, 0); }
                        30%, 50%, 70% { transform: translate3d(-5px, 0, 0); }
                        40%, 60% { transform: translate3d(5px, 0, 0); }
                    }
                `}</style>

                {/* Top spacer */}
                <div className="flex-1 flex items-end justify-center pb-8">
                    <motion.div
                        className="flex flex-col items-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* Lock Icon */}
                        <motion.div
                            className={cn(
                                "h-24 w-24 rounded-full flex items-center justify-center mb-6",
                                mode === "setup"
                                    ? "bg-gradient-to-br from-green-500/20 to-emerald-500/10"
                                    : "bg-gradient-to-br from-primary/20 to-primary/5"
                            )}
                            animate={loading ? { scale: [1, 0.95, 1] } : {}}
                            transition={{ repeat: loading ? Infinity : 0, duration: 1 }}
                        >
                            {mode === "setup" ? (
                                <ShieldCheck className="h-12 w-12 text-green-500" />
                            ) : (
                                <Lock className="h-12 w-12 text-primary" />
                            )}
                        </motion.div>

                        {/* Title */}
                        <h1 className="text-2xl font-bold text-center">
                            {mode === "setup" ? t("mobileTitleCreate") : t("mobileTitleWelcome")}
                        </h1>
                        <p className="text-sm text-muted-foreground text-center mt-2 max-w-[280px]">
                            {mode === "setup"
                                ? t("mobileSubtitleCreate")
                                : t("mobileSubtitleUnlock")}
                        </p>
                    </motion.div>
                </div>

                {/* Form */}
                <motion.form
                    onSubmit={mode === "setup" ? handleSetup : handleUnlock}
                    className="space-y-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    <div className="space-y-2">
                        <div className="relative">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                id="password"
                                type="password"
                                placeholder={t("placeholderMasterPassword")}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-12 h-14 text-base rounded-2xl bg-muted/50 border-0 focus-visible:ring-2"
                                autoFocus
                            />
                        </div>
                    </div>

                    {mode === "setup" && (
                        <div className="space-y-2">
                            <div className="relative">
                                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    placeholder={t("placeholderConfirmPassword")}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="pl-12 h-14 text-base rounded-2xl bg-muted/50 border-0 focus-visible:ring-2"
                                />
                            </div>
                        </div>
                    )}

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Alert variant="destructive" className="rounded-xl">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        </motion.div>
                    )}

                    <Button
                        type="submit"
                        className="w-full h-14 text-base rounded-2xl"
                        size="lg"
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                        ) : (
                            <Unlock className="mr-2 h-5 w-5" />
                        )}
                        {mode === "setup" ? t("buttonCreateVault") : t("buttonUnlock")}
                    </Button>
                </motion.form>

                {/* Bottom spacer */}
                <div className="flex-1 flex items-end justify-center pt-8 pb-4">
                    <p className="text-xs text-muted-foreground text-center">
                        {mode === "setup"
                            ? t("footerCreate")
                            : t("footerUnlock")}
                    </p>
                </div>
            </div>
        )
    }

    // Desktop card-based view (original)
    return (
        <div className="flex min-h-[80vh] items-center justify-center p-4">
            <Card className={cn(
                "w-full max-w-md border-muted/40 shadow-xl transition-all duration-300",
                shake && "animate-in fade-in slide-in-from-bottom-4 duration-500"
            )} style={shake ? { animation: "shake 0.5s cubic-bezier(.36,.07,.19,.97) both" } : {}}>
                <style jsx>{`
          @keyframes shake {
            10%, 90% { transform: translate3d(-1px, 0, 0); }
            20%, 80% { transform: translate3d(2px, 0, 0); }
            30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
            40%, 60% { transform: translate3d(4px, 0, 0); }
          }
        `}</style>
                <CardHeader className="space-y-4 text-center pb-2">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-2">
                        {mode === "setup" ? (
                            <ShieldCheck className="h-8 w-8 text-primary" />
                        ) : (
                            <Lock className="h-8 w-8 text-primary" />
                        )}
                    </div>
                    <CardTitle className="text-2xl font-bold">
                        {mode === "setup" ? t("desktopTitleSetup") : t("desktopTitleUnlock")}
                    </CardTitle>
                    <CardDescription className="text-base">
                        {mode === "setup"
                            ? t("desktopDescriptionSetup")
                            : t("desktopDescriptionUnlock")}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={mode === "setup" ? handleSetup : handleUnlock} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">{t("labelMasterPassword")}</Label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder={t("placeholderEnterMaster")}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-9"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {mode === "setup" && (
                            <div className="space-y-2">
                                <Label htmlFor="confirm-password">{t("labelConfirmPassword")}</Label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        placeholder={t("placeholderConfirmMaster")}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        )}

                        {error && (
                            <Alert variant="destructive" className="py-2">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <Button type="submit" className="w-full" size="lg" disabled={loading}>
                            {loading ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            ) : mode === "setup" ? (
                                <Unlock className="mr-2 h-4 w-4" />
                            ) : (
                                <Unlock className="mr-2 h-4 w-4" />
                            )}
                            {mode === "setup" ? t("buttonCreateVault") : t("buttonUnlockVault")}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

