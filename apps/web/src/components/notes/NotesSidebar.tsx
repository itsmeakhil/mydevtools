"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useNotes } from "@/app/app/notes/context/NotesContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import {
    ChevronRight,
    ChevronDown,
    Plus,
    MoreHorizontal,
    Trash2,
    Search,
    X,
    Loader2,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Note } from "@/app/app/notes/types/Note";
import { useTranslations } from "next-intl";

interface NoteItemProps {
    note: Note;
    level: number;
    onDeleteClick: (note: Note) => void;
    parentTitle?: string;
    expandedIds: Set<string>;
    onToggleExpand: (noteId: string) => void;
    onExpandPath: (noteId: string) => void;
    isSearching: boolean;
}

const NoteItem = ({ note, level, onDeleteClick, parentTitle, expandedIds, onToggleExpand, onExpandPath, isSearching }: NoteItemProps) => {
    const t = useTranslations("Notes.sidebar");
    const { notes, activeNoteId, setActiveNoteId, createNote } = useNotes();

    const children = notes.filter(n => n.parentId === note.id);
    const hasChildren = children.length > 0;
    const isActive = activeNoteId === note.id;
    const isExpanded = isSearching || expandedIds.has(note.id);

    const handleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleExpand(note.id);
    };

    const handleSelect = () => {
        setActiveNoteId(note.id);
        onExpandPath(note.id);
    };

    const handleCreateChild = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await createNote(note.id);
        onExpandPath(note.id);
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDeleteClick(note);
    };

    return (
        <div>
            <div
                className={cn(
                    "group flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-colors min-h-[40px]",
                    isActive ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
                onClick={handleSelect}
            >
                <div
                    className={cn(
                        "h-5 w-5 flex items-center justify-center rounded-sm hover:bg-muted-foreground/20 transition-colors",
                        !hasChildren && "opacity-0 group-hover:opacity-100"
                    )}
                    onClick={hasChildren ? handleExpand : undefined}
                >
                    {hasChildren && (
                        isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
                    )}
                </div>

                <span className="mr-1 text-sm">{note.icon || "📄"}</span>
                <div className="flex-1 min-w-0 overflow-hidden">
                    {parentTitle && (
                        <div className="text-[10px] text-muted-foreground truncate leading-tight">
                            {t("inParent", { parentTitle })}
                        </div>
                    )}
                    <div className="truncate text-sm font-medium leading-tight">{note.title || t("untitled")}</div>
                </div>

                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleCreateChild}
                        title={t("addSubPage")}
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => e.stopPropagation()}
                                aria-label={t("noteOptionsAria")}
                            >
                                <MoreHorizontal className="h-3 w-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="start" className="w-48">
                            <DropdownMenuItem onClick={handleDeleteClick} className="text-red-500 focus:text-red-500 cursor-pointer">
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t("delete")}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {isExpanded && hasChildren && (
                <div>
                    {children.map(child => (
                        <NoteItem
                            key={child.id}
                            note={child}
                            level={level + 1}
                            onDeleteClick={onDeleteClick}
                            expandedIds={expandedIds}
                            onToggleExpand={onToggleExpand}
                            onExpandPath={onExpandPath}
                            isSearching={isSearching}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default function NotesSidebar() {
    const t = useTranslations("Notes.sidebar");
    const { notes, createNote, deleteNote, isLoading, activeNoteId } = useNotes();
    const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Get top-level notes
    const rootNotes = notes.filter(n => !n.parentId);

    // Filter notes for search
    const filteredNotes = searchQuery
        ? notes.filter(note =>
            (note.title || "").toLowerCase().includes(searchQuery.toLowerCase())
        )
        : rootNotes;

    const notesScrollRef = useRef<HTMLDivElement>(null);
    const { displayCount: notesDisplayCount, sentinelRef: notesSentinelRef, hasMore: notesHasMore } = useInfiniteScroll({
        totalCount: filteredNotes.length,
        resetKey: searchQuery,
        pageSize: 30,
        scrollContainerRef: notesScrollRef,
    });
    const visibleNotes = filteredNotes.slice(0, notesDisplayCount);

    const noteById = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes]);

    const expandPath = (noteId: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            let current = noteById.get(noteId);
            const guard = new Set<string>();
            while (current?.parentId && !guard.has(current.id)) {
                next.add(current.parentId);
                guard.add(current.id);
                current = noteById.get(current.parentId);
            }
            return next;
        });
    };

    const toggleExpand = (noteId: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(noteId)) {
                next.delete(noteId);
            } else {
                next.add(noteId);
            }
            return next;
        });
    };

    useEffect(() => {
        if (!activeNoteId) return;
        expandPath(activeNoteId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeNoteId, notes]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const handleDeleteConfirm = async () => {
        if (noteToDelete) {
            await deleteNote(noteToDelete.id);
            setNoteToDelete(null);
        }
    };

    return (
        <>
            <div className="flex flex-col h-full border-r bg-muted/10 w-64 flex-shrink-0">
                <div className="p-4 border-b flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-semibold text-sm">
                            <span className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                                📝
                            </span>
                            {t("title")}
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => createNote(null)}
                            className="h-8 w-8"
                            aria-label={t("createNoteAria")}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            ref={searchInputRef}
                            placeholder={t("searchPlaceholder")}
                            className="pl-8 pr-8 h-9 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1 h-7 w-7"
                                onClick={() => setSearchQuery("")}
                            >
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                </div>

                <div ref={notesScrollRef} className="flex-1 overflow-y-auto">
                    <div className="p-2">
                        {isLoading ? (
                            <div className="p-4 text-xs text-muted-foreground text-center">{t("loading")}</div>
                        ) : filteredNotes.length === 0 ? (
                            <div className="p-4 text-xs text-muted-foreground text-center">
                                {searchQuery ? t("noNotesFound") : t("noNotesYet")}
                            </div>
                        ) : (
                            visibleNotes.map(note => {
                                const parent = searchQuery && note.parentId ? notes.find(n => n.id === note.parentId) : undefined;
                                return (
                                    <NoteItem
                                        key={note.id}
                                        note={note}
                                        level={0}
                                        onDeleteClick={setNoteToDelete}
                                        parentTitle={parent?.title}
                                        expandedIds={expandedIds}
                                        onToggleExpand={toggleExpand}
                                        onExpandPath={expandPath}
                                        isSearching={!!searchQuery}
                                    />
                                );
                            })
                        )}
                        {notesHasMore && (
                            <div ref={notesSentinelRef} className="flex justify-center py-3">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/50" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AlertDialog open={!!noteToDelete} onOpenChange={(open) => !open && setNoteToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("deleteConfirmDescription", { title: noteToDelete?.title || t("untitled") })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
                            {t("confirmDelete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
