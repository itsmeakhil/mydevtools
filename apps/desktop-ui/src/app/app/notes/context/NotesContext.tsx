"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Note } from "../types/Note";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/database/firebase";
import { useTranslations } from "next-intl";
import { fetchAllPages } from "@/lib/fetch-all-pages";
import { proxyJsonAuthed } from "@/lib/backend-auth";
import { useCipherKey, cipherKeyErrorMessage } from "@/lib/use-cipher-key";
import { encryptField, decryptField, isEnvelope, type ContentEnvelope } from "@/lib/content-envelope";

const BACKEND_BASE_URL: string =
    process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
    "http://localhost:8000";
const NOTES_PAGE_SIZE = 500;

interface NotesData {
    notes: Note[];
    noteById: Map<string, Note>;
    isLoading: boolean;
    isContentLoading: boolean;
}

interface NotesUI {
    activeNoteId: string | null;
    setActiveNoteId: (id: string | null) => void;
    focusMode: boolean;
    setFocusMode: (v: boolean) => void;
    sidebarOpen: boolean;
    setSidebarOpen: (v: boolean) => void;
}

interface NotesActions {
    createNote: (parentId?: string | null) => Promise<string>;
    updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
    deleteNote: (id: string) => Promise<void>;
    pinNote: (id: string, pinned: boolean) => Promise<void>;
    duplicateNote: (id: string) => Promise<string>;
    moveNote: (id: string, newParentId: string | null) => Promise<void>;
}

type NotesContextType = NotesData & NotesUI & NotesActions;

const NotesDataContext = createContext<NotesData | undefined>(undefined);
const NotesUIContext = createContext<NotesUI | undefined>(undefined);
const NotesActionsContext = createContext<NotesActions | undefined>(undefined);

