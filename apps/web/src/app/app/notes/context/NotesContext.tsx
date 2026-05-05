"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
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

interface NotesContextType {
    notes: Note[];
    isLoading: boolean;
    activeNoteId: string | null;
    setActiveNoteId: (id: string | null) => void;
    focusMode: boolean;
    setFocusMode: (v: boolean) => void;
    createNote: (parentId?: string | null) => Promise<string>;
    updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
    deleteNote: (id: string) => Promise<void>;
    pinNote: (id: string, pinned: boolean) => Promise<void>;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export function NotesProvider({ children }: { children: React.ReactNode }) {
    const t = useTranslations("Notes.context");
    const [user] = useAuthState(auth);
    const [notes, setNotes] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [focusMode, setFocusMode] = useState(false);

    const apiRequest = useCallback(
        async <T,>(method: string, path: string, body?: unknown): Promise<T> => {
            if (!user) throw new Error(t("authRequiredError"));

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
        [user, t]
    );

    const refreshNotes = useCallback(async () => {
        if (!user) return;
        const allNotes = await fetchAllPages<Note>({
            pageSize: NOTES_PAGE_SIZE,
            fetchPage: (skip, limit) =>
                apiRequest<Note[]>(
                    "GET",
                    `/api/v1/notes?skip=${skip}&limit=${limit}`
                ),
        });
        // Keep stable ordering in case server ordering changes.
        setNotes([...allNotes].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    }, [apiRequest, user]);

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
        if (!user) throw new Error(t("authRequiredError"));
        const created = await apiRequest<Note>("POST", "/api/v1/notes", {
            title: t("defaultTitle"),
            content: {},
            parentId,
            // Backend/UI uses `note.icon || "📄"` fallback.
            icon: undefined,
        });
        setActiveNoteId(created.id);
        setNotes((prev) => [...prev, created].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
        return created.id;
    }, [apiRequest, user, t]);

    const updateNote = useCallback(async (id: string, updates: Partial<Note>) => {
        if (!user) return;
        const payload: Partial<Pick<Note, "title" | "content" | "parentId" | "icon">> = {};
        if (updates.title !== undefined) payload.title = updates.title;
        if (updates.content !== undefined) payload.content = updates.content;
        if (updates.parentId !== undefined) payload.parentId = updates.parentId;
        if (updates.icon !== undefined) payload.icon = updates.icon;

        const updated = await apiRequest<Note>("PATCH", `/api/v1/notes/${id}`, payload);
        setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    }, [apiRequest, user]);

    const pinNote = useCallback(async (id: string, pinned: boolean) => {
        await updateNote(id, { pinned });
    }, [updateNote]);

    const deleteNote = useCallback(async (id: string) => {
        if (!user) return;
        await apiRequest<void>("DELETE", `/api/v1/notes/${id}?recursive=true`);
        if (activeNoteId === id) {
            setActiveNoteId(null);
        }
        await refreshNotes();
    }, [apiRequest, user, activeNoteId, refreshNotes]);

    return (
        <NotesContext.Provider
            value={{
                notes,
                isLoading,
                activeNoteId,
                setActiveNoteId,
                focusMode,
                setFocusMode,
                createNote,
                updateNote,
                deleteNote,
                pinNote,
            }}
        >
            {children}
        </NotesContext.Provider>
    );
}

export function useNotes() {
    const context = useContext(NotesContext);
    if (context === undefined) {
        throw new Error("useNotes must be used within a NotesProvider");
    }
    return context;
}
