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
import { IconBucket, IconPlus, IconDots, IconPencil, IconTrash, IconBrandAws, IconCloud, IconServer } from "@tabler/icons-react"
import { deleteConnection } from "@/lib/s3-drive-api"
import { useS3DriveStore, type DecryptedConnection } from "@/store/s3-drive-store"
import { AddBucketDialog } from "./add-bucket-dialog"

type Props = {
    encryptionKey: CryptoKey
}

function ProviderIcon({ provider, className }: { provider: string; className?: string }) {
    if (provider === "aws") return <IconBrandAws className={cn("size-4 shrink-0 text-orange-400", className)} />
    if (provider === "digitalocean") return <IconCloud className={cn("size-4 shrink-0 text-blue-400", className)} />
    return <IconServer className={cn("size-4 shrink-0 text-violet-400", className)} />
}

function ProviderBadge({ provider }: { provider: string }) {
    const labels: Record<string, string> = { aws: "AWS", digitalocean: "DO", custom: "S3" }
    const colors: Record<string, string> = {
        aws: "bg-orange-500/10 text-orange-500",
        digitalocean: "bg-blue-500/10 text-blue-400",
        custom: "bg-violet-500/10 text-violet-400",
    }
    return (
        <span className={cn("text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0", colors[provider] ?? colors.custom)}>
            {labels[provider] ?? "S3"}
        </span>
    )
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
            {/* Header */}
            <div className="shrink-0 px-3 pt-3 pb-2">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <div className="size-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
                            <IconBucket className="size-3.5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <span className="text-sm font-semibold text-foreground tracking-tight">Buckets</span>
                    </div>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                        onClick={() => setAddOpen(true)}
                    >
                        <IconPlus className="size-4" />
                    </Button>
                </div>
                {connections.length > 0 && (
                    <p className="text-[10px] text-muted-foreground/60 pl-9">
                        {connections.length} connection{connections.length !== 1 ? "s" : ""}
                    </p>
                )}
            </div>

            <div className="mx-3 border-b border-border/50" />

            <ScrollArea className="flex-1">
                <div className="p-2 space-y-0.5">
                    {connections.length === 0 && (
                        <div className="flex flex-col items-center gap-3 px-3 py-8 text-center">
                            <div className="relative">
                                <div className="size-16 rounded-2xl bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center">
                                    <IconBucket className="size-8 text-muted-foreground/30" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 size-6 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-sidebar">
                                    <IconPlus className="size-3 text-primary" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-foreground/70">No buckets yet</p>
                                <p className="text-[10px] text-muted-foreground/60 max-w-[140px] leading-relaxed">
                                    Connect your AWS S3 or DigitalOcean Spaces bucket to start browsing.
                                </p>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5 mt-1 rounded-lg"
                                onClick={() => setAddOpen(true)}
                            >
                                <IconPlus className="size-3.5" />
                                Add bucket
                            </Button>
                        </div>
                    )}
                    {connections.map((conn) => {
                        const isActive = activeConnectionId === conn.id
                        return (
                            <div
                                key={conn.id}
                                className={cn(
                                    "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 cursor-pointer text-sm transition-all duration-150",
                                    isActive
                                        ? "bg-primary/8 text-foreground shadow-sm ring-1 ring-primary/10"
                                        : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
                                )}
                                onClick={() => setActiveConnection(conn.id)}
                            >
                                {/* Active indicator line */}
                                <div className={cn(
                                    "w-[3px] self-stretch rounded-full shrink-0 transition-colors duration-200",
                                    isActive ? "bg-primary" : "bg-transparent group-hover:bg-border",
                                )} />

                                <ProviderIcon provider={conn.provider} className={cn(isActive && "text-primary")} />

                                <span className="flex-1 min-w-0">
                                    <span className={cn(
                                        "block truncate text-[13px] leading-snug",
                                        isActive ? "font-semibold" : "font-medium",
                                    )}>
                                        {conn.name}
                                    </span>
                                    {connSubtitle(conn) && (
                                        <span className="flex items-center gap-1.5 mt-0.5">
                                            <span className="block truncate text-[10px] text-muted-foreground/50 leading-tight">
                                                {connSubtitle(conn)}
                                            </span>
                                        </span>
                                    )}
                                </span>

                                <ProviderBadge provider={conn.provider} />

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className={cn(
                                                "size-6 rounded-md shrink-0 transition-opacity duration-100",
                                                isActive ? "opacity-60 hover:opacity-100" : "opacity-0 group-hover:opacity-100",
                                            )}
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
                        )
                    })}
                </div>
            </ScrollArea>

            {/* Footer */}
            {connections.length > 0 && (
                <div className="shrink-0 border-t border-border/50 px-3 py-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground rounded-lg justify-center"
                        onClick={() => setAddOpen(true)}
                    >
                        <IconPlus className="size-3.5" />
                        Add connection
                    </Button>
                </div>
            )}

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
