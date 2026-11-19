"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { loadPlugins, savePlugins, type PluginSource } from "@/lib/plugins/plugin-runtime"

// Code, not prose — same in every locale.
const SOURCE_PLACEHOLDER = `plugin.onBeforeSend((req) => {\n  req.headers["X-Trace"] = "1"\n  return req\n})`

/** Installed plugins: add, enable/disable, delete. `onChange` reloads the running set. */
export function PluginsDialog({ open, onOpenChange, onChange }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    onChange: () => void
}) {
    const t = useTranslations("ApiClient.plugins")
    const [plugins, setPlugins] = React.useState<PluginSource[]>([])
    const [name, setName] = React.useState("")
    const [source, setSource] = React.useState("")

    React.useEffect(() => { if (open) setPlugins(loadPlugins()) }, [open])

    const commit = (next: PluginSource[]) => {
        setPlugins(next)
        savePlugins(next)
        onChange()
    }

    const add = () => {
        if (!name.trim() || !source.trim()) return
        commit([...plugins, { id: crypto.randomUUID(), name: name.trim(), source, enabled: true, createdAt: Date.now() }])
        setName("")
        setSource("")
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                    <DialogDescription>{t("description")}</DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0 overflow-auto rounded-md border bg-card">
                    {plugins.length === 0 ? (
                        <p className="p-4 text-sm text-muted-foreground">{t("empty")}</p>
                    ) : (
                        <ul>
                            {plugins.map((p) => (
                                <li key={p.id} className="flex items-center gap-3 border-b last:border-0 px-3 py-2">
                                    <span className="flex-1 truncate text-sm">{p.name}</span>
                                    <Switch
                                        checked={p.enabled}
                                        aria-label={t("toggle", { name: p.name })}
                                        onCheckedChange={(enabled) => commit(plugins.map((x) => x.id === p.id ? { ...x, enabled } : x))}
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8"
                                        aria-label={t("delete", { name: p.name })}
                                        onClick={() => commit(plugins.filter((x) => x.id !== p.id))}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="grid gap-2 pt-2">
                    <Label htmlFor="plugin-name">{t("name")}</Label>
                    <Input id="plugin-name" value={name} onChange={(e) => setName(e.target.value)} />
                    <Label htmlFor="plugin-source">{t("source")}</Label>
                    <Textarea
                        id="plugin-source"
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        rows={6}
                        className="font-mono text-xs"
                        placeholder={SOURCE_PLACEHOLDER}
                        spellCheck={false}
                    />
                    <div>
                        <Button size="sm" onClick={add} disabled={!name.trim() || !source.trim()}>{t("add")}</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
