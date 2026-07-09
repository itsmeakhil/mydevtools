import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNotesData, useNotesUI, useNotesActions } from "@/app/app/notes/context/NotesContext";
import { Editor, EditorProvider, createEmptyContent } from "@/components/ui/rich-editor";
import { useDebounce, useDebouncedCallback } from "use-debounce";
import { Input } from "@/components/ui/input";
import { ContainerNode, EditorState } from "@/components/ui/rich-editor/types";
import { storage } from "@/database/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import useAuth from "@/utils/useAuth";
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
import { serializeToHtml } from "@/components/ui/rich-editor/utils/serialize-to-html";
import { cn } from "@/lib/utils";
import { TemplatePickerDialog } from "./template-picker-dialog";
import { type NoteTemplate } from "@/app/app/notes/utils/noteTemplates";
import { contentToMarkdown, countWords, extractPlainText, readingTimeMinutes } from "@/app/app/notes/utils/noteContentUtils";
import type { Note } from "@/app/app/notes/types/Note";

function sanitizeFileName(name: string): string {
    return name
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/_{2,}/g, "_")
        .slice(0, 200);
}

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
    const [currentContent, setCurrentContent] = useState<ContainerNode | null>(null);
    const [editorKey, setEditorKey] = useState(0);
    const isDirtyRef = useRef(false);
    const [tagInput, setTagInput] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    // Holds template content until EditorProvider mounts with it; cleared on note switch
    const [pendingTemplateContent, setPendingTemplateContent] = useState<ContainerNode | null>(null);

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
        }
    }, [activeNoteId, activeNote, lastSyncedNoteId]);

    useEffect(() => {
        if (saveState !== "saved") return;
        const timeout = setTimeout(() => setSaveState("idle"), 1600);
        return () => clearTimeout(timeout);
    }, [saveState]);

    const stripUndefined = (obj: any): any => {
        if (obj === null || obj === undefined) return null;
        if (typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(stripUndefined);
        const out: any = {};
        for (const key in obj) {
            const value = obj[key];
            if (value !== undefined) out[key] = stripUndefined(value);
        }
        return out;
    };

    const handleUpdate = useCallback(async (id: string, updates: any) => {
        if (id) {
            setSaveState("saving");
            isDirtyRef.current = false;
            await updateNote(id, stripUndefined(updates));
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

    const handleEditorChange = (state: EditorState) => {
        const container = state.history[state.historyIndex];
        setCurrentContent(container);
        if (activeNoteId) {
            isDirtyRef.current = true;
            setSaveState("saving");
            debouncedUpdate(activeNoteId, { content: container });
        }
    };

    const handleUploadImage = async (file: File): Promise<string> => {
        if (!user) throw new Error(tCtx("authRequiredError"));
        // Desktop offline mode: Firebase Storage needs a cloud session.
        if (user.uid === "desktop-local") {
            throw new Error("Image upload needs a cloud sign-in — text notes work offline.");
        }
        const timestamp = Date.now();
        const safeName = sanitizeFileName(file.name);
        const storageRef = ref(storage, `notes/${user.uid}/${activeNoteId}/${timestamp}_${safeName}`);
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
    };

    const initialContent = useMemo(() => {
        // Template was just applied — use it directly (activeNote.content not updated yet)
        if (pendingTemplateContent) return pendingTemplateContent;
        if (activeNote && activeNote.content) {
            const content = activeNote.content as any;
            if (content.type === 'container' && Array.isArray(content.children)) {
                return content as ContainerNode;
            }
        }
        return {
            id: "root",
            type: "container",
            children: createEmptyContent(),
            attributes: {},
        } as ContainerNode;
        // editorKey in deps so memo re-runs when template forces remount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeNoteId, editorKey]);

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

    // Defer word-count compute: heavy extractPlainText runs at most every 500ms
    // instead of every keystroke.
    const [debouncedContent] = useDebounce(currentContent, 500);
    const { wordCount, readTime } = useMemo(() => {
        const src = debouncedContent ?? (activeNote?.content as ContainerNode | undefined);
        const text = extractPlainText(src);
        const wc = countWords(text);
        return { wordCount: wc, readTime: readingTimeMinutes(wc) };
    }, [debouncedContent, activeNote?.content]);

    const handleExportMarkdown = useCallback(() => {
        const src = currentContent ?? (activeNote?.content as ContainerNode | undefined);
        const md = contentToMarkdown(title || "Untitled", src);
        const blob = new Blob([md], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(title || "note").replace(/\s+/g, "-")}.md`;
        a.click();
        URL.revokeObjectURL(url);
    }, [currentContent, activeNote?.content, title]);

    const handleExportHtml = useCallback(() => {
        const src = currentContent ?? (activeNote?.content as ContainerNode | undefined);
        if (!src) return;
        const bodyHtml = serializeToHtml(src, { wrapperClass: "note-content max-w-3xl mx-auto px-6 py-8 font-sans" });
        const html = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8" />\n<title>${title || "Note"}</title>\n</head>\n<body>\n<h1 style="font-size:2rem;font-weight:bold;margin-bottom:1rem">${title || "Untitled"}</h1>\n${bodyHtml}</body>\n</html>`;
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(title || "note").replace(/\s+/g, "-")}.html`;
        a.click();
        URL.revokeObjectURL(url);
    }, [currentContent, activeNote?.content, title]);

    const handleApplyTemplate = useCallback((tpl: NoteTemplate) => {
        if (!activeNoteId) return;
        const newContent = { ...tpl.content, id: "root" } as ContainerNode;
        setSaveState("saving");
        debouncedUpdate(activeNoteId, { content: newContent, title: tpl.defaultTitle });
        setTitle(tpl.defaultTitle);
        setCurrentContent(newContent);
        setPendingTemplateContent(newContent); // initialContent reads this on remount
        setLastSyncedNoteId(null);
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
                        <span>to search</span>
                        <span className="text-muted-foreground/40">·</span>
                        <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">⌘⇧F</kbd>
                        <span>focus mode</span>
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
                    <nav className="mb-2 flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto no-scrollbar" aria-label="Note path">
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
                                ? "Saving…"
                                : saveState === "saved" && lastSavedAt
                                    ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                    : "Ready"}
                        </span>
                    </span>
                    {wordCount > 0 && (
                        <span aria-label={`${wordCount} words, ${readTime} minute read`}>
                            {wordCount} words · {readTime} min read
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
                            title="Apply template"
                        >
                            <LayoutTemplate className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Template</span>
                        </Button>

                        {/* Export markdown */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1.5 cursor-pointer"
                            onClick={handleExportMarkdown}
                            title="Export as Markdown"
                        >
                            <Download className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">.md</span>
                        </Button>

                        {/* Export HTML */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1.5 cursor-pointer"
                            onClick={handleExportHtml}
                            title="Export as HTML"
                        >
                            <FileCode className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">.html</span>
                        </Button>

                        {/* Focus mode */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1.5 cursor-pointer"
                            onClick={() => setFocusMode(!focusMode)}
                            title={focusMode ? "Exit focus mode (⌘⇧F)" : "Focus mode (⌘⇧F)"}
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
                            Save
                        </Button>
                    </div>
                </div>

                <Input
                    value={title}
                    onChange={handleTitleChange}
                    className="text-3xl md:text-4xl font-bold border-none shadow-none focus-visible:ring-0 px-0 placeholder:text-muted-foreground/50 h-auto bg-transparent"
                    placeholder={tEditor("titlePlaceholder")}
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
                                    className="hover:text-destructive ml-0.5"
                                    aria-label={`Remove tag ${tag}`}
                                >
                                    <X className="h-2.5 w-2.5" />
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
                            placeholder={tags.length === 0 ? "Add tag…" : ""}
                            className="text-[11px] bg-transparent outline-none text-muted-foreground placeholder:text-muted-foreground/40 min-w-[60px] max-w-[120px]"
                        />
                    </div>
                )}
            </div>

            <div className={cn(
                "flex-1 overflow-y-auto px-4 md:px-8 mx-auto w-full pb-20",
                focusMode ? "max-w-3xl" : "max-w-6xl"
            )}>
                {isContentLoading ? (
                    <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Loading…</span>
                    </div>
                ) : (
                    <EditorProvider
                        key={`${activeNoteId}-${editorKey}`}
                        initialContainer={initialContent}
                        onChange={handleEditorChange}
                    >
                        <Editor onUploadImage={handleUploadImage} />
                    </EditorProvider>
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
