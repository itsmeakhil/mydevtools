"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import type { RequestSettings } from "./types"

/** True when any setting differs from the engine defaults (drives the tab dot). */
export function hasCustomSettings(s: RequestSettings): boolean {
    return s.timeoutMs !== undefined || s.maxRedirects !== undefined ||
        s.followRedirects === false || s.verifySsl === false || s.useCookieJar === false
}

/** "" → undefined (engine default); otherwise a non-negative integer. */
function parseCount(raw: string): number | undefined {
    if (raw.trim() === "") return undefined
    const n = Math.floor(Number(raw))
    return Number.isFinite(n) && n >= 0 ? n : undefined
}

interface RowProps {
    id: string
    label: string
    hint: string
    hintTone?: "muted" | "warning"
    children: React.ReactNode
}

function Row({ id, label, hint, hintTone = "muted", children }: RowProps) {
    return (
        <div className="flex items-center justify-between gap-6 py-3">
            <div className="min-w-0">
                <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
                <p
                    id={`${id}-hint`}
                    className={cn("mt-0.5 text-xs", hintTone === "warning" ? "text-warning" : "text-muted-foreground")}
                >
                    {hint}
                </p>
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    )
}

interface RequestSettingsPanelProps {
    settings: RequestSettings
    onChange: (patch: RequestSettings) => void
}

export function RequestSettingsPanel({ settings, onChange }: RequestSettingsPanelProps) {
    const t = useTranslations("ApiClient.requestSettings")
    const follow = settings.followRedirects !== false
    const verify = settings.verifySsl !== false

    return (
        <div className="max-w-xl divide-y divide-border">
            <Row id="req-timeout" label={t("timeout")} hint={t("timeoutHint")}>
                <Input
                    id="req-timeout"
                    aria-describedby="req-timeout-hint"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={600000}
                    step={1000}
                    placeholder="30000"
                    className="h-8 w-28 font-mono text-right"
                    value={settings.timeoutMs ?? ""}
                    onChange={(e) => onChange({ timeoutMs: parseCount(e.target.value) })}
                />
            </Row>
            <Row id="req-follow" label={t("followRedirects")} hint={t("followRedirectsHint")}>
                <Switch
                    id="req-follow"
                    aria-describedby="req-follow-hint"
                    checked={follow}
                    onCheckedChange={(on) => onChange({ followRedirects: on ? undefined : false })}
                />
            </Row>
            <Row id="req-max-redirects" label={t("maxRedirects")} hint={t("maxRedirectsHint")}>
                <Input
                    id="req-max-redirects"
                    aria-describedby="req-max-redirects-hint"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={50}
                    placeholder="5"
                    disabled={!follow}
                    className="h-8 w-28 font-mono text-right"
                    value={settings.maxRedirects ?? ""}
                    onChange={(e) => onChange({ maxRedirects: parseCount(e.target.value) })}
                />
            </Row>
            <Row
                id="req-verify-ssl"
                label={t("verifySsl")}
                hint={verify ? t("verifySslHint") : t("verifySslOffHint")}
                hintTone={verify ? "muted" : "warning"}
            >
                <Switch
                    id="req-verify-ssl"
                    aria-describedby="req-verify-ssl-hint"
                    checked={verify}
                    onCheckedChange={(on) => onChange({ verifySsl: on ? undefined : false })}
                />
            </Row>
            <Row id="req-cookie-jar" label={t("cookieJar")} hint={t("cookieJarHint")}>
                <Switch
                    id="req-cookie-jar"
                    aria-describedby="req-cookie-jar-hint"
                    checked={settings.useCookieJar !== false}
                    onCheckedChange={(on) => onChange({ useCookieJar: on ? undefined : false })}
                />
            </Row>
        </div>
    )
}
