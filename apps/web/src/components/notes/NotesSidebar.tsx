"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "use-debounce";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useNotesData, useNotesUI, useNotesActions } from "@/app/app/notes/context/NotesContext";
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
    Pin,
    PinOff,
    Copy,
    FolderInput,
    ArrowUpDown,
    NotebookPen,
    FileText,
    ArrowUp,
    ArrowDown,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
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
import { extractSnippet } from "@/app/app/notes/utils/noteContentUtils";
import { type ChildrenMap, type SortDir, type SortKey, buildChildrenMap, getCachedPlainText } from "./notes-helpers";
import { EmojiPicker } from "./emoji-picker";
import { MoveDialog } from "./move-dialog";

interface NoteItemProps {
    note: Note;
    level: number;
    childrenMap: ChildrenMap;
    onDeleteClick: (note: Note) => void;
    onMoveClick: (note: Note) => void;
    parentTitle?: string;
    snippet?: string;
    expandedIds: Set<string>;
    onToggleExpand: (noteId: string) => void;
    onExpandPath: (noteId: string) => void;
    isSearching: boolean;
}

const NoteItem = React.memo(({
    note, level, childrenMap, onDeleteClick, onMoveClick,
    parentTitle, snippet, expandedIds, onToggleExpand, onExpandPath, isSearching,
}: NoteItemProps) => {
    const t = useTranslations("Notes.sidebar");
    const { activeNoteId, setActiveNoteId } = useNotesUI();
    const { createNote, pinNote, duplicateNote, updateNote } = useNotesActions();
    const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

    const children = childrenMap.get(note.id) ?? [];
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

    const handleDuplicate = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await duplicateNote(note.id);
    };

    const handleEmojiSelect = async (emoji: string) => {
        await updateNote(note.id, { icon: emoji });
    };

    return (
        <div>
            <div
                className={cn(
                    "group flex items-start gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-colors min-h-[40px]",
                    isActive ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
                onClick={handleSelect}
            >
                <div
                    className={cn(
                        "h-5 w-5 flex items-center justify-center rounded-sm hover:bg-muted-foreground/20 transition-colors mt-0.5 flex-shrink-0",
                        !hasChildren && "opacity-0 group-hover:opacity-100"
                    )}
                    onClick={hasChildren ? handleExpand : undefined}
                >
                    {hasChildren && (
                        isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
                    )}
                </div>

                <DropdownMenu open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
                    <DropdownMenuTrigger asChild>
                        <span
                            className="mr-1 mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center text-sm cursor-pointer hover:opacity-70"
                            onClick={(e) => { e.stopPropagation(); setEmojiPickerOpen(true); }}
                            title="Change icon"
                        >
                            {note.icon
                                ? note.icon
                                : <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
                        </span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="p-0">
                        <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setEmojiPickerOpen(false)} />
                    </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex-1 min-w-0 overflow-hidden">
                    {parentTitle && (
                        <div className="text-[10px] text-muted-foreground truncate leading-tight">
                            {t("inParent", { parentTitle })}
                        </div>
                    )}
                    <div className="truncate text-sm font-medium leading-tight">{note.title || t("untitled")}</div>
                    {snippet && (
                        <div className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5 italic">
                            {snippet}
                        </div>
                    )}
                    {note.tags && note.tags.length > 0 && (
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                            {note.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="text-[9px] bg-primary/10 text-primary px-1 rounded">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {note.pinned && (
                    <Pin className="h-3 w-3 text-primary/60 flex-shrink-0 mt-1" />
                )}

                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
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
                            <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); pinNote(note.id, !note.pinned); }}
                            >
                                {note.pinned ? (
                                    <><PinOff className="h-4 w-4 mr-2" />Unpin</>
                                ) : (
                                    <><Pin className="h-4 w-4 mr-2" />Pin to top</>
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleDuplicate}>
                                <Copy className="h-4 w-4 mr-2" />Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMoveClick(note); }}>
                                <FolderInput className="h-4 w-4 mr-2" />Move to…
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
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
                            childrenMap={childrenMap}
                            onDeleteClick={onDeleteClick}
                            onMoveClick={onMoveClick}
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
});
NoteItem.displayName = "NoteItem";

export default function NotesSidebar() {
    const t = useTranslations("Notes.sidebar");
    const { notes, noteById, isLoading } = useNotesData();
    const { activeNoteId } = useNotesUI();
    const { createNote, deleteNote, moveNote } = useNotesActions();
    const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
    const [noteToMove, setNoteToMove] = useState<Note | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery] = useDebounce(searchQuery, 200);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [sortKey, setSortKey] = useState<SortKey>("createdAt");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const searchInputRef = useRef<HTMLInputElement>(null);

    const childrenMap = useMemo(() => buildChildrenMap(notes), [notes]);

    const sortedNotes = useMemo(() => {
        const arr = [...notes];
        arr.sort((a, b) => {
            let cmp = 0;
            if (sortKey === "title") cmp = (a.title || "").localeCompare(b.title || "");
            else if (sortKey === "updatedAt") cmp = a.updatedAt.localeCompare(b.updatedAt);
            else cmp = a.createdAt.localeCompare(b.createdAt);
            return sortDir === "asc" ? cmp : -cmp;
        });
        return arr;
    }, [notes, sortKey, sortDir]);

    const rootNotes = useMemo(() => sortedNotes.filter(n => !n.parentId), [sortedNotes]);
    const pinnedNotes = useMemo(() => rootNotes.filter(n => n.pinned), [rootNotes]);
    const unpinnedNotes = useMemo(() => rootNotes.filter(n => !n.pinned), [rootNotes]);

    const searchResults = useMemo(() => {
        const trimmed = debouncedQuery.trim();
        if (!trimmed) return null;
        const q = trimmed.toLowerCase();
        const out: { note: Note; snippet?: string; parent?: Note }[] = [];
        for (const n of sortedNotes) {
            const titleHit = (n.title || "").toLowerCase().includes(q);
            const text = getCachedPlainText(n);
            const bodyHit = text.toLowerCase().includes(q);
            if (!titleHit && !bodyHit) continue;
            out.push({
                note: n,
                snippet: bodyHit ? extractSnippet(text, trimmed) : undefined,
                parent: n.parentId ? noteById.get(n.parentId) : undefined,
            });
        }
        return out;
    }, [sortedNotes, debouncedQuery, noteById]);

    const notesScrollRef = useRef<HTMLDivElement>(null);
    const listLength = searchResults ? searchResults.length : rootNotes.length;
    const { displayCount, sentinelRef, hasMore } = useInfiniteScroll({
        totalCount: listLength,
        resetKey: debouncedQuery,
        pageSize: 30,
        scrollContainerRef: notesScrollRef,
    });

    const expandPath = useCallback((noteId: string) => {
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
    }, [noteById]);

    const toggleExpand = useCallback((noteId: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(noteId)) next.delete(noteId);
            else next.add(noteId);
            return next;
        });
    }, []);

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

    const handleMove = async (newParentId: string | null) => {
        if (noteToMove) {
            await moveNote(noteToMove.id, newParentId);
            setNoteToMove(null);
        }
    };

    // Stable callbacks so NoteItem memo stays effective.
    const handleSetNoteToDelete = useCallback((n: Note) => setNoteToDelete(n), []);
    const handleSetNoteToMove = useCallback((n: Note) => setNoteToMove(n), []);

    const sortLabel: Record<SortKey, string> = {
        createdAt: "Date created",
        updatedAt: "Last modified",
        title: "Title",
    };

    return (
        <>
            <div className="flex flex-col h-full border-r bg-muted/10 w-64 flex-shrink-0">
                <div className="p-4 border-b flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-semibold text-sm">
                            <span className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                                <NotebookPen className="h-3.5 w-3.5" />
                            </span>
                            {t("title")}
                        </div>
                        <div className="flex items-center gap-1">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" title="Sort notes">
                                        <ArrowUpDown className="h-3.5 w-3.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuRadioGroup value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                                        {(Object.keys(sortLabel) as SortKey[]).map((k) => (
                                            <DropdownMenuRadioItem key={k} value={k}>
                                                {sortLabel[k]}
                                            </DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
                                        className="cursor-pointer"
                                    >
                                        {sortDir === "asc"
                                            ? <><ArrowUp className="h-3.5 w-3.5 mr-2" />Ascending</>
                                            : <><ArrowDown className="h-3.5 w-3.5 mr-2" />Descending</>}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => createNote(null)}
                                className="h-8 w-8 cursor-pointer"
                                aria-label={t("createNoteAria")}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            ref={searchInputRef}
                            placeholder={t("searchPlaceholder")}
                            className="pl-8 pr-14 h-9 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1 h-7 w-7 cursor-pointer"
                                onClick={() => setSearchQuery("")}
                                aria-label="Clear search"
                            >
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        ) : (
                            <kbd className="hidden sm:flex pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                                <span className="text-xs">⌘</span>K
                            </kbd>
                        )}
                    </div>
                </div>

                <div ref={notesScrollRef} className="flex-1 overflow-y-auto">
                    <div className="p-2">
                        {isLoading ? (
                            <div className="p-4 text-xs text-muted-foreground text-center">{t("loading")}</div>
                        ) : searchResults !== null ? (
                            searchResults.length === 0 ? (
                                <div className="p-4 text-xs text-muted-foreground text-center">{t("noNotesFound")}</div>
                            ) : (
                                searchResults.slice(0, displayCount).map(({ note, snippet, parent }) => (
                                    <NoteItem
                                        key={note.id}
                                        note={note}
                                        level={0}
                                        childrenMap={childrenMap}
                                        onDeleteClick={handleSetNoteToDelete}
                                        onMoveClick={handleSetNoteToMove}
                                        parentTitle={parent?.title}
                                        snippet={snippet}
                                        expandedIds={expandedIds}
                                        onToggleExpand={toggleExpand}
                                        onExpandPath={expandPath}
                                        isSearching={true}
                                    />
                                ))
                            )
                        ) : (
                            <>
                                {pinnedNotes.length > 0 && (
                                    <>
                                        <div className="px-2 pt-1 pb-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Pinned
                                        </div>
                                        {pinnedNotes.map(note => (
                                            <NoteItem
                                                key={note.id}
                                                note={note}
                                                level={0}
                                                childrenMap={childrenMap}
                                                onDeleteClick={handleSetNoteToDelete}
                                                onMoveClick={handleSetNoteToMove}
                                                expandedIds={expandedIds}
                                                onToggleExpand={toggleExpand}
                                                onExpandPath={expandPath}
                                                isSearching={false}
                                            />
                                        ))}
                                        {unpinnedNotes.length > 0 && (
                                            <div className="px-2 pt-2 pb-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                Notes
                                            </div>
                                        )}
                                    </>
                                )}
                                {unpinnedNotes.length === 0 && pinnedNotes.length === 0 ? (
                                    <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
                                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <NotebookPen className="h-5 w-5" />
                                        </div>
                                        <div className="text-xs text-muted-foreground">{t("noNotesYet")}</div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => createNote(null)}
                                            className="h-8 text-xs cursor-pointer"
                                        >
                                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                                            New note
                                        </Button>
                                    </div>
                                ) : (
                                    unpinnedNotes.slice(0, Math.max(0, displayCount - pinnedNotes.length)).map(note => (
                                        <NoteItem
                                            key={note.id}
                                            note={note}
                                            level={0}
                                            childrenMap={childrenMap}
                                            onDeleteClick={handleSetNoteToDelete}
                                            onMoveClick={handleSetNoteToMove}
                                            expandedIds={expandedIds}
                                            onToggleExpand={toggleExpand}
                                            onExpandPath={expandPath}
                                            isSearching={false}
                                        />
                                    ))
                                )}
                            </>
                        )}
                        {hasMore && (
                            <div ref={sentinelRef} className="flex justify-center py-3">
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

            {noteToMove && (
                <MoveDialog
                    note={noteToMove}
                    notes={notes}
                    open={!!noteToMove}
                    onOpenChange={(open) => !open && setNoteToMove(null)}
                    onMove={handleMove}
                />
            )}
        </>
    );
}
