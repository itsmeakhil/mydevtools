"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { FileUp, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { applyOpenApiSync, diffOpenApiSync, type SyncChange } from "@/lib/api-client/openapi-sync"
import { fetchOpenApiText } from "@/lib/import/openapi-watcher"
import { useCollectionsActions } from "../context/collections-context"
import type { Collection } from "../types"

const urlKey = (id: string) => `api-client-openapi-url:${id}`

interface OpenApiSyncDialogProps {
    collection: Collection | null
    onOpenChange: (open: boolean) => void
}

export function OpenApiSyncDialog({ collection, onOpenChange }: OpenApiSyncDialogProps) {
    const t = useTranslations("ApiClient.openApiSync")
    const { replaceItems } = useCollectionsActions()
    const fileRef = React.useRef<HTMLInputElement>(null)
    const [url, setUrl] = React.useState("")
    const [spec, setSpec] = React.useState<string | null>(null)
    const [changes, setChanges] = React.useState<SyncChange[] | null>(null)
    const [selected, setSelected] = React.useState<Set<string>>(new Set())
    const [busy, setBusy] = React.useState(false)

    // Keyed on the id: the collection object itself changes with every edit.
    const collectionId = collection?.id
    React.useEffect(() => {
        if (!collectionId) return
        let saved = ""
        try { saved = localStorage.getItem(urlKey(collectionId)) ?? "" } catch { /* private mode */ }
        setUrl(saved)
        setSpec(null)
        setChanges(null)
    }, [collectionId])

    const compare = (text: string) => {
        if (!collection) return
        try {
            const next = diffOpenApiSync(collection, text)
            setSpec(text)
            setChanges(next)
            // Removals are opt-in: they may be requests the user added on purpose.
            setSelected(new Set(next.filter((c) => c.kind !== "removed").map((c) => c.key)))
        } catch (e) {
            toast.error(t("loadFailed", { message: e instanceof Error ? e.message : String(e) }))
        }
    }

    const compareUrl = async () => {
        if (!collection || !url.trim()) return
        setBusy(true)
        try {
            const text = await fetchOpenApiText(url.trim())
            try { localStorage.setItem(urlKey(collection.id), url.trim()) } catch { /* private mode */ }
            compare(text)
        } catch (e) {
            toast.error(t("loadFailed", { message: e instanceof Error ? e.message : String(e) }))
        } finally {
            setBusy(false)
        }
    }

    const apply = async () => {
        if (!collection || !spec) return
        setBusy(true)
        try {
            // Re-diff against the live collection so edits made since "Compare" aren't overwritten.
            const accepted = diffOpenApiSync(collection, spec).filter((c) => selected.has(c.key))
            const { items, ops } = applyOpenApiSync(collection, accepted)
            if (await replaceItems(collection.id, items, ops, t("failed"))) {
                toast.success(t("applied"))
                onOpenChange(false)
            }
        } catch (e) {
            toast.error(t("loadFailed", { message: e instanceof Error ? e.message : String(e) }))
        } finally {
            setBusy(false)
        }
    }

    const toggle = (key: string, on: boolean) =>
        setSelected((cur) => {
            const next = new Set(cur)
            if (on) next.add(key)
            else next.delete(key)
            return next
        })

    const detailsOf = (c: SyncChange): string | null => {
        if (c.kind !== "changed") return null
        const parts: string[] = []
        if (c.details.paramsAdded.length) parts.push(t("paramsAdded", { names: c.details.paramsAdded.join(", ") }))
        if (c.details.headersAdded.length) parts.push(t("headersAdded", { names: c.details.headersAdded.join(", ") }))
        if (c.details.body === "type") parts.push(t("bodyType"))
        if (c.details.body === "fields") parts.push(t("bodyFields"))
        return parts.join(" · ")
    }

    const section = (kind: SyncChange["kind"], title: string, hint?: string) => {
        const rows = changes?.filter((c) => c.kind === kind) ?? []
        if (rows.length === 0) return null
        return (
            <div className="space-y-1.5">
                <div className="text-xs font-semibold">{title}</div>
                {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
                {rows.map((c) => {
                    const details = detailsOf(c)
                    const name = c.kind === "added" ? c.request.name : c.name
                    return (
                        <label key={c.key} className="flex items-start gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-xs cursor-pointer">
                            <Checkbox
                                className="mt-0.5"
                                checked={selected.has(c.key)}
                                onCheckedChange={(v) => toggle(c.key, v === true)}
                            />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono font-semibold break-all">{c.key}</span>
                                    <span className="truncate text-muted-foreground">{name}</span>
                                </div>
                                {details && <div className="text-[11px] text-muted-foreground">{details}</div>}
                            </div>
                        </label>
                    )
                })}
            </div>
        )
    }

    const count = (kind: SyncChange["kind"]) => changes?.filter((c) => c.kind === kind).length ?? 0

    return (
        <Dialog open={collection !== null} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[640px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                    <DialogDescription>{t("description")}</DialogDescription>
                </DialogHeader>
                <div className="flex items-center gap-2">
                    <Input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") void compareUrl() }}
                        placeholder={t("urlPlaceholder")}
                        aria-label={t("url")}
                        className="font-mono text-xs"
                    />
                    <Button size="sm" onClick={() => void compareUrl()} disabled={busy || !url.trim()}>
                        {busy && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                        {t("compare")}
                    </Button>
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".json,.yaml,.yml,application/json,application/yaml,text/yaml"
                        className="hidden"
                        onChange={async (e) => {
                            const file = e.target.files?.[0]
                            e.target.value = ""
                            if (file) compare(await file.text())
                        }}
                    />
                    <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
                        <FileUp className="h-3.5 w-3.5 mr-1" />
                        {t("chooseFile")}
                    </Button>
                </div>
                {changes && (
                    <ScrollArea className="flex-1 min-h-0 -mx-1">
                        <div className="px-1 space-y-4">
                            {changes.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground text-[13px]">{t("noChanges")}</div>
                            )}
                            {section("added", t("added", { count: count("added") }))}
                            {section("changed", t("changed", { count: count("changed") }))}
                            {section("removed", t("removed", { count: count("removed") }), t("removedHint"))}
                        </div>
                    </ScrollArea>
                )}
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
                    <Button onClick={() => void apply()} disabled={busy || !changes || selected.size === 0}>
                        {t("apply", { count: selected.size })}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
