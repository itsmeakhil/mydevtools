"use client"

import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Trash2, Copy, Globe, Loader2 } from "lucide-react"
import { backendFetch } from "@/lib/backend-auth"
import { toast } from "sonner"

interface PublicMock {
    mock_id: string
    name: string
    collection_id?: string | null
    created_at: number
    items: unknown[]
}

interface PublicMocksDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function PublicMocksDialog({ open, onOpenChange }: PublicMocksDialogProps) {
    const [mocks, setMocks] = React.useState<PublicMock[]>([])
    const [loading, setLoading] = React.useState(false)

    const refresh = React.useCallback(async () => {
        setLoading(true)
        try {
            const res = await backendFetch("/api/backend/api-client/public-mocks")
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            setMocks(await res.json())
        } catch (e) {
            toast.error(`Load failed: ${(e as Error).message}`)
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => { if (open) refresh() }, [open, refresh])

    const handleDelete = async (mockId: string) => {
        try {
            const res = await backendFetch(`/api/backend/api-client/public-mocks/${mockId}`, { method: "DELETE" })
            if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`)
            toast.success("Mock unpublished")
            setMocks((prev) => prev.filter((m) => m.mock_id !== mockId))
        } catch (e) {
            toast.error(`Unpublish failed: ${(e as Error).message}`)
        }
    }

    const copy = async (mockId: string) => {
        if (typeof window === "undefined") return
        const url = `${window.location.origin}/api/mock/public/${mockId}/`
        try {
            await navigator.clipboard.writeText(url)
            toast.success("URL copied")
        } catch { toast.error("Clipboard write failed") }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[680px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Public mocks</DialogTitle>
                    <DialogDescription>
                        Snapshots you&apos;ve published as anonymously-callable endpoints.
                        Unpublish to revoke the URL.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1 min-h-0">
                    <div className="p-1 space-y-2">
                        {loading && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                            </div>
                        )}
                        {!loading && mocks.length === 0 && (
                            <div className="text-center text-xs text-muted-foreground py-10">
                                No published mocks yet. Right-click any collection → &quot;Publish as public mock&quot;.
                            </div>
                        )}
                        {mocks.map((m) => (
                            <div key={m.mock_id} className="border rounded-lg p-3 bg-card space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-sm">{m.name}</span>
                                    <span className="font-mono text-[10px] text-muted-foreground">{m.mock_id.slice(0, 12)}…</span>
                                    <span className="text-[10px] text-muted-foreground ml-auto">
                                        {new Date(m.created_at).toLocaleString()}
                                    </span>
                                    <Button size="sm" variant="ghost" onClick={() => copy(m.mock_id)}>
                                        <Copy className="h-3.5 w-3.5 mr-1" /> URL
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleDelete(m.mock_id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
