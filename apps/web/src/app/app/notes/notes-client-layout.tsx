"use client";

import { NotesProvider, useNotes } from "./context/NotesContext";
import NotesSidebar from "@/components/notes/NotesSidebar";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

function NotesLayout({ children }: { children: React.ReactNode }) {
    const t = useTranslations("Notes.layout");
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const { focusMode } = useNotes();

    return (
        <div className="flex h-full min-h-0 w-full overflow-hidden bg-background mobile-nav-offset">
            {isDesktop && !focusMode && <NotesSidebar />}

            <main className="flex-1 h-full min-h-0 overflow-hidden relative flex flex-col pt-12 md:pt-0">
                {!isDesktop && !focusMode && (
                    <div className="absolute top-3 left-4 z-50">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={t("openMenuAria")}><Menu className="h-5 w-5" /></Button>
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
