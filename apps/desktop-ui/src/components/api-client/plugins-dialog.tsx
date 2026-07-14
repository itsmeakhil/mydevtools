"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Trash2, Plus, Power, PowerOff } from "lucide-react"
import { loadPlugins, savePlugins, instantiatePlugin, type PluginSource } from "@/lib/plugins/plugin-runtime"
import { toast } from "sonner"

const CodeEditor = dynamic(() => import("@/components/ui/code-editor"), {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse bg-muted/30" />,
})
const MemoCodeEditor = React.memo(CodeEditor)

interface PluginsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

const SAMPLE = `// Sample plugin — runs in your browser only.
plugin.onBeforeSend((req) => {
    req.headers["X-From-Plugin"] = "hello"
    return req
})
plugin.onAfterResponse(({ response }) => {
    console.log("status", response.status, "in", response.timeMs, "ms")
})
plugin.provideCommand({ label: "Print env", description: "Stub command" })
`

export function PluginsDialog({ open, onOpenChange }: PluginsDialogProps) {
    const [plugins, setPlugins] = React.useState<PluginSource[]>([])
    const [draftName, setDraftName] = React.useState("")
    const [draftSource, setDraftSource] = React.useState(SAMPLE)

    React.useEffect(() => { if (open) setPlugins(loadPlugins()) }, [open])

    const persist = (next: PluginSource[]) => {
        setPlugins(next)
        savePlugins(next)
    }

    const addPlugin = () => {
        if (!draftName.trim()) return
        const next: PluginSource = {
            id: crypto.randomUUID(),
            name: draftName.trim(),
            source: draftSource,
            enabled: true,
            createdAt: Date.now(),
        }
        const result = instantiatePlugin(next)
        if (result.error) { toast.error(`Plugin error: ${result.error}`); return }
        persist([...plugins, next])
        setDraftName(""); setDraftSource(SAMPLE)
        toast.success(`Plugin "${next.name}" added`)
    }

    const toggle = (id: string) => persist(plugins.map((p) => p.id === id ? { ...p, enabled: !p.enabled } : p))
    const remove = (id: string) => persist(plugins.filter((p) => p.id !== id))

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[760px] max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Plugins</DialogTitle>
                    <DialogDescription>
                        User JS that hooks into <code className="font-mono bg-muted/40 px-1 rounded">onBeforeSend</code>,{" "}
                        <code className="font-mono bg-muted/40 px-1 rounded">onAfterResponse</code>, and{" "}
                        <code className="font-mono bg-muted/40 px-1 rounded">provideCommand</code>.
                        Runs locally in your browser only.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[200px]">
                    <div className="space-y-1">
                        {plugins.length === 0 && (
                            <div className="text-center text-xs text-muted-foreground py-4">
                                No plugins installed yet.
                            </div>
                        )}
                        {plugins.map((p) => (
                            <div key={p.id} className="border rounded-lg p-2 flex items-center gap-2 text-xs">
                                <span className="font-bold flex-1 truncate">{p.name}</span>
                                <span className="text-[10px] text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</span>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggle(p.id)} title={p.enabled ? "Disable" : "Enable"}>
                                    {p.enabled ? <Power className="h-3.5 w-3.5 text-emerald-500" /> : <PowerOff className="h-3.5 w-3.5 text-muted-foreground" />}
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(p.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                <div className="space-y-2 flex-1 flex flex-col min-h-0">
                    <Input placeholder="Plugin name" value={draftName} onChange={(e) => setDraftName(e.target.value)} className="h-9" />
                    <div className="flex-1 min-h-[200px] border rounded-lg overflow-hidden">
                        <MemoCodeEditor value={draftSource} onChange={setDraftSource} language="javascript" />
                    </div>
                    <Button onClick={addPlugin} disabled={!draftName.trim()}>
                        <Plus className="h-4 w-4 mr-1" /> Install plugin
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
