"use client"

import { Skeleton } from "@/components/ui/skeleton"

/**
 * Shown while the master-key restorer is still running on app boot.
 * Generic shell — fine for every critical app since restore finishes in
 * milliseconds and the user never reads it.
 */
export function VaultRestoringSkeleton() {
    return (
        <div className="h-full flex flex-col container mx-auto px-4 md:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6 shrink-0">
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-9 w-36" />
            </div>
            <div className="flex gap-3 mb-6">
                <Skeleton className="h-9 flex-1 max-w-sm" />
                <Skeleton className="h-9 w-24" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-36 w-full rounded-xl" />
                ))}
            </div>
        </div>
    )
}
