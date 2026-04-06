"use client"

import { useEffect } from "react"
import BookmarksManager from "@/components/bookmarks/bookmarks-manager";
import useAuth from "@/utils/useAuth";
import { useTranslations } from "next-intl";
import { useBookmarkStore } from "@/store/bookmark-store";

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
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">{t("loading")}</div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return <BookmarksManager />;
}
