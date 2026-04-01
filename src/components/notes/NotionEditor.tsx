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
import { CheckCircle2, Save } from "lucide-react";

export default function NotionEditor() {
    const tEditor = useTranslations("Notes.editor");
    const tCtx = useTranslations("Notes.context");
    const { notes, activeNoteId, updateNote } = useNotes();
    const activeNote = notes.find(n => n.id === activeNoteId);
    const { user } = useAuth();

    const [title, setTitle] = useState("");
    const [isMounted, setIsMounted] = useState(false);
    const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const [lastSyncedNoteId, setLastSyncedNoteId] = useState<string | null>(null);

    // Only update title from store when switching notes, not on every store update
    // This prevents local typing from being overwritten by slightly delayed store updates
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
            if (value !== undefined) {
                sanitized[key] = sanitizeForFirestore(value);
            }
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
        const currentContent = state.history[state.historyIndex];
        if (activeNoteId) {
            setSaveState("saving");
            debouncedUpdate(activeNoteId, { content: currentContent });
        }
    };

    const handleUploadImage = async (file: File): Promise<string> => {
        if (!user) throw new Error(tCtx("authRequiredError"));

        const timestamp = Date.now();
        const storageRef = ref(storage, `notes/${user.uid}/${activeNoteId}/${timestamp}_${file.name}`);

        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        return url;
    };

    // Memoize initial content to prevent unnecessary re-renders/resets
    const initialContent = useMemo(() => {
        if (activeNote && activeNote.content) {
            // Check if content is compatible with Mina Rich Editor (has children array)
            const content = activeNote.content as any;
            if (content.type === 'container' && Array.isArray(content.children)) {
                return content as ContainerNode;
            }
            // If incompatible (e.g. old Tiptap content), fall back to empty
            // We'll preserve the old content in the database until the user saves new changes
        }
        return {
            id: "root",
            type: "container",
            children: createEmptyContent(),
            attributes: {},
        } as ContainerNode;

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeNoteId]); // Only change when note ID changes, ignore content updates

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

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
                event.preventDefault();
                void saveNow();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [saveNow]);

    if (!activeNoteId) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                {tEditor("emptyState")}
            </div>
        );
    }

    if (!activeNote) return null;

    if (!isMounted) return null;

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
            <div className="p-4 md:p-6 pb-2 md:pb-4 max-w-6xl mx-auto w-full">
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
                <div className="mb-2 flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                        {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : "Ready"}
                    </Badge>
                    {lastSavedAt && (
                        <span className="text-[10px] text-muted-foreground">
                            Last saved at {lastSavedAt.toLocaleTimeString()}
                        </span>
                    )}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-7 text-xs"
                        onClick={() => void saveNow()}
                    >
                        {saveState === "saved" ? <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                        Save now
                    </Button>
                </div>
                <Input
                    value={title}
                    onChange={handleTitleChange}
                    className="text-3xl md:text-4xl font-bold border-none shadow-none focus-visible:ring-0 px-0 placeholder:text-muted-foreground/50 h-auto bg-transparent"
                    placeholder={tEditor("titlePlaceholder")}
                />
            </div>

            <div className="flex-1 overflow-y-auto px-4 md:px-8 max-w-6xl mx-auto w-full pb-20">
                {/* Key forces re-mount when switching notes to ensure clean state */}
                <EditorProvider
                    key={activeNoteId}
                    initialContainer={initialContent}
                    onChange={handleEditorChange}
                >
                    <Editor onUploadImage={handleUploadImage} />
                </EditorProvider>
            </div>
        </div>
    );
}
