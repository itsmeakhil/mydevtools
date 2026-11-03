"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
import { useToolSidebarPanel, useToolSidebarRail } from "@/components/tools/tool-sidebar"
import { AddBucketDialog } from "./add-bucket-dialog"

type Props = {
    encryptionKey: CryptoKey
}

function ProviderIcon({ provider, className }: { provider: string; className?: string }) {
    if (provider === "aws") return <IconBrandAws className={cn("size-4 shrink-0 text-muted-foreground", className)} />
    if (provider === "digitalocean") return <IconCloud className={cn("size-4 shrink-0 text-muted-foreground", className)} />
    return <IconServer className={cn("size-4 shrink-0 text-muted-foreground", className)} />
}

function ProviderBadge({ provider }: { provider: string }) {
    const labels: Record<string, string> = { aws: "AWS", digitalocean: "DO", custom: "S3" }
    return (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 bg-foreground/[0.06] text-muted-foreground">
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
    const panel = useToolSidebarPanel()

    // Connections stay switchable from the collapsed rail.
    useToolSidebarRail(
        "connections",
        useMemo(
            () =>
                connections.slice(0, 8).map((c) => ({
                    id: c.id,
                    label: c.name,
                    icon: IconBucket,
                    active: c.id === activeConnectionId,
                    onSelect: () => setActiveConnection(c.id),
                })),
            [connections, activeConnectionId, setActiveConnection],
        ),
    )

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

    // Header (icon, title, collapse) is owned by ToolSidebarLayout in
    // app/app/s3-drive/page.tsx — this renders the panel body only.
    return (
        <>
            {connections.length > 0 && (
                <p className="shrink-0 px-3 pt-2 text-[11px] text-muted-foreground/70 tabular-nums">
                    {connections.length} connection{connections.length !== 1 ? "s" : ""}
                </p>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto p-2 space-y-0.5">
                    {connections.length === 0 && (
                        <div className="flex flex-col items-center gap-3 px-3 py-8 text-center">
                            <IconBucket className="size-8 text-muted-foreground/60" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium">No buckets yet</p>
                                <p className="text-xs text-muted-foreground max-w-[160px] leading-relaxed">
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
                                    "group flex items-center gap-2.5 min-h-8 rounded-lg px-2.5 py-1.5 cursor-default text-[13px] transition-colors duration-150",
                                    isActive
                                        ? "bg-primary/[0.12] text-foreground"
                                        : "hover:bg-foreground/[0.05] text-foreground",
                                )}
                                onClick={() => {
                                    setActiveConnection(conn.id)
                                    // On mobile the panel is a sheet covering the
                                    // browser — close it so the pick is visible.
                                    if (panel?.isOverlay) panel.close()
                                }}
                            >
                                <ProviderIcon provider={conn.provider} className={cn(isActive && "text-primary")} />

                                <span className="flex-1 min-w-0">
                                    <span className={cn(
                                        "block truncate text-[13px] leading-snug",
                                        isActive ? "font-medium" : "font-normal",
                                    )}>
                                        {conn.name}
                                    </span>
                                    {connSubtitle(conn) && (
                                        <span className="flex items-center gap-1.5 mt-0.5">
                                            <span className="block truncate text-[11px] text-muted-foreground leading-tight">
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

            {/* Footer */}
            {connections.length > 0 && (
                <div className="mt-auto shrink-0 border-t border-border px-2 py-2">
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
        </>
    )
}
