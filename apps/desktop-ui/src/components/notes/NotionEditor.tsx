import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNotesData, useNotesUI, useNotesActions } from "@/app/app/notes/context/NotesContext";
import { NoteMarkdownEditor } from "@/components/notes/markdown-editor/NoteMarkdownEditor";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "@/components/ui/input";
import { storage } from "@/database/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import useAuth from "@/utils/useAuth";
import { isDesktop } from "@/lib/desktop/is-desktop";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
    CheckCircle2,
    Save,
    Download,
    Maximize2,
    Minimize2,
    LayoutTemplate,
    FileCode,
    Tag,
    X,
    Loader2,
    ChevronRight,
} from "lucide-react";
import { marked } from "marked";
import { cn } from "@/lib/utils";
import { TemplatePickerDialog } from "./template-picker-dialog";
import { type NoteTemplate } from "@/app/app/notes/utils/noteTemplates";
import {
    contentToMarkdown,
    noteContentToMarkdown,
    countWords,
    extractPlainText,
    readingTimeMinutes,
} from "@/app/app/notes/utils/noteContentUtils";
import type { Note } from "@/app/app/notes/types/Note";

export default function NotionEditor() {
    const tEditor = useTranslations("Notes.editor");
    const tCtx = useTranslations("Notes.context");
    const { noteById, isContentLoading } = useNotesData();
    const { activeNoteId, focusMode, setActiveNoteId, setFocusMode } = useNotesUI();
    const { updateNote } = useNotesActions();
    const activeNote = activeNoteId ? noteById.get(activeNoteId) : undefined;
    const { user } = useAuth();

    const [title, setTitle] = useState("");
    const [isMounted, setIsMounted] = useState(false);
    const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
    // Latest editor markdown, kept in a ref so typing doesn't re-render the
    // toolbar/breadcrumb/tags on every keystroke. `wordCountSource` is a
    // debounced snapshot that DOES drive a render (word count / read time).
    const latestMarkdownRef = useRef<string | null>(null);
    const [wordCountSource, setWordCountSource] = useState<string | null>(null);
    const pushWordCount = useDebouncedCallback(
        (md: string) => setWordCountSource(md),
        500,
    );
    const [editorKey, setEditorKey] = useState(0);
    const isDirtyRef = useRef(false);
    const [tagInput, setTagInput] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    // Holds template markdown (scoped to the note it was applied to) until the
    // editor remounts with it; cleared on note switch. Scoping prevents a
    // just-applied template from leaking into a different note during a switch.
    const [pendingTemplateContent, setPendingTemplateContent] =
        useState<{ noteId: string; markdown: string } | null>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const [lastSyncedNoteId, setLastSyncedNoteId] = useState<string | null>(null);

    useEffect(() => {
        if (activeNote && activeNote.id !== lastSyncedNoteId) {
            setTitle(activeNote.title);
            setTags(activeNote.tags ?? []);
            setLastSyncedNoteId(activeNote.id);
            setPendingTemplateContent(null);
            latestMarkdownRef.current = null;
            setWordCountSource(null);
        }
    }, [activeNoteId, activeNote, lastSyncedNoteId]);

    useEffect(() => {
        if (saveState !== "saved") return;
        const timeout = setTimeout(() => setSaveState("idle"), 1600);
        return () => clearTimeout(timeout);
    }, [saveState]);

    const handleUpdate = useCallback(async (id: string, updates: Partial<Note>) => {
        if (id) {
            setSaveState("saving");
            isDirtyRef.current = false;
            await updateNote(id, updates);
            setLastSavedAt(new Date());
            setSaveState("saved");
        }
    }, [updateNote]);

    const debouncedUpdate = useDebouncedCallback(handleUpdate, 1000);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        setTitle(newTitle);
        if (activeNoteId) {
            setSaveState("saving");
            debouncedUpdate(activeNoteId, { title: newTitle });
        }
    };

    const handleEditorChange = (markdown: string) => {
        latestMarkdownRef.current = markdown;
        pushWordCount(markdown);
        if (activeNoteId) {
            isDirtyRef.current = true;
            setSaveState("saving");
            debouncedUpdate(activeNoteId, { content: markdown });
        }
    };

    const handleUploadImage = async (file: File): Promise<string> => {
        if (!user) throw new Error(tCtx("authRequiredError"));
        // Desktop: note images live in Firebase Storage (cloud). Desktop data
        // stays on the machine, so image upload is web-only.
        if (isDesktop()) {
            throw new Error(tCtx("cloudSyncImageError"));
        }
        const timestamp = Date.now();
        const safeName = sanitizeFileName(file.name);
        const storageRef = ref(storage, `notes/${user.uid}/${activeNoteId}/${timestamp}_${safeName}`);
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
    };

    const initialMarkdown = useMemo(() => {
        // A template applied to THIS note takes precedence (activeNote.content
        // isn't updated until the debounced save round-trips).
        if (pendingTemplateContent?.noteId === activeNoteId) {
            return pendingTemplateContent.markdown;
        }
        // Normalizes both new (string) and legacy (tree) content to markdown.
        return noteContentToMarkdown(activeNote?.content);
    }, [activeNoteId, editorKey, activeNote?.content, pendingTemplateContent]);

    const activePath = useMemo<Note[]>(() => {
        if (!activeNote) return [];
        const path: Note[] = [];
        let cursor: Note | undefined = activeNote;
        const guard = new Set<string>();
        while (cursor && !guard.has(cursor.id)) {
            path.unshift(cursor);
            guard.add(cursor.id);
            if (!cursor.parentId) break;
            const parent = noteById.get(cursor.parentId);
            if (!parent) break;
            cursor = parent;
        }
        return path;
    }, [activeNote, noteById]);

    const saveNow = useCallback(async () => {
        if (!activeNoteId) return;
        await debouncedUpdate.flush();
    }, [activeNoteId, debouncedUpdate]);

    const addTag = useCallback((raw: string) => {
        const tag = raw.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 50);
        if (!tag || tags.includes(tag) || tags.length >= 20) return;
        const next = [...tags, tag];
        setTags(next);
        if (activeNoteId) debouncedUpdate(activeNoteId, { tags: next });
    }, [tags, activeNoteId, debouncedUpdate]);

    const removeTag = useCallback((tag: string) => {
        const next = tags.filter(t => t !== tag);
        setTags(next);
        if (activeNoteId) debouncedUpdate(activeNoteId, { tags: next });
    }, [tags, activeNoteId, debouncedUpdate]);

    // Defer word-count compute: the heavy extract runs at most every 500ms
    // instead of every keystroke.
    const { wordCount, readTime } = useMemo(() => {
        const src = wordCountSource ?? activeNote?.content;
        const text = extractPlainText(src);
        const wc = countWords(text);
        return { wordCount: wc, readTime: readingTimeMinutes(wc) };
    }, [wordCountSource, activeNote?.content]);

    const handleExportMarkdown = useCallback(() => {
        const src = latestMarkdownRef.current ?? activeNote?.content;
        const md = contentToMarkdown(title || "Untitled", src);
        const blob = new Blob([md], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(title || "note").replace(/\s+/g, "-")}.md`;
        a.click();
        URL.revokeObjectURL(url);
    }, [activeNote?.content, title]);

    const handleExportHtml = useCallback(() => {
        const src = latestMarkdownRef.current ?? activeNote?.content;
        const body = noteContentToMarkdown(src);
        const bodyHtml = marked.parse(body, { async: false }) as string;
        const html = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8" />\n<title>${title || "Note"}</title>\n</head>\n<body>\n<h1 style="font-size:2rem;font-weight:bold;margin-bottom:1rem">${title || "Untitled"}</h1>\n${bodyHtml}</body>\n</html>`;
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(title || "note").replace(/\s+/g, "-")}.html`;
        a.click();
        URL.revokeObjectURL(url);
    }, [activeNote?.content, title]);

    const handleApplyTemplate = useCallback((tpl: NoteTemplate) => {
        if (!activeNoteId) return;
        setSaveState("saving");
        debouncedUpdate(activeNoteId, { content: tpl.content, title: tpl.defaultTitle });
        setTitle(tpl.defaultTitle);
        latestMarkdownRef.current = tpl.content;
        setWordCountSource(tpl.content);
        // Scope the pending template to this note; initialMarkdown reads it on the
        // remount forced by bumping editorKey. We deliberately do NOT reset
        // lastSyncedNoteId here — doing so would re-fire the note-sync effect and
        // clobber the title/content we just set.
        setPendingTemplateContent({ noteId: activeNoteId, markdown: tpl.content });
        setEditorKey(k => k + 1);
    }, [activeNoteId, debouncedUpdate]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
                event.preventDefault();
                void saveNow();
            }
            if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "f") {
                event.preventDefault();
                setFocusMode(!focusMode);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [saveNow, setFocusMode, focusMode]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirtyRef.current) {
                e.preventDefault();
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, []);

    if (!activeNoteId) {
        return (
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="flex max-w-sm flex-col items-center gap-4 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <LayoutTemplate className="h-6 w-6" />
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {tEditor("emptyState")}
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground">
                        <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">⌘K</kbd>
                        <span>{tEditor("searchHint")}</span>
                        <span className="text-muted-foreground/40">·</span>
                        <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">⌘⇧F</kbd>
                        <span>{tEditor("focusHint")}</span>
                    </div>
                </div>
            </div>
        );
    }

    if (!activeNote || !isMounted) return null;

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
            <div className={cn(
                "p-4 md:p-6 pb-2 md:pb-4 mx-auto w-full",
                focusMode ? "max-w-3xl" : "max-w-6xl"
            )}>
                {/* Breadcrumb */}
                {!focusMode && activePath.length > 1 && (
                    <nav className="mb-2 flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto no-scrollbar" aria-label={tEditor("notePath")}>
                        {activePath.map((node, index) => {
                            const isLast = index === activePath.length - 1;
                            return (
                                <React.Fragment key={node.id}>
                                    {isLast ? (
                                        <span className="text-foreground font-medium truncate max-w-[200px]">
                                            {node.title || tEditor("titlePlaceholder")}
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setActiveNoteId(node.id)}
                                            className="hover:text-foreground hover:underline cursor-pointer truncate max-w-[160px]"
                                        >
                                            {node.title || tEditor("titlePlaceholder")}
                                        </button>
                                    )}
                                    {!isLast && <ChevronRight className="h-3 w-3 flex-shrink-0" />}
                                </React.Fragment>
                            );
                        })}
                    </nav>
                )}

                {/* Toolbar */}
                <div className="mb-2 flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5" aria-live="polite">
                        <span
                            className={cn(
                                "h-1.5 w-1.5 rounded-full transition-colors",
                                saveState === "saving" ? "bg-amber-500 animate-pulse"
                                    : saveState === "saved" ? "bg-emerald-500"
                                    : "bg-muted-foreground/40"
                            )}
                            aria-hidden
                        />
                        <span>
                            {saveState === "saving"
                                ? tEditor("saving")
                                : saveState === "saved" && lastSavedAt
                                    ? tEditor("saved", { time: lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })
                                    : tEditor("ready")}
                        </span>
                    </span>
                    {wordCount > 0 && (
                        <span aria-label={tEditor("stats", { words: wordCount, read: readTime })}>
                            {tEditor("stats", { words: wordCount, read: readTime })}
                        </span>
                    )}

                    <div className="ml-auto flex items-center gap-1">
                        {/* Template picker */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1.5 cursor-pointer"
                            onClick={() => setTemplateDialogOpen(true)}
                            title={tEditor("applyTemplate")}
                            aria-label={tEditor("applyTemplate")}
                        >
                            <LayoutTemplate className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">{tEditor("template")}</span>
                        </Button>

                        {/* Export markdown */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1.5 cursor-pointer"
                            onClick={handleExportMarkdown}
                            title={tEditor("exportMd")}
                            aria-label={tEditor("exportMd")}
                        >
                            <Download className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">{tEditor("exportMdLabel")}</span>
                        </Button>

                        {/* Export HTML */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1.5 cursor-pointer"
                            onClick={handleExportHtml}
                            title={tEditor("exportHtml")}
                            aria-label={tEditor("exportHtml")}
                        >
                            <FileCode className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">{tEditor("exportHtmlLabel")}</span>
                        </Button>

                        {/* Focus mode */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1.5 cursor-pointer"
                            onClick={() => setFocusMode(!focusMode)}
                            title={`${focusMode ? tEditor("exitFocusMode") : tEditor("focusMode")} (⌘⇧F)`}
                            aria-label={focusMode ? tEditor("exitFocusMode") : tEditor("focusMode")}
                            aria-pressed={focusMode}
                        >
                            {focusMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                        </Button>

                        {/* Save */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs cursor-pointer"
                            onClick={() => void saveNow()}
                        >
                            {saveState === "saved" ? <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                            {tEditor("save")}
                        </Button>
                    </div>
                </div>

                <Input
                    value={title}
                    onChange={handleTitleChange}
                    className="text-3xl md:text-4xl font-bold border-none shadow-none focus-visible:ring-0 focus-visible:border-b-2 focus-visible:border-primary/50 rounded-none px-0 placeholder:text-muted-foreground/50 h-auto bg-transparent"
                    placeholder={tEditor("titlePlaceholder")}
                    aria-label={tEditor("titlePlaceholder")}
                />

                {/* Tags row */}
                {!focusMode && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                        <Tag className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        {tags.map((tag) => (
                            <span
                                key={tag}
                                className="inline-flex items-center gap-0.5 text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                            >
                                {tag}
                                <button
                                    type="button"
                                    onClick={() => removeTag(tag)}
                                    className="hover:text-destructive ml-0.5 p-0.5 cursor-pointer"
                                    aria-label={tEditor("removeTag", { tag })}
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        ))}
                        <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === ",") {
                                    e.preventDefault();
                                    addTag(tagInput);
                                    setTagInput("");
                                } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
                                    removeTag(tags[tags.length - 1]);
                                }
                            }}
                            placeholder={tags.length === 0 ? tEditor("addTag") : ""}
                            aria-label={tEditor("addTag")}
                            className="text-[11px] bg-transparent outline-none text-muted-foreground placeholder:text-muted-foreground/40 min-w-[60px] max-w-[120px]"
                        />
                    </div>
                )}
            </div>

            <div className={cn(
                // Horizontal insets are owned by the editor itself (see
                // crepe-theme.css) so the slash/drag gutter isn't clipped here.
                "flex-1 overflow-y-auto mx-auto w-full pb-20",
                focusMode ? "max-w-3xl" : "max-w-6xl"
            )}>
                {isContentLoading ? (
                    <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">{tEditor("loading")}</span>
                    </div>
                ) : (
                    <NoteMarkdownEditor
                        key={`${activeNoteId}-${editorKey}`}
                        defaultValue={initialMarkdown}
                        onChange={handleEditorChange}
                        onUploadImage={handleUploadImage}
                    />
                )}
            </div>

            <TemplatePickerDialog
                open={templateDialogOpen}
                onOpenChange={setTemplateDialogOpen}
                onSelect={handleApplyTemplate}
            />
        </div>
    );
}

function sanitizeFileName(name: string): string {
    return name
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/_{2,}/g, "_")
        .slice(0, 200);
}
