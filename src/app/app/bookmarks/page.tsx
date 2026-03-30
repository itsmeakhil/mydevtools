"use client"

import BookmarksManager from "@/components/bookmarks/bookmarks-manager";
import useAuth from "@/utils/useAuth";
import { useTranslations } from "next-intl";

export default function BookmarksPage() {
    const t = useTranslations("Bookmarks.page");
    const { user, loading } = useAuth(true);

    if (loading) {
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
