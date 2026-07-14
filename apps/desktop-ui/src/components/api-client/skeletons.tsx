"use client"

import { Skeleton } from "@/components/ui/skeleton"

export function CollectionsSidebarSkeleton() {
    return (
        <div className="space-y-2 p-3" role="status" aria-busy="true" aria-label="Loading collections">
            {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-md" />
            ))}
        </div>
    )
}

export function HistoryListSkeleton() {
    return (
        <div className="space-y-2 p-3" role="status" aria-busy="true" aria-label="Loading history">
            {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
        </div>
    )
}

export function ResponsePanelSkeleton() {
    return (
        <div className="space-y-2 p-4" role="status" aria-busy="true" aria-label="Loading response">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-5 w-1/2" />
        </div>
    )
}
