"use client"

import * as React from "react"
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    startSession, stopSession, getActiveSessionId, listSessions, deleteSession,
    replaySession, type RecordedSession,
} from "@/lib/recorder/traffic-recorder"
import { Circle, Square, Play, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface RecorderDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

interface ReplayRow {
    url: string
    originalStatus: number
    replayStatus: number
    diff: boolean
}

export function RecorderDialog({ open, onOpenChange }: RecorderDialogProps) {
    const [sessions, setSessions] = React.useState<RecordedSession[]>([])
    const [activeId, setActiveId] = React.useState<string | null>(null)
    const [name, setName] = React.useState("")
    const [replayResults, setReplayResults] = React.useState<ReplayRow[]>([])
    const [replaying, setReplaying] = React.useState(false)

    const refresh = React.useCallback(() => {
        setSessions(listSessions())
        setActiveId(getActiveSessionId())
    }, [])

    React.useEffect(() => { if (open) refresh() }, [open, refresh])

    const onStart = () => {
        const trimmed = name.trim() || `Session ${new Date().toLocaleTimeString()}`
        startSession(trimmed)
        setName("")
        refresh()
        toast.success("Recording started — fire requests to capture")
    }

    const onStop = () => {
        stopSession()
        refresh()
        toast.success("Recording stopped")
    }

    const onReplay = async (session: RecordedSession) => {
        setReplaying(true)
        setReplayResults([])
        const rows: ReplayRow[] = []
        const result = await replaySession(
            session,
            async (req) => {
                const t0 = performance.now()
                const res = await fetch("/api/proxy", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        method: req.method,
                        url: req.url,
                        headers: req.headers,
                        body: req.body,
                    }),
                })
                const data = await res.json() as { status?: number }
                return { status: data.status ?? 0, timeMs: performance.now() - t0 }
            },
            (orig, replay) => {
                rows.push({
                    url: orig.request.url,
                    originalStatus: orig.response.status,
                    replayStatus: replay.status,
                    diff: replay.diff,
                })
                setReplayResults([...rows])
            },
        )
        setReplaying(false)
        toast.success(`Replay done — ${result.matched} match, ${result.mismatched} mismatch`)
    }

    const onDelete = (id: string) => {
        deleteSession(id)
        refresh()
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[760px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Capture &amp; replay</DialogTitle>
                    <DialogDescription>
                        Record request/response pairs as a session, then replay against a different environment to spot regressions.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-end gap-2">
                    <div className="flex-1">
                        <Label className="text-xs">Session name</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My capture" disabled={!!activeId} />
                    </div>
                    {activeId ? (
                        <Button onClick={onStop} variant="destructive" size="sm">
                            <Square className="h-3 w-3 mr-1" /> Stop
                        </Button>
                    ) : (
                        <Button onClick={onStart} size="sm">
                            <Circle className="h-3 w-3 mr-1 fill-red-500 text-red-500" /> Record
                        </Button>
                    )}
                </div>

                <div className="flex-1 overflow-auto border rounded text-xs">
                    {sessions.length === 0 ? (
                        <div className="text-muted-foreground p-3">No sessions yet.</div>
                    ) : (
                        <table className="w-full">
                            <thead className="sticky top-0 bg-card">
                                <tr className="text-left">
                                    <th className="p-2 font-bold uppercase text-[10px]">Name</th>
                                    <th className="p-2 font-bold uppercase text-[10px]">Exchanges</th>
                                    <th className="p-2 font-bold uppercase text-[10px]">Created</th>
                                    <th className="p-2 font-bold uppercase text-[10px]"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.map((s) => (
                                    <tr key={s.id} className="border-t">
                                        <td className="p-2 font-mono">
                                            {s.name}
                                            {s.id === activeId && <span className="ml-2 text-red-500">● rec</span>}
                                        </td>
                                        <td className="p-2">{s.exchanges.length}</td>
                                        <td className="p-2">{new Date(s.createdAt).toLocaleString()}</td>
                                        <td className="p-2 text-right space-x-1">
                                            <Button size="sm" variant="outline" disabled={replaying || s.exchanges.length === 0} onClick={() => onReplay(s)}>
                                                <Play className="h-3 w-3" />
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => onDelete(s.id)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {replayResults.length > 0 && (
                    <div className="border rounded overflow-auto max-h-[200px] text-xs">
                        <table className="w-full">
                            <thead className="sticky top-0 bg-card">
                                <tr className="text-left">
                                    <th className="p-2 font-bold uppercase text-[10px]">URL</th>
                                    <th className="p-2 font-bold uppercase text-[10px]">Original</th>
                                    <th className="p-2 font-bold uppercase text-[10px]">Replay</th>
                                </tr>
                            </thead>
                            <tbody>
                                {replayResults.map((r, i) => (
                                    <tr key={i} className={r.diff ? "bg-red-500/10" : ""}>
                                        <td className="p-2 font-mono truncate max-w-[400px]">{r.url}</td>
                                        <td className="p-2">{r.originalStatus}</td>
                                        <td className="p-2">{r.replayStatus}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
