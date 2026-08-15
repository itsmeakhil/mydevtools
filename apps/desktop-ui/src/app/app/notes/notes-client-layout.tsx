"use client";

import { NotesProvider, useNotesUI } from "./context/NotesContext";
import NotesSidebar from "@/components/notes/NotesSidebar";
import { ToolSidebarLayout } from "@/components/tools/tool-sidebar";
import { NotebookPen } from "lucide-react";
import { useTranslations } from "next-intl";

function NotesLayout({ children }: { children: React.ReactNode }) {
    const tSidebar = useTranslations("Notes.sidebar");
    const { focusMode } = useNotesUI();

    // Focus mode drops the panel entirely — no column, no re-open affordance.
    if (focusMode) {
        return (
            <main className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background mobile-nav-offset">
                {children}
            </main>
        );
    }

    return (
        <ToolSidebarLayout
            toolId="notes"
            icon={NotebookPen}
            title={tSidebar("title")}
            sidebar={<NotesSidebar />}
            className="bg-background mobile-nav-offset"
        >
            {children}
        </ToolSidebarLayout>
    );
}

export default function NotesClientLayout({ children }: { children: React.ReactNode }) {
    return (
        <NotesProvider>
            <NotesLayout>{children}</NotesLayout>
        </NotesProvider>
    );
}
