"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Note } from "../types/Note";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/database/firebase";
import { useTranslations } from "next-intl";
import { fetchAllPages } from "@/lib/fetch-all-pages";

const BACKEND_BASE_URL: string =
    process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
    "http://localhost:8000";
const NOTES_PAGE_SIZE = 500;

interface NotesData {
    notes: Note[];
    isLoading: boolean;
    isContentLoading: boolean;
}

interface NotesUI {
    activeNoteId: string | null;
    setActiveNoteId: (id: string | null) => void;
    focusMode: boolean;
    setFocusMode: (v: boolean) => void;
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
    const contentLoadedIds = useRef<Set<string>>(new Set());

    // Refs to read latest state inside stable action callbacks
    const notesRef = useRef<Note[]>(notes);
    const activeNoteIdRef = useRef<string | null>(activeNoteId);
    const userRef = useRef(user);
    useEffect(() => { notesRef.current = notes; }, [notes]);
    useEffect(() => { activeNoteIdRef.current = activeNoteId; }, [activeNoteId]);
    useEffect(() => { userRef.current = user; }, [user]);

    const apiRequest = useCallback(
        async <T,>(method: string, path: string, body?: unknown): Promise<T> => {
            const currentUser = userRef.current;
            if (!currentUser) throw new Error(t("authRequiredError"));

            const url = new URL(path, BACKEND_BASE_URL).toString();

            const headers: Record<string, string> = {};
            if (body !== undefined && body !== null && method !== "GET" && method !== "HEAD") {
                headers["Content-Type"] = "application/json";
            }

            const proxyRes = await fetch("/api/proxy", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url,
                    method,
                    headers,
                    body: body !== undefined ? JSON.stringify(body) : undefined,
                }),
            });

            const proxyData = await proxyRes.json();
            if (proxyData.status < 200 || proxyData.status >= 300) {
                throw new Error(proxyData.body || proxyData.statusText || "API request failed");
            }

            const responseBody = proxyData.body as string;
            if (!responseBody) {
                return undefined as T;
            }

            try {
                return JSON.parse(responseBody) as T;
            } catch {
                return responseBody as unknown as T;
            }
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
        setNotes([...allNotes].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    }, [apiRequest]);

    useEffect(() => {
        if (!activeNoteId || contentLoadedIds.current.has(activeNoteId)) return;
        let cancelled = false;
        setIsContentLoading(true);
        apiRequest<Note>("GET", `/api/v1/notes/${activeNoteId}`)
            .then((full) => {
                if (cancelled) return;
                contentLoadedIds.current.add(activeNoteId);
                setNotes((prev) => prev.map((n) => (n.id === full.id ? full : n)));
            })
            .catch(() => { /* note may have been deleted */ })
            .finally(() => { if (!cancelled) setIsContentLoading(false); });
        return () => { cancelled = true; };
    }, [activeNoteId, apiRequest]);

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
    }, [refreshNotes, user]);

    const createNote = useCallback(async (parentId: string | null = null) => {
        if (!userRef.current) throw new Error(t("authRequiredError"));
        const created = await apiRequest<Note>("POST", "/api/v1/notes", {
            title: t("defaultTitle"),
            content: {},
            parentId,
            icon: undefined,
        });
        contentLoadedIds.current.add(created.id);
        setActiveNoteId(created.id);
        setNotes((prev) => [...prev, created].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
        return created.id;
    }, [apiRequest, t]);

    const updateNote = useCallback(async (id: string, updates: Partial<Note>) => {
        if (!userRef.current) return;
        const payload: Partial<Pick<Note, "title" | "content" | "parentId" | "icon" | "pinned" | "tags">> = {};
        if (updates.title !== undefined) payload.title = updates.title;
        if (updates.content !== undefined) payload.content = updates.content;
        if (updates.parentId !== undefined) payload.parentId = updates.parentId;
        if (updates.icon !== undefined) payload.icon = updates.icon;
        if (updates.pinned !== undefined) payload.pinned = updates.pinned;
        if (updates.tags !== undefined) payload.tags = updates.tags;

        const updated = await apiRequest<Note>("PATCH", `/api/v1/notes/${id}`, payload);
        if (updates.content !== undefined) contentLoadedIds.current.add(id);
        setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    }, [apiRequest]);

    const pinNote = useCallback(async (id: string, pinned: boolean) => {
        await updateNote(id, { pinned });
    }, [updateNote]);

    const duplicateNote = useCallback(async (id: string) => {
        const src = notesRef.current.find((n) => n.id === id);
        if (!src) throw new Error("Note not found");
        let content = src.content;
        if (!contentLoadedIds.current.has(id)) {
            const full = await apiRequest<Note>("GET", `/api/v1/notes/${id}`);
            contentLoadedIds.current.add(id);
            setNotes((prev) => prev.map((n) => (n.id === full.id ? full : n)));
            content = full.content;
        }
        const created = await apiRequest<Note>("POST", "/api/v1/notes", {
            title: `${src.title || t("defaultTitle")} (copy)`,
            content,
            parentId: src.parentId ?? null,
            icon: src.icon,
            tags: src.tags,
        });
        contentLoadedIds.current.add(created.id);
        setActiveNoteId(created.id);
        setNotes((prev) => [...prev, created].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
        return created.id;
    }, [apiRequest, t]);

    const moveNote = useCallback(async (id: string, newParentId: string | null) => {
        await updateNote(id, { parentId: newParentId });
    }, [updateNote]);

    const deleteNote = useCallback(async (id: string) => {
        if (!userRef.current) return;
        await apiRequest<void>("DELETE", `/api/v1/notes/${id}?recursive=true`);
        contentLoadedIds.current.delete(id);
        if (activeNoteIdRef.current === id) {
            setActiveNoteId(null);
        }
        await refreshNotes();
    }, [apiRequest, refreshNotes]);

    const dataValue = useMemo<NotesData>(
        () => ({ notes, isLoading, isContentLoading }),
        [notes, isLoading, isContentLoading]
    );

    const uiValue = useMemo<NotesUI>(
        () => ({ activeNoteId, setActiveNoteId, focusMode, setFocusMode }),
        [activeNoteId, focusMode]
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
