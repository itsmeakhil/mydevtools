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

export default function NotionEditor() {
    const tEditor = useTranslations("Notes.editor");
    const tCtx = useTranslations("Notes.context");
    const { notes, activeNoteId, updateNote } = useNotes();
    const activeNote = notes.find(n => n.id === activeNoteId);
    const { user } = useAuth();

    const [title, setTitle] = useState("");
    const [isMounted, setIsMounted] = useState(false);

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
            const sanitizedUpdates = sanitizeForFirestore(updates);
            await updateNote(id, sanitizedUpdates);
        }
    }, [updateNote]);

    const debouncedUpdate = useDebouncedCallback(handleUpdate, 1000);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        setTitle(newTitle);
        if (activeNoteId) {
            debouncedUpdate(activeNoteId, { title: newTitle });
        }
    };

    const handleEditorChange = (state: EditorState) => {
        const currentContent = state.history[state.historyIndex];
        if (activeNoteId) {
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
