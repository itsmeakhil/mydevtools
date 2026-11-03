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
        <div className="flex items-center gap-2 bg-muted/40 p-1 pl-3 pr-1 rounded-lg border border-border">
            <svg width="22" height="22" className="-rotate-90 shrink-0">
                <circle cx="11" cy="11" r={r} fill="none" strokeWidth="2" className="stroke-muted-foreground/20" />
                <circle
                    cx="11" cy="11" r={r} fill="none" strokeWidth="2"
                    className={urgent ? "stroke-destructive" : "stroke-primary"}
                    strokeDasharray={circ}
                    strokeDashoffset={circ * (1 - remaining / TOTP_PERIOD)}
                    strokeLinecap="round"
                />
            </svg>
            <span className={cn("font-mono text-[13px] tracking-wider font-medium flex-1 tabular-nums", urgent ? "text-destructive" : "text-foreground")}>
                {code.slice(0, 3)}&thinsp;{code.slice(3)}
            </span>
            <span className="text-[11px] text-muted-foreground tabular-nums w-5 shrink-0">{remaining}s</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-muted-foreground" onClick={() => onCopy(code)}>
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
            className="h-full"
        >
            <Card className="group h-full flex flex-col rounded-xl border-border bg-card shadow-elev-1 overflow-hidden relative">
                <CardHeader className="p-4 pb-3 relative space-y-3">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="h-10 w-10 shrink-0 rounded-xl bg-muted flex items-center justify-center text-muted-foreground font-medium text-base select-none overflow-hidden">
                                <FaviconImg
                                    serviceUrl={showIcons && entry.url ? getFaviconUrl(entry.url) : null}
                                    className="h-6 w-6 object-contain"
                                    fallback={<span>{entry.service.charAt(0).toUpperCase()}</span>}
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <CardTitle className="text-[15px] font-semibold truncate">{entry.service}</CardTitle>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <CardDescription className="truncate font-mono text-xs max-w-[140px]" title={entry.username}>
                                        {entry.username}
                                    </CardDescription>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 -ml-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
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
                                    className="h-7 w-7 text-muted-foreground"
                                    onClick={() => window.open(entry.url, '_blank')}
                                    title={t("openUrl")}
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </Button>
                            )}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
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
                            <Badge variant="secondary" className="text-[11px] h-5 px-2 bg-destructive/[0.12] text-destructive">
                                Weak
                            </Badge>
                        )}
                        {isReused && (
                            <Badge variant="secondary" className="text-[11px] h-5 px-2 bg-warning/[0.12] text-warning">
                                Reused
                            </Badge>
                        )}
                        {ageBadge && (
                            <Badge variant="secondary" className={cn("text-[11px] h-5 px-2 gap-1", ageBadge.className)}>
                                <Clock className="h-2.5 w-2.5" />
                                {tList(ageBadge.labelKey)}
                            </Badge>
                        )}
                        {entry.tags?.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-[11px] h-5 px-2 bg-foreground/[0.06] text-muted-foreground">
                                {tag}
                            </Badge>
                        ))}
                    </div>
                </CardHeader>

                <CardContent className="mt-auto p-4 pt-0">
                    <div className="space-y-3">
                        <div className="relative">
                            <div className="flex items-center gap-2 bg-muted/40 p-1 pl-3 pr-1 rounded-lg border border-border">
                                <div className="flex-1 font-mono text-[13px] truncate tracking-wide text-foreground">
                                    {/* threatcrush-disable-next-line secret-generic-credential */}
                                    {isVisible ? entry.password : "••••••••••••"}
                                </div>
                                <div className="flex gap-0.5">
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-muted-foreground" onClick={() => onToggleVisibility(entry.id)}>
                                        {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-muted-foreground" onClick={() => onCopy(entry.password)}>
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
                            <div className="flex items-center justify-between text-[11px] px-1">
                                <span className="text-muted-foreground">{t("strength")}</span>
                                <span className={cn("flex items-center gap-1", ageDateColor)} title={`Last updated: ${new Date(entry.updatedAt).toLocaleDateString()}`}>
                                    {ageStatus !== "fresh" && <Clock className="h-2.5 w-2.5" />}
                                    {formatDistanceToNow(entry.updatedAt, { addSuffix: true })}
                                </span>
                            </div>
                            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
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
                                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full px-1"
                                >
                                    <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", showNotes && "rotate-180")} />
                                    {showNotes ? "Hide notes" : "Show notes"}
                                </button>
                                {showNotes && (
                                    <div className="mt-1.5 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border whitespace-pre-wrap break-words">
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
