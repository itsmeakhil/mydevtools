"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { isDesktop } from "@/lib/desktop/is-desktop"
import type { ClientCertEntry } from "@/lib/api-client/network-settings"

async function pickFile(extensions: string[]): Promise<string | null> {
    const { open } = await import("@tauri-apps/plugin-dialog")
    const res = await open({ multiple: false, filters: [{ name: extensions.join(", "), extensions }] })
    return typeof res === "string" ? res : null
}

/** Path field with a native Browse… button on desktop (typing a path also works). */
function PathField({ id, label, value, onChange, extensions }: {
    id: string
    label: string
    value: string | undefined
    onChange: (v: string) => void
    extensions: string[]
}) {
    const t = useTranslations("ApiClient.network")
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id} className="text-xs">{label}</Label>
            <div className="flex gap-2">
                <Input
                    id={id}
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={t("filePlaceholder")}
                    spellCheck={false}
                    className="h-8 font-mono text-xs"
                />
                {isDesktop() && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 shrink-0"
                        onClick={async () => {
                            const p = await pickFile(extensions)
                            if (p) onChange(p)
                        }}
                    >
                        {t("browse")}
                    </Button>
                )}
            </div>
        </div>
    )
}

const PEM_EXT = ["pem", "crt", "cer", "key"]

interface CertListEditorProps {
    certs: ClientCertEntry[]
    onCertsChange: (certs: ClientCertEntry[]) => void
    caPaths: string[]
    onCaPathsChange: (paths: string[]) => void
    /** Shown under passphrase fields (folder collections keep only {{vault.*}}). */
    passphraseHint?: string
}

/** Client certificates (by host pattern) + extra CA files — global and per collection. */
export function CertListEditor({ certs, onCertsChange, caPaths, onCaPathsChange, passphraseHint }: CertListEditorProps) {
    const t = useTranslations("ApiClient.network")
    const update = (id: string, patch: Partial<ClientCertEntry>) =>
        onCertsChange(certs.map((c) => (c.id === id ? { ...c, ...patch } : c)))

    return (
        <div className="space-y-6">
            <section className="space-y-3">
                <p className="text-xs text-muted-foreground">{t("certsHint")}</p>
                {certs.length === 0 && <p className="text-sm text-muted-foreground">{t("noCerts")}</p>}
                {certs.map((c) => (
                    <div key={c.id} className="rounded-lg border border-border p-3 space-y-3">
                        <div className="flex items-end gap-2">
                            <div className="flex-1 space-y-1.5">
                                <Label htmlFor={`host-${c.id}`} className="text-xs">{t("host")}</Label>
                                <Input
                                    id={`host-${c.id}`}
                                    value={c.host}
                                    onChange={(e) => update(c.id, { host: e.target.value })}
                                    placeholder={t("hostPlaceholder")}
                                    spellCheck={false}
                                    className="h-8 font-mono text-xs"
                                />
                            </div>
                            <div className="w-44 space-y-1.5">
                                <Label className="text-xs">{t("type")}</Label>
                                <Select value={c.type} onValueChange={(v) => update(c.id, { type: v as ClientCertEntry["type"] })}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pem">{t("typePem")}</SelectItem>
                                        <SelectItem value="pfx">{t("typePfx")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                aria-label={t("remove")}
                                title={t("remove")}
                                onClick={() => onCertsChange(certs.filter((x) => x.id !== c.id))}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        {c.type === "pem" ? (
                            <div className="grid gap-3 sm:grid-cols-2">
                                <PathField id={`cert-${c.id}`} label={t("certPath")} value={c.certPath} onChange={(v) => update(c.id, { certPath: v })} extensions={PEM_EXT} />
                                <PathField id={`key-${c.id}`} label={t("keyPath")} value={c.keyPath} onChange={(v) => update(c.id, { keyPath: v })} extensions={PEM_EXT} />
                            </div>
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2">
                                <PathField id={`pfx-${c.id}`} label={t("pfxPath")} value={c.pfxPath} onChange={(v) => update(c.id, { pfxPath: v })} extensions={["pfx", "p12"]} />
                                <div className="space-y-1.5">
                                    <Label htmlFor={`pass-${c.id}`} className="text-xs">{t("passphrase")}</Label>
                                    <Input
                                        id={`pass-${c.id}`}
                                        type="password"
                                        autoComplete="off"
                                        value={c.passphrase ?? ""}
                                        onChange={(e) => update(c.id, { passphrase: e.target.value })}
                                        aria-describedby={passphraseHint ? `pass-hint-${c.id}` : undefined}
                                        className="h-8 text-xs"
                                    />
                                    {passphraseHint && <p id={`pass-hint-${c.id}`} className="text-[11px] text-muted-foreground">{passphraseHint}</p>}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => onCertsChange([...certs, { id: crypto.randomUUID(), host: "", type: "pem" }])}
                >
                    <Plus className="h-3.5 w-3.5" />
                    {t("addCert")}
                </Button>
            </section>

            <section className="space-y-3">
                <div>
                    <h3 className="text-sm font-medium">{t("caTitle")}</h3>
                    <p className="text-xs text-muted-foreground">{t("caHint")}</p>
                </div>
                {caPaths.map((p, i) => (
                    <div key={i} className="flex items-end gap-2">
                        <div className="flex-1">
                            <PathField
                                id={`ca-${i}`}
                                label={t("caFile", { n: i + 1 })}
                                value={p}
                                onChange={(v) => onCaPathsChange(caPaths.map((x, j) => (j === i ? v : x)))}
                                extensions={PEM_EXT}
                            />
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            aria-label={t("remove")}
                            title={t("remove")}
                            onClick={() => onCaPathsChange(caPaths.filter((_, j) => j !== i))}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => onCaPathsChange([...caPaths, ""])}>
                    <Plus className="h-3.5 w-3.5" />
                    {t("addCa")}
                </Button>
            </section>
        </div>
    )
}

/** Entries worth saving: a host plus the file(s) for its format; blank CA rows dropped. */
export function cleanCerts(certs: ClientCertEntry[]): ClientCertEntry[] {
    return certs
        .map((c) => ({ ...c, host: c.host.trim() }))
        .filter((c) => c.host && (c.type === "pfx" ? c.pfxPath?.trim() : c.certPath?.trim()))
}

export const cleanPaths = (paths: string[]) => paths.map((p) => p.trim()).filter(Boolean)