export function NotesProvider({ children }: { children: React.ReactNode }) {
    const t = useTranslations("Notes.context");
    const [user] = useAuthState(auth);
    const [notes, setNotes] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isContentLoading, setIsContentLoading] = useState(false);
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [focusMode, setFocusMode] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const contentLoadedIds = useRef<Set<string>>(new Set());
    // Notes whose content is an envelope we couldn't decrypt (vault locked). Their
    // in-state `content` is a null placeholder — writing it back would clobber the
    // real body, so content writes are blocked until unlock.
    const lockedIds = useRef<Set<string>>(new Set());

    // Zero-knowledge: note bodies are AES-GCM envelopes on the wire; `notes` state
    // always holds decrypted content. Key comes from the master-password gate.
    const cipherKey = useCipherKey();

    // Refs to read latest state inside stable action callbacks
    const notesRef = useRef<Note[]>(notes);
    const activeNoteIdRef = useRef<string | null>(activeNoteId);
    const userRef = useRef(user);
    const cipherKeyRef = useRef<CryptoKey | null>(cipherKey);
    useEffect(() => { notesRef.current = notes; }, [notes]);
    useEffect(() => { activeNoteIdRef.current = activeNoteId; }, [activeNoteId]);
    useEffect(() => { userRef.current = user; }, [user]);
    useEffect(() => { cipherKeyRef.current = cipherKey; }, [cipherKey]);

    // Decrypt a note's content envelope into plaintext for in-state use. Legacy
    // plaintext notes (pre-encryption) pass through untouched. When locked, the
    // body becomes a null placeholder and the note is flagged in `lockedIds`.
    const decryptNote = useCallback(async (n: Note): Promise<Note> => {
        if (!isEnvelope(n.content)) { lockedIds.current.delete(n.id); return n; }
        const key = cipherKeyRef.current;
        if (!key) { lockedIds.current.add(n.id); return { ...n, content: null }; }
        try {
            const content = await decryptField(key, n.content as ContentEnvelope);
            lockedIds.current.delete(n.id);
            return { ...n, content };
        } catch {
            lockedIds.current.add(n.id);
            return { ...n, content: null };
        }
    }, []);

    // Encrypt a plaintext body into an envelope for the wire. Throws when locked
    // so callers surface the reason instead of silently persisting an empty body.
    const encryptContent = useCallback(async (content: unknown): Promise<ContentEnvelope> => {
        const key = cipherKeyRef.current;
        if (!key) throw new Error(cipherKeyErrorMessage());
        return encryptField(key, content);
    }, []);

    const apiRequest = useCallback(
        async <T,>(method: string, path: string, body?: unknown): Promise<T> => {
            const currentUser = userRef.current;
            if (!currentUser) throw new Error(t("authRequiredError"));

            const { status, data } = await proxyJsonAuthed<T>(BACKEND_BASE_URL, method, path, body);
            if (status < 200 || status >= 300) {
                throw new Error(`API ${method} ${path} failed (${status})`);
            }
            return data as T;
        },
        [t]
    );

    const refreshNotes = useCallback(async () => {
        if (!userRef.current) return;
        const allNotes = await fetchAllPages<Note>({
            pageSize: NOTES_PAGE_SIZE,
            fetchPage: (skip, limit) =>
                apiRequest<Note[]>(
                    "GET",
                    `/api/v1/notes?skip=${skip}&limit=${limit}`
                ),
        });
        contentLoadedIds.current.clear();
        const decrypted = await Promise.all(allNotes.map(decryptNote));
        setNotes([...decrypted].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    }, [apiRequest, decryptNote]);

    useEffect(() => {
        if (!activeNoteId || contentLoadedIds.current.has(activeNoteId)) return;
        let cancelled = false;
        setIsContentLoading(true);
        apiRequest<Note>("GET", `/api/v1/notes/${activeNoteId}`)
            .then(async (full) => {
                if (!full?.id) return;
                const dec = await decryptNote(full);
                if (cancelled) return;
                // Only mark loaded once the body is actually available (unlocked).
                if (!lockedIds.current.has(dec.id)) contentLoadedIds.current.add(activeNoteId);
                setNotes((prev) => prev.map((n) => (n.id === dec.id ? dec : n)));
            })
            .catch(() => { /* note may have been deleted */ })
            .finally(() => { if (!cancelled) setIsContentLoading(false); });
        return () => { cancelled = true; };
    }, [activeNoteId, apiRequest, decryptNote]);

    useEffect(() => {
        if (!user) {
            setNotes([]);
            setIsLoading(false);
            setActiveNoteId(null);
            return;
        }

        (async () => {
            try {
                setIsLoading(true);
                await refreshNotes();
            } finally {
                setIsLoading(false);
            }
        })();
        // cipherKey in deps: re-fetch + decrypt bodies once the vault unlocks.
    }, [refreshNotes, user, cipherKey]);

    const createNote = useCallback(async (parentId: string | null = null) => {
        if (!userRef.current) throw new Error(t("authRequiredError"));
        const created = await apiRequest<Note>("POST", "/api/v1/notes", {
            title: t("defaultTitle"),
            content: await encryptContent({}),
            parentId,
            icon: undefined,
        });
        if (!created?.id) throw new Error("Note create failed");
        contentLoadedIds.current.add(created.id);
        setActiveNoteId(created.id);
        // Server echoes the envelope back; keep decrypted (empty) body in state.
        const local: Note = { ...created, content: {} };
        setNotes((prev) => [...prev, local].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
        return created.id;
    }, [apiRequest, t, encryptContent]);

    const updateNote = useCallback(async (id: string, updates: Partial<Note>) => {
        if (!userRef.current) return;
        // Block body writes while locked — persisting would clobber the real
        // (undecryptable) content with an empty one.
        if (updates.content !== undefined && (lockedIds.current.has(id) || !cipherKeyRef.current)) {
            throw new Error(cipherKeyErrorMessage());
        }

        // Plaintext metadata for the wire; encrypted body swapped in below.
        const payload: Record<string, unknown> = {};
        if (updates.title !== undefined) payload.title = updates.title;
        if (updates.content !== undefined) payload.content = await encryptContent(updates.content);
        if (updates.parentId !== undefined) payload.parentId = updates.parentId;
        if (updates.icon !== undefined) payload.icon = updates.icon;
        if (updates.pinned !== undefined) payload.pinned = updates.pinned;
        if (updates.tags !== undefined) payload.tags = updates.tags;

        const updated = await apiRequest<Note>("PATCH", `/api/v1/notes/${id}`, payload);
        if (!updated?.id) throw new Error("Update failed: empty response");
        if (updates.content !== undefined) contentLoadedIds.current.add(id);
        // Merge server echo but keep the plaintext body we already hold in memory.
        setNotes((prev) => prev.map((n) => (n.id === updated.id
            ? { ...updated, content: updates.content !== undefined ? updates.content : n.content }
            : n)));
    }, [apiRequest, encryptContent]);

    const pinNote = useCallback(async (id: string, pinned: boolean) => {
        await updateNote(id, { pinned });
    }, [updateNote]);

    const duplicateNote = useCallback(async (id: string) => {
        const src = notesRef.current.find((n) => n.id === id);
        if (!src) throw new Error("Note not found");
        let content = src.content;
        if (!contentLoadedIds.current.has(id)) {
            const full = await apiRequest<Note>("GET", `/api/v1/notes/${id}`);
            if (!full?.id) throw new Error("Note fetch failed");
            const dec = await decryptNote(full);
            if (!lockedIds.current.has(dec.id)) contentLoadedIds.current.add(id);
            setNotes((prev) => prev.map((n) => (n.id === dec.id ? dec : n)));
            content = dec.content;
        }
        if (lockedIds.current.has(id) || !cipherKeyRef.current) throw new Error(cipherKeyErrorMessage());
        const created = await apiRequest<Note>("POST", "/api/v1/notes", {
            title: `${src.title || t("defaultTitle")} (copy)`,
            content: await encryptContent(content),
            parentId: src.parentId ?? null,
            icon: src.icon,
            tags: src.tags,
        });
        if (!created?.id) throw new Error("Note duplicate failed");
        contentLoadedIds.current.add(created.id);
        setActiveNoteId(created.id);
        const local: Note = { ...created, content };
        setNotes((prev) => [...prev, local].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
        return created.id;
    }, [apiRequest, t, decryptNote, encryptContent]);

    const moveNote = useCallback(async (id: string, newParentId: string | null) => {
        await updateNote(id, { parentId: newParentId });
    }, [updateNote]);

    const deleteNote = useCallback(async (id: string) => {
        if (!userRef.current) return;
        await apiRequest<void>("DELETE", `/api/v1/notes/${id}?recursive=true`);

        // Local mutation: compute descendant set, prune in one pass — skip full refetch.
        const childMap = new Map<string | null, string[]>();
        for (const n of notesRef.current) {
            const pid = n.parentId ?? null;
            const arr = childMap.get(pid);
            if (arr) arr.push(n.id);
            else childMap.set(pid, [n.id]);
        }
        const toDelete = new Set<string>([id]);
        const stack = [id];
        while (stack.length) {
            const cur = stack.pop()!;
            const kids = childMap.get(cur);
            if (!kids) continue;
            for (const k of kids) {
                if (!toDelete.has(k)) { toDelete.add(k); stack.push(k); }
            }
        }
        for (const did of toDelete) contentLoadedIds.current.delete(did);
        if (activeNoteIdRef.current && toDelete.has(activeNoteIdRef.current)) {
            setActiveNoteId(null);
        }
        setNotes((prev) => prev.filter((n) => !toDelete.has(n.id)));
    }, [apiRequest]);

    const noteById = useMemo(() => {
        const map = new Map<string, Note>();
        for (const n of notes) map.set(n.id, n);
        return map;
    }, [notes]);

    const dataValue = useMemo<NotesData>(
        () => ({ notes, noteById, isLoading, isContentLoading }),
        [notes, noteById, isLoading, isContentLoading]
    );

    const uiValue = useMemo<NotesUI>(
        () => ({ activeNoteId, setActiveNoteId, focusMode, setFocusMode, sidebarOpen, setSidebarOpen }),
        [activeNoteId, focusMode, sidebarOpen]
    );

    const actionsValue = useMemo<NotesActions>(
        () => ({ createNote, updateNote, deleteNote, pinNote, duplicateNote, moveNote }),
        [createNote, updateNote, deleteNote, pinNote, duplicateNote, moveNote]
    );

    return (
        <NotesActionsContext.Provider value={actionsValue}>
            <NotesUIContext.Provider value={uiValue}>
                <NotesDataContext.Provider value={dataValue}>
                    {children}
                </NotesDataContext.Provider>
            </NotesUIContext.Provider>
        </NotesActionsContext.Provider>
    );
}

export function useNotesData(): NotesData {
    const ctx = useContext(NotesDataContext);
    if (ctx === undefined) throw new Error("useNotesData must be used within a NotesProvider");
    return ctx;
}

export function useNotesUI(): NotesUI {
    const ctx = useContext(NotesUIContext);
    if (ctx === undefined) throw new Error("useNotesUI must be used within a NotesProvider");
    return ctx;
}

export function useNotesActions(): NotesActions {
    const ctx = useContext(NotesActionsContext);
    if (ctx === undefined) throw new Error("useNotesActions must be used within a NotesProvider");
    return ctx;
}

/**
 * Combined hook — subscribes to all three contexts. Prefer the specific
 * hooks (useNotesData / useNotesUI / useNotesActions) when a component only
 * needs a subset, so it doesn't re-render on unrelated changes.
 */
export function useNotes(): NotesContextType {
    return { ...useNotesData(), ...useNotesUI(), ...useNotesActions() };
}
