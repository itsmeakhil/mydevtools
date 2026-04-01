"use client"

import NotionEditor from "@/components/notes/NotionEditor";
import useAuth from "@/utils/useAuth";
import { useTranslations } from "next-intl";

export default function NotesPage() {
    const { user, loading } = useAuth(true);
    const t = useTranslations("Notes.page");

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">{t("loading")}</div>;
    }

    if (!user) {
        return null;
    }

    return <NotionEditor />;
}
