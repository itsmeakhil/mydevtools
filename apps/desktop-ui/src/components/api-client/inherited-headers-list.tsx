"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Checkbox } from "@/components/ui/checkbox"
import type { InheritedHeader } from "@/lib/folder-inheritance"

interface InheritedHeadersListProps {
    headers: InheritedHeader[]
    omitHeaders?: string[]
    setOmitHeaders: (keys: string[] | undefined) => void
}

/** Collection/folder default headers, each with a per-request "send" checkbox. */
export function InheritedHeadersList({ headers, omitHeaders, setOmitHeaders }: InheritedHeadersListProps) {
    const t = useTranslations("ApiClient.defaultHeaders")

    const toggle = (key: string, send: boolean) => {
        const lower = key.toLowerCase()
        const next = (omitHeaders ?? []).filter((k) => k !== lower)
        if (!send) next.push(lower)
        setOmitHeaders(next.length ? next : undefined)
    }

    return (
        <section className="space-y-2">
            <div>
                <h4 className="text-[13px] font-medium">{t("title")}</h4>
                <p className="text-xs text-muted-foreground">{t("hint")}</p>
            </div>
            <ul className="divide-y divide-border rounded-lg border border-border">
                {headers.map((h) => (
                    <li key={h.key} className="flex items-center gap-3 px-3 py-2 text-[13px]">
                        <Checkbox
                            checked={!h.omitted}
                            onCheckedChange={(v) => toggle(h.key, v === true)}
                            aria-label={t("send", { key: h.key })}
                        />
                        <span className={h.omitted ? "font-mono text-muted-foreground line-through" : "font-mono"}>{h.key}</span>
                        <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground">{h.value}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{t("from", { name: h.from })}</span>
                    </li>
                ))}
            </ul>
        </section>
    )
}
