"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import useAuth from "@/utils/useAuth"
import { useMasterKeyStore } from "@/store/master-key-store"
import { useS3DriveStore } from "@/store/s3-drive-store"
import { listConnections } from "@/lib/s3-drive-api"
import { decryptData } from "@/lib/encryption"
import { BucketSidebar } from "@/components/s3-drive/bucket-sidebar"
import { FileBrowser } from "@/components/s3-drive/file-browser"
import { IconBucket } from "@tabler/icons-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function S3DrivePage() {
    const { user, loading: authLoading } = useAuth(true)
    const { encryptionKey, isUnlocked } = useMasterKeyStore()
    const { connections, activeConnectionId, setConnections } = useS3DriveStore()
    const [booting, setBooting] = useState(true)
    const loadedRef = useRef(false)

    useEffect(() => {
        if (!encryptionKey || loadedRef.current) return
        loadedRef.current = true
        loadSavedConnections(encryptionKey)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [encryptionKey])

    async function loadSavedConnections(key: CryptoKey) {
        setBooting(true)
        try {
            const rows = await listConnections()
            const decrypted = await Promise.all(
                rows.map(async (row) => {
                    try {
                        const plain = await decryptData(key, row.encryptedData, row.iv)
                        const creds = JSON.parse(plain)
                        return { ...row, credentials: creds }
                    } catch {
                        return null
                    }
                }),
            )
            setConnections(decrypted.filter((c): c is NonNullable<typeof c> => c !== null))
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to load connections")
        } finally {
            setBooting(false)
        }
    }

    if (authLoading || booting) {
        return (
            <div className="flex h-full">
                <div className="w-56 border-r p-3 space-y-2 shrink-0">
                    <Skeleton className="h-6 w-24" />
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
                <div className="flex-1 p-6 space-y-3">
                    <Skeleton className="h-8 w-full" />
                    {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
            </div>
        )
    }

    if (!isUnlocked || !encryptionKey) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-2">
                    <IconBucket className="size-12 mx-auto text-muted-foreground opacity-40" />
                    <p className="text-sm text-muted-foreground">Unlock your vault to access S3 Drive</p>
                </div>
            </div>
        )
    }

    const activeConn = connections.find((c) => c.id === activeConnectionId) ?? null

    return (
        <div className="flex h-full overflow-hidden">
            <div className={cn("w-56 shrink-0 overflow-hidden flex flex-col")}>
                <BucketSidebar encryptionKey={encryptionKey} />
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                {activeConn ? (
                    <FileBrowser
                        key={activeConn.id}
                        credentials={activeConn.credentials}
                        connectionName={activeConn.name}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-3 px-6">
                        <div className="rounded-full bg-muted/60 p-5">
                            <IconBucket className="size-10 text-muted-foreground opacity-50" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">
                                {connections.length === 0 ? "No buckets connected" : "Select a bucket"}
                            </p>
                            <p className="text-xs text-muted-foreground max-w-xs">
                                {connections.length === 0
                                    ? "Add an S3 or DigitalOcean Spaces bucket from the sidebar to start browsing files."
                                    : "Choose a bucket from the sidebar to browse its contents."}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
