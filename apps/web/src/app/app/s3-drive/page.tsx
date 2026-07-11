"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import useAuth from "@/utils/useAuth"
import { useMasterKeyStore } from "@/store/master-key-store"
import { useVaultGuard } from "@/hooks/use-vault-guard"
import { VaultLockedPlaceholder } from "@/components/vault-locked-placeholder"
import { VaultRestoringSkeleton } from "@/components/vault-restoring-skeleton"
import { useS3DriveStore } from "@/store/s3-drive-store"
import { listConnections } from "@/lib/s3-drive-api"
import { decryptData } from "@/lib/encryption"
import { BucketSidebar } from "@/components/s3-drive/bucket-sidebar"
import { FileBrowser } from "@/components/s3-drive/file-browser"
import { IconBucket, IconCloud, IconArrowRight } from "@tabler/icons-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { DesktopOnlineGate } from "@/components/desktop/desktop-online-gate"

export default function S3DrivePage() {
    return (
        <DesktopOnlineGate toolName="S3 Drive">
            <S3DriveInner />
        </DesktopOnlineGate>
    )
}

function S3DriveInner() {
    const { user, loading: authLoading } = useAuth(true)
    const { encryptionKey } = useMasterKeyStore()
    const { isUnlocked, isRestoring } = useVaultGuard()
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
                {/* Sidebar skeleton */}
                <div className="w-56 border-r p-3 space-y-3 shrink-0 bg-sidebar">
                    <div className="flex items-center gap-2 mb-4">
                        <Skeleton className="size-7 rounded-lg" />
                        <Skeleton className="h-4 w-16" />
                    </div>
                    <div className="border-b border-border/50 -mx-3" />
                    <div className="space-y-1.5 pt-1">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-2.5 px-2 py-2">
                                <Skeleton className="w-[3px] h-8 rounded-full" />
                                <Skeleton className="size-4 rounded" />
                                <div className="flex-1 space-y-1.5">
                                    <Skeleton className="h-3.5 w-24" />
                                    <Skeleton className="h-2.5 w-16" />
                                </div>
                                <Skeleton className="h-4 w-8 rounded-md" />
                            </div>
                        ))}
                    </div>
                </div>
                {/* Content skeleton */}
                <div className="flex-1 flex flex-col">
                    <div className="flex items-center gap-2 px-3 py-2 border-b">
                        <Skeleton className="size-8 rounded-lg" />
                        <Skeleton className="h-4 w-32" />
                        <div className="flex-1" />
                        <Skeleton className="h-8 w-44 rounded-lg" />
                        <Skeleton className="size-8 rounded-lg" />
                        <Skeleton className="size-8 rounded-lg" />
                    </div>
                    <div className="p-4 space-y-1">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                                <Skeleton className="size-[18px] rounded" />
                                <Skeleton className="size-8 rounded-lg" />
                                <Skeleton className="h-4 flex-1 max-w-xs" />
                                <Skeleton className="h-3 w-12 hidden md:block" />
                                <Skeleton className="h-3 w-16 hidden sm:block" />
                                <Skeleton className="h-3 w-20 hidden lg:block" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (isRestoring) return <VaultRestoringSkeleton />
    if (!isUnlocked || !encryptionKey) return <VaultLockedPlaceholder appName="S3 Drive" />

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
                    <div className="flex flex-col items-center justify-center h-full text-center gap-4 px-6">
                        {/* Decorative illustration */}
                        <div className="relative">
                            <div className="size-24 rounded-3xl bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 flex items-center justify-center">
                                <IconCloud className="size-12 text-blue-500/40" />
                            </div>
                            <div className="absolute -bottom-1.5 -right-1.5 size-10 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 flex items-center justify-center ring-4 ring-background">
                                <IconBucket className="size-5 text-amber-500/60" />
                            </div>
                        </div>
                        <div className="space-y-1.5 max-w-xs">
                            <p className="text-sm font-semibold text-foreground">
                                {connections.length === 0 ? "No buckets connected" : "Select a bucket"}
                            </p>
                            <p className="text-xs text-muted-foreground/70 leading-relaxed">
                                {connections.length === 0
                                    ? "Add an S3-compatible bucket from the sidebar to start browsing, uploading, and managing your files."
                                    : "Choose a bucket from the sidebar to browse its contents."}
                            </p>
                        </div>
                        {connections.length === 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-primary/60 mt-1 animate-pulse">
                                <IconArrowRight className="size-3.5 rotate-180" />
                                <span>Start by adding a bucket</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
