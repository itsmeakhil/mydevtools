"use client";

import { NotesProvider, useNotesUI } from "./context/NotesContext";
import NotesSidebar from "@/components/notes/NotesSidebar";
import { ToolSidebarLayout } from "@/components/tools/tool-sidebar";
import { NotebookPen } from "lucide-react";
import { useTranslations } from "next-intl";
import { useVaultGuard } from "@/hooks/use-vault-guard";
import { VaultLockedPlaceholder } from "@/components/vault-locked-placeholder";
import { VaultRestoringSkeleton } from "@/components/vault-restoring-skeleton";

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
    const { isUnlocked, isRestoring } = useVaultGuard();

    // Gate here, not in page.tsx. The page is this layout's *children*, so a gate
    // there swaps the editor for the placeholder while the sidebar column keeps
    // rendering — a note tree, a search field and a New note button, all backed
    // by a vault that cannot be read. password-manager, api-keys and
    // environment-manager gate before their ToolSidebarLayout for the same
    // reason; notes only differed because its layout is a separate wrapper.
    //
    // Above NotesProvider, so a locked vault does not mount the provider and
    // have it fail to load notes it has no key for.
    if (isRestoring) return <VaultRestoringSkeleton />;
    if (!isUnlocked) return <VaultLockedPlaceholder appName="Notes" />;

    return (
        <NotesProvider>
            <NotesLayout>{children}</NotesLayout>
        </NotesProvider>
    );
}
