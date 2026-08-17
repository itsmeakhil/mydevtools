"use client"

import { useEffect, useRef, useState } from "react"
import { PasswordEntry } from "@/store/password-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Copy, Eye, EyeOff, Trash2, ExternalLink, Pencil, MoreVertical, Clock, ChevronDown } from "lucide-react"
import { computeTotp, decodeBase32Secret, getTotpSecondsRemaining } from "@/lib/totp-compute"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { calculatePasswordStrength, getStrengthColor, getFaviconUrl, getPasswordAgeStatus, getPasswordAgeBadge, getPasswordAgeDateColor } from "@/lib/password-utils"
import { usePasswordStrengthReady } from "@/lib/use-password-strength"
import { useVaultIconsEnabled } from "@/lib/vault-icon-pref"
import { FaviconImg } from "@/components/favicon-img"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"

const TOTP_PERIOD = 30

function TotpChip({ secret, onCopy }: { secret: string; onCopy: (code: string) => void }) {
    const [code, setCode] = useState<string | null>(null)
    const [remaining, setRemaining] = useState(TOTP_PERIOD)

    useEffect(() => {
        let mounted = true
        let secretBytes: Uint8Array
        try {
            secretBytes = decodeBase32Secret(secret)
        } catch {
            return
        }
        async function tick() {
            const now = Date.now()
            try {
                const c = await computeTotp(secretBytes, now, TOTP_PERIOD, 6)
                if (mounted) {
                    setCode(c)
                    setRemaining(getTotpSecondsRemaining(now, TOTP_PERIOD))
                }
            } catch { /* ignore */ }
        }
        tick()
        const id = setInterval(tick, 1000)
        return () => { mounted = false; clearInterval(id) }
    }, [secret])

    if (!code) return null

    const r = 9
    const circ = 2 * Math.PI * r
    const urgent = remaining <= 5

    return (
        <div className="flex items-center gap-2 bg-muted/30 p-1 pl-3 pr-1 rounded-xl border border-transparent hover:border-primary/10 hover:bg-muted/50 transition-all">
            <svg width="22" height="22" className="-rotate-90 shrink-0">
                <circle cx="11" cy="11" r={r} fill="none" strokeWidth="2" className="stroke-muted-foreground/20" />
                <circle
                    cx="11" cy="11" r={r} fill="none" strokeWidth="2"
                    className={urgent ? "stroke-red-500" : "stroke-primary"}
                    strokeDasharray={circ}
                    strokeDashoffset={circ * (1 - remaining / TOTP_PERIOD)}
                    strokeLinecap="round"
                />
            </svg>
            <span className={cn("font-mono text-sm tracking-widest font-semibold flex-1", urgent ? "text-red-500" : "text-foreground/80")}>
                {code.slice(0, 3)}&thinsp;{code.slice(3)}
            </span>
            <span className="text-[10px] text-muted-foreground tabular-nums w-5 shrink-0">{remaining}s</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-background hover:text-primary rounded-lg" onClick={() => onCopy(code)}>
                <Copy className="h-3.5 w-3.5" />
            </Button>
        </div>
    )
}

interface PasswordCardProps {
    entry: PasswordEntry
    isVisible: boolean
    isReused?: boolean
    onToggleVisibility: (id: string) => void
    onCopy: (text: string, type?: "Password" | "Username" | "TOTP") => void
    onDelete: (id: string) => void
    onEdit: (entry: PasswordEntry) => void
}

