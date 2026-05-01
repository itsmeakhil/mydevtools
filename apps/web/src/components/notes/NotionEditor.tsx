import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNotes } from "@/app/app/notes/context/NotesContext";
import { Editor, EditorProvider, createEmptyContent } from "@/components/ui/rich-editor";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "@/components/ui/input";
import { ContainerNode, EditorState } from "@/components/ui/rich-editor/types";
import { storage } from "@/database/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import useAuth from "@/utils/useAuth";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    CheckCircle2,
    Save,
    Download,
    Maximize2,
    Minimize2,
    LayoutTemplate,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { contentToMarkdown, countWords, extractPlainText, readingTimeMinutes } from "@/app/app/notes/utils/noteContentUtils";
import { NOTE_TEMPLATES, NoteTemplate } from "@/app/app/notes/utils/noteTemplates";

function TemplatePickerDialog({
    open,
    onOpenChange,
    onSelect,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onSelect: (tpl: NoteTemplate) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Choose a template</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3 py-2">
                    {NOTE_TEMPLATES.map((tpl) => (
                        <button
                            key={tpl.id}
                            onClick={() => { onSelect(tpl); onOpenChange(false); }}
                            className={cn(
                                "flex flex-col items-start gap-1.5 p-4 rounded-xl border text-left",
                                "hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
                            )}
                        >
                            <span className="text-2xl">{tpl.icon}</span>
                            <span className="text-sm font-semibold">{tpl.label}</span>
                            <span className="text-[11px] text-muted-foreground">{tpl.description}</span>
                        </button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function NotionEditor() {
    const tEditor = useTranslations("Notes.editor");
    const tCtx = useTranslations("Notes.context");
    const { notes, activeNoteId, updateNote, focusMode, setFocusMode } = useNotes();
    const activeNote = notes.find(n => n.id === activeNoteId);
    const { user } = useAuth();

    const [title, setTitle] = useState("");
    const [isMounted, setIsMounted] = useState(false);
    const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
    const [currentContent, setCurrentContent] = useState<ContainerNode | null>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const [lastSyncedNoteId, setLastSyncedNoteId] = useState<string | null>(null);

    useEffect(() => {
        if (activeNote && activeNote.id !== lastSyncedNoteId) {
            setTitle(activeNote.title);
            setLastSyncedNoteId(activeNote.id);
        }
    }, [activeNoteId, activeNote, lastSyncedNoteId]);

    useEffect(() => {
        if (saveState !== "saved") return;
        const timeout = setTimeout(() => setSaveState("idle"), 1600);
        return () => clearTimeout(timeout);
    }, [saveState]);

    const sanitizeForFirestore = (obj: any): any => {
        if (obj === null || obj === undefined) return null;
        if (typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
        const sanitized: any = {};
        for (const key in obj) {
            const value = obj[key];
            if (value !== undefined) sanitized[key] = sanitizeForFirestore(value);
        }
        return sanitized;
    };

    const handleUpdate = useCallback(async (id: string, updates: any) => {
        if (id) {
            setSaveState("saving");
            const sanitizedUpdates = sanitizeForFirestore(updates);
            await updateNote(id, sanitizedUpdates);
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
            setSaveState("saving");
            debouncedUpdate(activeNoteId, { content: container });
        }
    };

    const handleUploadImage = async (file: File): Promise<string> => {
        if (!user) throw new Error(tCtx("authRequiredError"));
        const timestamp = Date.now();
        const storageRef = ref(storage, `notes/${user.uid}/${activeNoteId}/${timestamp}_${file.name}`);
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
    };

    const initialContent = useMemo(() => {
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeNoteId]);

    const activePath = useMemo(() => {
        if (!activeNote) return [];
        const byId = new Map(notes.map((n) => [n.id, n]));
        const path: typeof notes = [];
        let cursor = activeNote;
        const guard = new Set<string>();
        while (cursor && !guard.has(cursor.id)) {
            path.unshift(cursor);
            guard.add(cursor.id);
            if (!cursor.parentId) break;
            const parent = byId.get(cursor.parentId);
            if (!parent) break;
            cursor = parent;
        }
        return path;
    }, [activeNote, notes]);

    const saveNow = useCallback(async () => {
        if (!activeNoteId) return;
        await debouncedUpdate.flush();
    }, [activeNoteId, debouncedUpdate]);

    // Word count from current in-memory content
    const { wordCount, readTime } = useMemo(() => {
        const src = currentContent ?? (activeNote?.content as ContainerNode | undefined);
        const text = extractPlainText(src);
        const wc = countWords(text);
        return { wordCount: wc, readTime: readingTimeMinutes(wc) };
    }, [currentContent, activeNote?.content]);

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

    const handleApplyTemplate = useCallback((tpl: NoteTemplate) => {
        if (!activeNoteId) return;
        const newContent = { ...tpl.content, id: "root" };
        setSaveState("saving");
        debouncedUpdate(activeNoteId, { content: newContent, title: tpl.defaultTitle });
        setTitle(tpl.defaultTitle);
        setLastSyncedNoteId(null); // force re-sync
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
    }, [saveNow, setFocusMode]);

    if (!activeNoteId) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                {tEditor("emptyState")}
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
                {!focusMode && (
                    <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground overflow-x-auto no-scrollbar">
                        {activePath.map((node, index) => (
                            <React.Fragment key={node.id}>
                                <span className={index === activePath.length - 1 ? "text-foreground font-medium" : ""}>
                                    {node.title || tEditor("titlePlaceholder")}
                                </span>
                                {index < activePath.length - 1 && <span>/</span>}
                            </React.Fragment>
                        ))}
                    </div>
                )}

                {/* Toolbar */}
                <div className="mb-2 flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-[10px]">
                        {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Ready"}
                    </Badge>
                    {lastSavedAt && (
                        <span className="text-[10px] text-muted-foreground">
                            {lastSavedAt.toLocaleTimeString()}
                        </span>
                    )}
                    {/* Word count */}
                    {wordCount > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                            {wordCount} words · {readTime} min read
                        </span>
                    )}

                    <div className="ml-auto flex items-center gap-1">
                        {/* Template picker */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1.5"
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
                            className="h-7 text-xs gap-1.5"
                            onClick={handleExportMarkdown}
                            title="Export as Markdown"
                        >
                            <Download className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">.md</span>
                        </Button>

                        {/* Focus mode */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1.5"
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
                            className="h-7 text-xs"
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
            </div>

            <div className={cn(
                "flex-1 overflow-y-auto px-4 md:px-8 mx-auto w-full pb-20",
                focusMode ? "max-w-3xl" : "max-w-6xl"
            )}>
                <EditorProvider
                    key={activeNoteId}
                    initialContainer={initialContent}
                    onChange={handleEditorChange}
                >
                    <Editor onUploadImage={handleUploadImage} />
                </EditorProvider>
            </div>

            <TemplatePickerDialog
                open={templateDialogOpen}
                onOpenChange={setTemplateDialogOpen}
                onSelect={handleApplyTemplate}
            />
        </div>
    );
}
