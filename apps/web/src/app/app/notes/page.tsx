"use client"

import NotionEditor from "@/components/notes/NotionEditor";
import useAuth from "@/utils/useAuth";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

export default function NotesPage() {
    const { user, loading } = useAuth(true);
    const t = useTranslations("Notes.page");

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto px-8 py-12 w-full">
                <Skeleton className="h-10 w-64 mb-10" />
                <Skeleton className="h-4 w-full mb-3" />
                <Skeleton className="h-4 w-5/6 mb-3" />
                <Skeleton className="h-4 w-4/5 mb-3" />
                <Skeleton className="h-4 w-full mb-6" />
                <Skeleton className="h-4 w-3/4 mb-3" />
                <Skeleton className="h-4 w-full mb-3" />
                <Skeleton className="h-4 w-2/3 mb-3" />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return <NotionEditor />;
}
