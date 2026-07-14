"use client"

import { useEffect } from "react"
import BookmarksManager from "@/components/bookmarks/bookmarks-manager";
import useAuth from "@/utils/useAuth";
import { useTranslations } from "next-intl";
import { useBookmarkStore } from "@/store/bookmark-store";
import { Skeleton } from "@/components/ui/skeleton";

export default function BookmarksPage() {
    const t = useTranslations("Bookmarks.page");
    const { user, loading } = useAuth(true);
    const { syncFromBackend, isLoading: bookmarksLoading, hasSynced } = useBookmarkStore();

    useEffect(() => {
        if (!user) return;
        void syncFromBackend();
    }, [user, syncFromBackend]);

    if (loading || (bookmarksLoading && !hasSynced)) {
        return (
            <div className="flex h-full w-full overflow-hidden bg-background">
                {/* Sidebar skeleton */}
                <div className="hidden md:flex w-72 border-r border-border/40 flex-col p-4 gap-2">
                    <Skeleton className="h-6 w-24 mb-3" />
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-8 w-full rounded-md" />
                    ))}
                </div>
                {/* Main content skeleton */}
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="h-16 border-b border-border/40 px-4 flex items-center gap-4">
                        <Skeleton className="h-9 flex-1 max-w-xl" />
                        <div className="hidden md:flex gap-2 ml-auto">
                            <Skeleton className="h-9 w-28" />
                            <Skeleton className="h-9 w-20" />
                            <Skeleton className="h-9 w-24" />
                        </div>
                    </div>
                    <div className="px-6 pt-6 pb-2">
                        <Skeleton className="h-7 w-36 mb-2" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {[...Array(8)].map((_, i) => (
                            <Skeleton key={i} className="h-32 w-full rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return <BookmarksManager />;
}
