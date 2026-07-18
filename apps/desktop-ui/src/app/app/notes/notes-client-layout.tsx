"use client";

import { NotesProvider, useNotesUI } from "./context/NotesContext";
import NotesSidebar from "@/components/notes/NotesSidebar";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Menu, PanelLeftOpen, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

function NotesLayout({ children }: { children: React.ReactNode }) {
    const t = useTranslations("Notes.layout");
    const tSidebar = useTranslations("Notes.sidebar");
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const { focusMode, sidebarOpen, setSidebarOpen } = useNotesUI();
    const sidebarCollapsed = isDesktop && !focusMode && !sidebarOpen;

    return (
        <div className="flex h-full min-h-0 w-full overflow-hidden bg-background mobile-nav-offset">
            {isDesktop && !focusMode && sidebarOpen && <NotesSidebar />}

            <main className={`flex-1 h-full min-h-0 overflow-hidden relative flex flex-col ${sidebarCollapsed ? "pt-12" : "pt-12 md:pt-0"}`}>
                {sidebarCollapsed && (
                    <div className="absolute top-3 left-3 z-50 flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-full shadow-sm bg-background/80 backdrop-blur cursor-pointer"
                            onClick={() => setSidebarOpen(true)}
                            aria-label={t("showSidebarAria")}
                            title={t("showSidebarAria")}
                        >
                            <PanelLeftOpen className="h-5 w-5" />
                        </Button>
                        <div className="flex items-center gap-2 font-semibold text-sm">
                            <span className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                                <NotebookPen className="h-3.5 w-3.5" />
                            </span>
                            {tSidebar("title")}
                        </div>
                    </div>
                )}
                {!isDesktop && !focusMode && (
                    <div className="absolute top-3 left-3 z-50">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9 rounded-full shadow-sm bg-background/80 backdrop-blur cursor-pointer"
                                    aria-label={t("openMenuAria")}
                                >
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="p-0 w-72">
                                <SheetHeader className="sr-only">
                                    <SheetTitle>{t("mobileNavTitle")}</SheetTitle>
                                </SheetHeader>
                                <NotesSidebar />
                            </SheetContent>
                        </Sheet>
                    </div>
                )}
                {children}
            </main>
        </div>
    );
}

export default function NotesClientLayout({ children }: { children: React.ReactNode }) {
    return (
        <NotesProvider>
            <NotesLayout>{children}</NotesLayout>
        </NotesProvider>
    );
}
