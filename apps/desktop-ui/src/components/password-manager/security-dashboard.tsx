"use client"

import { useMemo, useState } from "react"
import { usePasswordStore, BreachStatus } from "@/store/password-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { calculatePasswordStrength } from "@/lib/password-utils"
import { usePasswordStrengthReady } from "@/lib/use-password-strength"
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, Lock, ChevronDown } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/components/hooks/use-mobile"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslations } from "next-intl"

export function SecurityDashboard({ minimal = true }: { minimal?: boolean }) {
    const t = useTranslations("PasswordManager.security")
    const strengthReady = usePasswordStrengthReady()
    const { passwords, breachResults, breachStatus } = usePasswordStore()
    const isMobile = useIsMobile()
    const [expanded, setExpanded] = useState(false)

    const metrics = useMemo(() => {
        const total = passwords.length
        if (total === 0) return null

        let weakCount = 0
        let mediumCount = 0
        let strongCount = 0
        const reusedMap = new Map<string, number>()
        let reusedCount = 0
        let breachedCount = 0

        passwords.forEach(p => {
            const strength = calculatePasswordStrength(p.password)
            if (strength <= 2) weakCount++
            else if (strength <= 3) mediumCount++
            else strongCount++

            reusedMap.set(p.password, (reusedMap.get(p.password) || 0) + 1)

            if (breachStatus === "done" && breachResults.get(p.id)?.status === "breached") breachedCount++
        })

        reusedMap.forEach(count => {
            if (count > 1) reusedCount += count
        })

        let score = 100
        score -= (weakCount * 10)
        score -= (mediumCount * 2)
        score -= (reusedCount * 5)
        score -= (breachedCount * 15)
        score = Math.max(0, Math.min(100, score))

        return { total, weakCount, mediumCount, strongCount, reusedCount, breachedCount, score }
    }, [passwords, breachResults, breachStatus, strengthReady])

    if (!metrics) return null

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-green-500"
        if (score >= 50) return "text-yellow-500"
        return "text-red-500"
    }

    const getScoreLabel = (score: number) => {
        if (score >= 80) return t("scoreExcellent")
        if (score >= 50) return t("scoreGood")
        if (score >= 30) return t("scoreFair")
        return t("scoreCritical")
    }

    const getScoreBg = (score: number) => {
        if (score >= 80) return "bg-green-500"
        if (score >= 50) return "bg-yellow-500"
        return "bg-red-500"
    }

    // Mobile compact view
    if (isMobile && minimal) {
        return (
            <div className="px-4 pt-4">
                <div
                    className="bg-card rounded-2xl border shadow-sm overflow-hidden"
                    onClick={() => setExpanded(!expanded)}
                >
                    {/* Main Summary Row */}
                    <div className="flex items-center gap-4 p-4 cursor-pointer">
                        {/* Score Circle */}
                        <div className="relative h-14 w-14 shrink-0">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    className="text-muted/30"
                                />
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeDasharray={`${metrics.score}, 100`}
                                    className={getScoreColor(metrics.score)}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className={cn("text-sm font-bold", getScoreColor(metrics.score))}>
                                    {metrics.score}
                                </span>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{t("vaultHealth")}</h3>
                                <span className={cn(
                                    "text-xs font-medium px-2 py-0.5 rounded-full",
                                    metrics.score >= 80 ? "bg-green-500/10 text-green-600" :
                                        metrics.score >= 50 ? "bg-yellow-500/10 text-yellow-600" :
                                            "bg-red-500/10 text-red-600"
                                )}>
                                    {getScoreLabel(metrics.score)}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {t("totalCountLabel", { count: metrics.total })} • {metrics.weakCount > 0 ? t("weakCountLabel", { count: metrics.weakCount }) : t("allSecure")}
                            </p>
                        </div>

                        {/* Chevron */}
                        <motion.div
                            animate={{ rotate: expanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        </motion.div>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                        {expanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="px-4 pb-4 pt-0 grid grid-cols-2 gap-3">
                                    <div className="bg-muted/30 rounded-xl p-3 text-center">
                                        <div className="text-lg font-bold">{metrics.total}</div>
                                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("total")}</div>
                                    </div>
                                    <div className={cn(
                                        "rounded-xl p-3 text-center",
                                        metrics.weakCount > 0 ? "bg-red-500/10" : "bg-muted/30"
                                    )}>
                                        <div className={cn("text-lg font-bold", metrics.weakCount > 0 && "text-red-500")}>
                                            {metrics.weakCount}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("weak")}</div>
                                    </div>
                                    <div className={cn(
                                        "rounded-xl p-3 text-center",
                                        metrics.reusedCount > 0 ? "bg-yellow-500/10" : "bg-muted/30"
                                    )}>
                                        <div className={cn("text-lg font-bold", metrics.reusedCount > 0 && "text-yellow-500")}>
                                            {metrics.reusedCount}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("reused")}</div>
                                    </div>
                                    <div className={cn(
                                        "rounded-xl p-3 text-center",
                                        metrics.breachedCount > 0 ? "bg-red-500/10" : "bg-muted/30"
                                    )}>
                                        <div className={cn("text-lg font-bold", metrics.breachedCount > 0 && "text-red-500")}>
                                            {breachStatus === "checking" ? "…" : metrics.breachedCount}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Breached</div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        )
    }

    // Desktop view
    return (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-5 mb-6">
            <Card className="col-span-full lg:col-span-1 bg-card/50 backdrop-blur-sm border-muted/60">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{t("vaultHealth")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div className={cn("text-3xl font-bold", getScoreColor(metrics.score))}>
                            {metrics.score}
                            <span className="text-sm font-normal text-muted-foreground ml-1">/ 100</span>
                        </div>
                        {metrics.score >= 80 ? (
                            <ShieldCheck className="h-8 w-8 text-green-500 opacity-80" />
                        ) : metrics.score >= 50 ? (
                            <ShieldAlert className="h-8 w-8 text-yellow-500 opacity-80" />
                        ) : (
                            <AlertTriangle className="h-8 w-8 text-red-500 opacity-80" />
                        )}
                    </div>
                    <div className="mt-3 text-xs font-medium text-muted-foreground">
                        {t("statusLabel")}: <span className={getScoreColor(metrics.score)}>{getScoreLabel(metrics.score)}</span>
                    </div>
                    <Progress value={metrics.score} className={cn("h-1.5 mt-3",
                        metrics.score >= 80 ? "bg-green-100 dark:bg-green-900/20 [&>div]:bg-green-500" :
                            metrics.score >= 50 ? "bg-yellow-100 dark:bg-yellow-900/20 [&>div]:bg-yellow-500" :
                                "bg-red-100 dark:bg-red-900/20 [&>div]:bg-red-500"
                    )} />
                </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-muted/60">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{t("totalPasswords")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{metrics.total}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {t("activeEntries")}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                        <Lock className="h-3 w-3" /> {t("protected")}
                    </div>
                </CardContent>
            </Card>

            <Card className={cn("bg-card/50 backdrop-blur-sm border-muted/60", metrics.weakCount > 0 && "border-red-500/20 bg-red-500/5")}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{t("weakPasswords")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className={cn("text-2xl font-bold", metrics.weakCount > 0 ? "text-red-500" : "text-foreground")}>
                        {metrics.weakCount}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {t("needingImprovement")}
                    </p>
                    {metrics.weakCount === 0 && (
                        <div className="mt-4 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3" /> {t("allGood")}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className={cn("bg-card/50 backdrop-blur-sm border-muted/60", metrics.reusedCount > 0 && "border-yellow-500/20 bg-yellow-500/5")}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{t("reusedPasswords")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className={cn("text-2xl font-bold", metrics.reusedCount > 0 ? "text-yellow-500" : "text-foreground")}>
                        {metrics.reusedCount}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {t("usedMultipleTimes")}
                    </p>
                    {metrics.reusedCount === 0 && (
                        <div className="mt-4 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3" /> {t("unique")}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className={cn("bg-card/50 backdrop-blur-sm border-muted/60", metrics.breachedCount > 0 && "border-red-500/30 bg-red-500/5")}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Breached</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className={cn("text-2xl font-bold", metrics.breachedCount > 0 ? "text-red-500" : "text-foreground")}>
                        {breachStatus === "checking" ? "…" : metrics.breachedCount}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {breachStatus === "idle" ? "Run breach check to scan" : breachStatus === "checking" ? "Checking…" : "Found in data breaches"}
                    </p>
                    {breachStatus === "done" && metrics.breachedCount === 0 && (
                        <div className="mt-4 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3" /> None found
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
