"use client"

import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion"
import { Copy, Trash2, Eye, EyeOff, ExternalLink, MoreVertical, Pencil, KeyRound, User } from "lucide-react"
import { PasswordEntry } from "@/store/password-store"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useVaultIconsEnabled } from "@/lib/vault-icon-pref"
import { getFaviconUrl } from "@/lib/password-utils"
import { FaviconImg } from "@/components/favicon-img"
import { useState } from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useTranslations } from "next-intl"

interface PasswordItemSwipeableProps {
    entry: PasswordEntry
    onCopy: (text: string) => void
    onDelete: (id: string) => void
    onEdit: (entry: PasswordEntry) => void
    onToggleVisibility: (id: string) => void
    isVisible: boolean
}

export function PasswordItemSwipeable({
    entry,
    onCopy,
    onDelete,
    onEdit,
    onToggleVisibility,
    isVisible
}: PasswordItemSwipeableProps) {
    const t = useTranslations("PasswordManager.swipeable")
    // Opt-in: fetching a site icon discloses the domain to a third-party
    // service, and for a vault that set of domains is the user's account list.
    const showIcons = useVaultIconsEnabled()
    const [expanded, setExpanded] = useState(false)
    const x = useMotionValue(0)
    const opacityRight = useTransform(x, [30, 80], [0, 1])
    const opacityLeft = useTransform(x, [-30, -80], [0, 1])
    const scaleRight = useTransform(x, [30, 80], [0.8, 1])
    const scaleLeft = useTransform(x, [-30, -80], [0.8, 1])
    const bgRight = useTransform(x, [0, 80], ["rgba(34, 197, 94, 0)", "rgba(34, 197, 94, 0.15)"])
    const bgLeft = useTransform(x, [0, -80], ["rgba(239, 68, 68, 0)", "rgba(239, 68, 68, 0.15)"])

    const handleDragEnd = (_: any, info: PanInfo) => {
        if (info.offset.x > 60) {
            onCopy(entry.password)
        } else if (info.offset.x < -60) {
            onDelete(entry.id)
        }
    }

    const handleTap = () => {
        setExpanded(!expanded)
    }

    return (
        <div className="relative overflow-visible">
            {/* Background Actions */}
            <motion.div
                style={{ opacity: opacityRight, backgroundColor: bgRight }}
                className="absolute inset-y-0 left-0 w-full flex items-center justify-start pl-5 z-10 rounded-xl"
            >
                <motion.div style={{ scale: scaleRight }} className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Copy className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600">{t("copy")}</span>
                </motion.div>
            </motion.div>
            <motion.div
                style={{ opacity: opacityLeft, backgroundColor: bgLeft }}
                className="absolute inset-y-0 right-0 w-full flex items-center justify-end pr-5 z-10 rounded-xl"
            >
                <motion.div style={{ scale: scaleLeft }} className="flex items-center gap-2">
                    <span className="text-xs font-medium text-red-600">{t("delete")}</span>
                    <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
                        <Trash2 className="h-5 w-5 text-red-600" />
                    </div>
                </motion.div>
            </motion.div>

            {/* Foreground Card */}
            <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.15}
                onDragEnd={handleDragEnd}
                style={{ x }}
                className={cn(
                    "relative z-20 bg-card transition-all duration-200 border border-transparent",
                    expanded ? "shadow-md ring-1 ring-border rounded-xl my-2" : "border-b border-border/40 rounded-none bg-background"
                )}
            >
                <div
                    className={cn(
                        "flex items-center gap-3 p-3 cursor-pointer",
                        // Add hover effect if needed, mostly for desktop but this is mobile specific
                    )}
                    onClick={handleTap}
                >
                    {/* Icon */}
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-muted/50 flex items-center justify-center text-primary font-semibold text-base overflow-hidden border border-border/50">
                        <FaviconImg
                            serviceUrl={showIcons && entry.url ? getFaviconUrl(entry.url) : null}
                            className="h-6 w-6 object-contain"
                            fallback={<span>{entry.service.charAt(0).toUpperCase()}</span>}
                        />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <h3 className="font-semibold text-[15px] truncate leading-tight text-foreground/90">{entry.service}</h3>
                        <p className="text-[13px] text-muted-foreground truncate">{entry.username}</p>
                    </div>

                    {/* Kebab Menu */}
                    <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/60 hover:text-foreground">
                                    <MoreVertical className="h-4.5 w-4.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => onCopy(entry.password)}>
                                    <KeyRound className="mr-2 h-4 w-4" /> {t("copyPassword")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onCopy(entry.username)}>
                                    <User className="mr-2 h-4 w-4" /> {t("copyUsername")}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => onEdit(entry)}>
                                    <Pencil className="mr-2 h-4 w-4" /> {t("edit")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onDelete(entry.id)} className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> {t("deleteAction")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Expanded Details */}
                <motion.div
                    initial={false}
                    animate={{
                        height: expanded ? "auto" : 0,
                        opacity: expanded ? 1 : 0
                    }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden bg-muted/30"
                >
                    <div className="px-4 pb-4 pt-2 space-y-3">
                        {/* Password Row */}
                        <div className="flex items-center justify-between bg-background p-2.5 rounded-lg border border-border/50 shadow-sm">
                            <span className="font-mono text-sm truncate flex-1 mr-2 text-foreground/80">
                                {isVisible ? entry.password : "••••••••••••"}
                            </span>
                            <div className="flex gap-1">
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onToggleVisibility(entry.id)}>
                                    {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onCopy(entry.password)}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* URL Button + Notes */}
                        <div className="flex flex-col gap-2">
                            {entry.url && (
                                <a
                                    href={entry.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center text-xs text-primary hover:underline px-1"
                                >
                                    <ExternalLink className="h-3 w-3 mr-1.5" />
                                    {entry.url}
                                </a>
                            )}

                            {entry.notes && (
                                <p className="text-xs text-muted-foreground px-1 italic border-l-2 border-primary/20 pl-2">
                                    {entry.notes}
                                </p>
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    )
}

