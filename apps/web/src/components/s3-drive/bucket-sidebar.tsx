"use client"

import { useState } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { IconBucket, IconPlus, IconDots, IconPencil, IconTrash, IconBrandAws, IconCloud } from "@tabler/icons-react"
import { deleteConnection } from "@/lib/s3-drive-api"
import { useS3DriveStore, type DecryptedConnection } from "@/store/s3-drive-store"
import { AddBucketDialog } from "./add-bucket-dialog"

type Props = {
    encryptionKey: CryptoKey
}

function ProviderIcon({ provider }: { provider: string }) {
    if (provider === "aws") return <IconBrandAws className="size-4 shrink-0 text-orange-400" />
    if (provider === "digitalocean") return <IconCloud className="size-4 shrink-0 text-blue-400" />
    return <IconBucket className="size-4 shrink-0 text-muted-foreground" />
}

function connSubtitle(conn: DecryptedConnection): string {
    const creds = conn.credentials
    if (creds.endpoint) {
        try { return new URL(creds.endpoint).hostname } catch { return creds.endpoint }
    }
    return creds.region || ""
}

export function BucketSidebar({ encryptionKey }: Props) {
    const { connections, activeConnectionId, setActiveConnection, removeConnection } = useS3DriveStore()
    const [addOpen, setAddOpen] = useState(false)
    const [editTarget, setEditTarget] = useState<DecryptedConnection | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<DecryptedConnection | null>(null)
    const [deleting, setDeleting] = useState(false)

    async function onDelete() {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            await deleteConnection(deleteTarget.id)
            removeConnection(deleteTarget.id)
            toast.success("Connection removed")
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to delete")
        } finally {
            setDeleting(false)
            setDeleteTarget(null)
        }
    }

    return (
        <div className="flex flex-col h-full border-r bg-sidebar">
            <div className="flex items-center justify-between px-3 py-3 border-b shrink-0">
                <span className="text-sm font-semibold text-foreground">Buckets</span>
                <Button size="icon" variant="ghost" className="size-7" onClick={() => setAddOpen(true)}>
                    <IconPlus className="size-4" />
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-2 space-y-0.5">
                    {connections.length === 0 && (
                        <div className="flex flex-col items-center gap-2 px-2 py-6 text-center">
                            <IconBucket className="size-8 text-muted-foreground opacity-30" />
                            <p className="text-xs text-muted-foreground">No buckets yet</p>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5 mt-1"
                                onClick={() => setAddOpen(true)}
                            >
                                <IconPlus className="size-3.5" />
                                Add bucket
                            </Button>
                        </div>
                    )}
                    {connections.map((conn) => (
                        <div
                            key={conn.id}
                            className={cn(
                                "group flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer text-sm",
                                activeConnectionId === conn.id
                                    ? "bg-accent text-accent-foreground"
                                    : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
                            )}
                            onClick={() => setActiveConnection(conn.id)}
                        >
                            <ProviderIcon provider={conn.provider} />
                            <span className="flex-1 min-w-0">
                                <span className="block truncate">{conn.name}</span>
                                {connSubtitle(conn) && (
                                    <span className="block truncate text-[10px] text-muted-foreground/60 leading-tight">{connSubtitle(conn)}</span>
                                )}
                            </span>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="size-5 opacity-0 group-hover:opacity-100 shrink-0"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <IconDots className="size-3.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-36">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditTarget(conn) }}>
                                        <IconPencil className="size-4 mr-2" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(conn) }}
                                    >
                                        <IconTrash className="size-4 mr-2" /> Remove
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            <AddBucketDialog
                open={addOpen || !!editTarget}
                onClose={() => { setAddOpen(false); setEditTarget(null) }}
                encryptionKey={encryptionKey}
                editing={editTarget}
            />

            <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove connection?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This removes the saved credentials for <strong>{deleteTarget?.name}</strong>. No files in the bucket are affected.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {deleting ? "Removing…" : "Remove"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