export function PasswordCard({
    entry,
    isVisible,
    isReused = false,
    onToggleVisibility,
    onCopy,
    onDelete,
    onEdit
}: PasswordCardProps) {
    const t = useTranslations("PasswordManager.card")
    const tList = useTranslations("PasswordManager.list")
    const strengthReady = usePasswordStrengthReady()
    // Opt-in: fetching a site icon discloses the domain to a third-party
    // service, and for a vault that set of domains is the user's account list.
    const showIcons = useVaultIconsEnabled()
    const [showNotes, setShowNotes] = useState(false)
    const strength = calculatePasswordStrength(entry.password)
    const strengthColor = getStrengthColor(strength)
    const ageStatus = getPasswordAgeStatus(entry.updatedAt)
    const ageBadge = getPasswordAgeBadge(ageStatus)
    const ageDateColor = getPasswordAgeDateColor(ageStatus)

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="h-full"
        >
            <Card className="group h-full flex flex-col hover:shadow-xl transition-all duration-300 border-muted/60 hover:border-primary/20 bg-card/50 backdrop-blur-sm overflow-hidden relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <CardHeader className="pb-3 relative space-y-4">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3.5 overflow-hidden">
                            <div className="h-12 w-12 shrink-0 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary font-bold text-xl select-none shadow-sm ring-1 ring-inset ring-primary/10 group-hover:ring-primary/20 group-hover:scale-105 transition-all duration-300 overflow-hidden">
                                <FaviconImg
                                    serviceUrl={showIcons && entry.url ? getFaviconUrl(entry.url) : null}
                                    className="h-7 w-7 object-contain"
                                    fallback={<span>{entry.service.charAt(0).toUpperCase()}</span>}
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <CardTitle className="text-lg font-bold truncate tracking-tight">{entry.service}</CardTitle>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <CardDescription className="truncate font-mono text-xs opacity-80 max-w-[140px]" title={entry.username}>
                                        {entry.username}
                                    </CardDescription>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 -ml-1 hover:bg-transparent hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                                        onClick={() => onCopy(entry.username, "Username")}
                                        title={t("copyUsername")}
                                    >
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus-within:opacity-100">
                            {entry.url && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-lg"
                                    onClick={() => window.open(entry.url, '_blank')}
                                    title={t("openUrl")}
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </Button>
                            )}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-lg">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                    <DropdownMenuItem onClick={() => onEdit(entry)} className="cursor-pointer">
                                        <Pencil className="mr-2 h-4 w-4" />
                                        {tList("edit")}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => onDelete(entry.id)} className="text-destructive focus:text-destructive cursor-pointer">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        {tList("delete")}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        {strength <= 2 && (
                            <Badge variant="secondary" className="text-[10px] h-5 px-2 bg-red-500/10 text-red-600 dark:text-red-400">
                                Weak
                            </Badge>
                        )}
                        {isReused && (
                            <Badge variant="secondary" className="text-[10px] h-5 px-2 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300">
                                Reused
                            </Badge>
                        )}
                        {ageBadge && (
                            <Badge variant="secondary" className={cn("text-[10px] h-5 px-2 gap-1", ageBadge.className)}>
                                <Clock className="h-2.5 w-2.5" />
                                {tList(ageBadge.labelKey)}
                            </Badge>
                        )}
                        {entry.tags?.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-[10px] h-5 px-2 bg-muted/50 text-muted-foreground hover:bg-muted/80 transition-colors">
                                {tag}
                            </Badge>
                        ))}
                    </div>
                </CardHeader>

                <CardContent className="mt-auto pt-0">
                    <div className="space-y-3">
                        <div className="relative group/pass">
                            <div className="flex items-center gap-2 bg-muted/30 p-1 pl-3 pr-1 rounded-xl border border-transparent group-hover/pass:border-primary/10 group-hover/pass:bg-muted/50 transition-all">
                                <div className="flex-1 font-mono text-sm truncate tracking-wider text-foreground/80">
                                    {/* threatcrush-disable-next-line secret-generic-credential */}
                                    {isVisible ? entry.password : "••••••••••••"}
                                </div>
                                <div className="flex gap-0.5">
                                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-background hover:text-primary rounded-lg" onClick={() => onToggleVisibility(entry.id)}>
                                        {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-background hover:text-primary rounded-lg" onClick={() => onCopy(entry.password)}>
                                        <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {entry.totpSecret && (
                            <TotpChip
                                secret={entry.totpSecret}
                                onCopy={(code) => onCopy(code, "TOTP")}
                            />
                        )}

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] px-1">
                                <span className="text-muted-foreground">{t("strength")}</span>
                                <span className={cn("flex items-center gap-1", ageDateColor)} title={`Last updated: ${new Date(entry.updatedAt).toLocaleDateString()}`}>
                                    {ageStatus !== "fresh" && <Clock className="h-2.5 w-2.5" />}
                                    {formatDistanceToNow(entry.updatedAt, { addSuffix: true })}
                                </span>
                            </div>
                            <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                                <motion.div
                                    className={cn("h-full", strengthColor)}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(strength / 5) * 100}%` }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                />
                            </div>
                        </div>

                        {entry.notes && (
                            <div>
                                <button
                                    type="button"
                                    onClick={() => setShowNotes(v => !v)}
                                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full px-1"
                                >
                                    <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", showNotes && "rotate-180")} />
                                    {showNotes ? "Hide notes" : "Show notes"}
                                </button>
                                {showNotes && (
                                    <div className="mt-1.5 text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-lg border border-border/30 italic whitespace-pre-wrap break-words">
                                        {entry.notes}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
