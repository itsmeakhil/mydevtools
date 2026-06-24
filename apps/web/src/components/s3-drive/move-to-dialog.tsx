"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { IconChevronRight, IconFolder, IconLoader2 } from "@tabler/icons-react"
import { listObjects, moveObject, type S3Credentials } from "@/lib/s3-drive-api"
import { moveFolderRecursive } from "./utils"

export function MoveToDialog({
    open, items, credentials, currentPrefix, onClose, onMoved,
}: {
    open: boolean
    items: { key: string; isFolder: boolean }[]
    credentials: S3Credentials
    currentPrefix: string
    onClose: () => void
    onMoved: () => void
}) {
    const [targetPrefix, setTargetPrefix] = useState("")
    const [folders, setFolders] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [moving, setMoving] = useState(false)

    useEffect(() => { if (open) setTargetPrefix("") }, [open])

    useEffect(() => {
        if (!open) return
        setLoading(true)
        listObjects(credentials, targetPrefix)
            .then((res) => setFolders(res.prefixes))
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [open, credentials, targetPrefix])

    function canMove() {
        if (targetPrefix === currentPrefix) return false
        return !items.some((item) => item.isFolder && targetPrefix.startsWith(item.key))
    }

    async function handleMove() {
        setMoving(true)
        try {
            for (const item of items) {
                const basename = item.key.replace(/\/$/, "").split("/").pop()!
                if (item.isFolder) {
                    await moveFolderRecursive(credentials, item.key, targetPrefix + basename + "/")
                } else {
                    await moveObject(credentials, item.key, targetPrefix + basename)
                }
            }
            toast.success(`Moved ${items.length} item${items.length > 1 ? "s" : ""}`)
            onMoved()
            onClose()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Move failed")
        } finally {
            setMoving(false)
        }
    }

    const breadcrumbs = targetPrefix ? targetPrefix.replace(/\/$/, "").split("/") : []

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Move {items.length} item{items.length > 1 ? "s" : ""} to…</DialogTitle>
                </DialogHeader>
                <div className="flex items-center gap-1 flex-wrap text-xs text-muted-foreground min-h-5">
                    <button className="hover:text-foreground hover:underline" onClick={() => setTargetPrefix("")}>
                        Root
                    </button>
                    {breadcrumbs.map((part, i) => {
                        const prefix = breadcrumbs.slice(0, i + 1).join("/") + "/"
                        return (
                            <span key={prefix} className="flex items-center gap-1">
                                <IconChevronRight className="size-3" />
                                <button className="hover:text-foreground hover:underline" onClick={() => setTargetPrefix(prefix)}>
                                    {part}
                                </button>
                            </span>
                        )
                    })}
                </div>
                <div className="border rounded-lg overflow-hidden" style={{ minHeight: "8rem" }}>
                    <ScrollArea className="max-h-56">
                        {loading ? (
                            <div className="flex items-center justify-center h-32">
                                <IconLoader2 className="size-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : folders.length === 0 ? (
                            <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
                                No subfolders here
                            </div>
                        ) : (
                            <div className="p-1">
                                {folders.map((f) => {
                                    const name = f.slice(targetPrefix.length).replace(/\/$/, "")
                                    const disabled = items.some((item) => item.isFolder && f.startsWith(item.key))
                                    return (
                                        <button
                                            key={f}
                                            disabled={disabled}
                                            className={cn(
                                                "flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-left transition-colors",
                                                disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-muted",
                                            )}
                                            onClick={() => setTargetPrefix(f)}
                                        >
                                            <IconFolder className="size-4 text-amber-500 shrink-0" />
                                            <span className="truncate flex-1">{name}</span>
                                            <IconChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </ScrollArea>
                </div>
                <p className="text-xs text-muted-foreground">
                    Destination: <span className="font-mono text-foreground">{targetPrefix || "/"}</span>
                </p>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={moving}>Cancel</Button>
                    <Button onClick={handleMove} disabled={!canMove() || moving}>
                        {moving ? "Moving…" : "Move here"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
