"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Note } from "../types/Note";
import { useTranslations } from "next-intl";
import { fetchAllPages } from "@/lib/fetch-all-pages";
import { apiRequestRaw } from "@/lib/backend-api";
import { useCipherKey, cipherKeyErrorMessage } from "@/lib/use-cipher-key";
import { encryptField, decryptField, isEnvelope, type ContentEnvelope } from "@/lib/content-envelope";
import { setCachedPlainText, deleteCachedPlainText, clearPlainTextCache } from "@/components/notes/notes-helpers";

const NOTES_PAGE_SIZE = 500;
const EMPTY_CONTENT: Map<string, unknown> = new Map();

/** Decrypted bodies plus the cipher key they belong to (see `contentStore`). */
interface ContentStore {
    key: CryptoKey | null;
    map: Map<string, unknown>;
}

interface NotesData {
    /** Metadata only — `content` is always null. Bodies live in NotesContentContext. */
    notes: Note[];
    noteById: Map<string, Note>;
    isLoading: boolean;
    /** True once every body has been decrypted into the plain-text search cache. */
    searchIndexReady: boolean;
}

interface NotesContent {
    contentById: Map<string, unknown>;
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
    warmSearchIndex: () => Promise<void>;
}

type NotesContextType = NotesData & NotesContent & NotesUI & NotesActions;

const NotesDataContext = createContext<NotesData | undefined>(undefined);
const NotesContentContext = createContext<NotesContent | undefined>(undefined);
const NotesUIContext = createContext<NotesUI | undefined>(undefined);
const NotesActionsContext = createContext<NotesActions | undefined>(undefined);

export function NotesProvider({ children }: { children: React.ReactNode }) {
    const t = useTranslations("Notes.context");
    const [notes, setNotes] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isContentLoading, setIsContentLoading] = useState(false);
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [focusMode, setFocusMode] = useState(false);
    // Decrypted bodies, tagged with the key they were decrypted under: a vault
    // lock/unlock invalidates the whole map on read, with no reset effect.
    const [contentStore, setContentStore] = useState<ContentStore>({ key: null, map: EMPTY_CONTENT });
    // Same trick for the search index.
    const [warmedKey, setWarmedKey] = useState<CryptoKey | null>(null);
    const contentStoreRef = useRef(contentStore);
    useEffect(() => { contentStoreRef.current = contentStore; }, [contentStore]);
    // Body saves bump updatedAt server-side. Writing that into `notes` on every
    // autosave would re-render the whole sidebar once per second, so it's parked
    // here and flushed when the user switches notes.
    const pendingMetaTouch = useRef<Map<string, string>>(new Map());
    const warmedKeyRef = useRef<CryptoKey | null>(warmedKey);
    useEffect(() => { warmedKeyRef.current = warmedKey; }, [warmedKey]);
    const warmInFlight = useRef<Promise<void> | null>(null);
    const contentLoadedIds = useRef<Set<string>>(new Set());
    // Cipher key the loaded bodies were decrypted under — a mismatch invalidates
    // them (see the body-loading effect below).
    const loadedUnderKey = useRef<CryptoKey | null>(null);
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
    const cipherKeyRef = useRef<CryptoKey | null>(cipherKey);
    useEffect(() => { notesRef.current = notes; }, [notes]);
    useEffect(() => { activeNoteIdRef.current = activeNoteId; }, [activeNoteId]);
    useEffect(() => { cipherKeyRef.current = cipherKey; }, [cipherKey]);

    const setContent = useCallback((id: string, content: unknown) => {
        const key = cipherKeyRef.current;
        setContentStore((prev) => (prev.key === key
            ? { key, map: new Map(prev.map).set(id, content) }
            : { key, map: new Map([[id, content]]) }));
    }, []);

    // Decrypt one note's body. Legacy plaintext notes (pre-encryption) pass
    // through untouched. Returns null (and flags the note locked) when the key is
    // unavailable — writing that placeholder back would clobber the real body.
    const decryptBody = useCallback(async (n: Note): Promise<unknown> => {
        if (!isEnvelope(n.content)) { lockedIds.current.delete(n.id); return n.content ?? null; }
        const key = cipherKeyRef.current;
        if (!key) { lockedIds.current.add(n.id); return null; }
        try {
            const content = await decryptField(key, n.content as ContentEnvelope);
            lockedIds.current.delete(n.id);
            return content;
        } catch {
            lockedIds.current.add(n.id);
            return null;
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

            const { status, data } = await apiRequestRaw<T>(method, path, body);
            if (status < 200 || status >= 300) {
                throw new Error(`API ${method} ${path} failed (${status})`);
            }
            return data as T;
        },
        [t]
    );

    const refreshNotes = useCallback(async () => {
        // Metadata only: the list endpoint nulls bodies. Bodies load per opened
        // note, and in bulk on the first search (warmSearchIndex). No crypto here.
        const allNotes = await fetchAllPages<Note>({
            pageSize: NOTES_PAGE_SIZE,
            fetchPage: (skip, limit) =>
                apiRequest<Note[]>(
                    "GET",
                    `/api/v1/notes?skip=${skip}&limit=${limit}`
                ),
        });
        setNotes([...allNotes].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    }, [apiRequest]);

    // Body of the active note. Runs on cipherKey change too: a note opened while
    // the vault was locked holds a null placeholder, and the plain-text cache is
    // module state — both must be invalidated and refetched under the new key, or
    // the editor shows an empty document and the next keystroke saves that over
    // the real body. (Invalidation lives here, not in its own [cipherKey] effect,
    // so it can't run *after* this one and leave the refetch skipped.)
    useEffect(() => {
        if (loadedUnderKey.current !== cipherKey) {
            loadedUnderKey.current = cipherKey;
            contentLoadedIds.current.clear();
            lockedIds.current.clear();
            clearPlainTextCache();
        }
        if (!activeNoteId || contentLoadedIds.current.has(activeNoteId)) return;
        let cancelled = false;
        setIsContentLoading(true);
        apiRequest<Note>("GET", `/api/v1/notes/${activeNoteId}`)
            .then(async (full) => {
                if (!full?.id) return;
                const body = await decryptBody(full);
                if (cancelled) return;
                // Only mark loaded once the body is actually available (unlocked).
                if (!lockedIds.current.has(full.id)) {
                    contentLoadedIds.current.add(activeNoteId);
                    setCachedPlainText(full.id, body);
                }
                setContent(full.id, body);
            })
            .catch(() => { /* note may have been deleted */ })
            .finally(() => { if (!cancelled) setIsContentLoading(false); });
        return () => { cancelled = true; };
    }, [activeNoteId, cipherKey, apiRequest, decryptBody, setContent]);

    // Flush parked updatedAt bumps from body saves when the user leaves a note —
    // one re-render per switch instead of one per autosave.
    useEffect(() => {
        const pending = pendingMetaTouch.current;
        if (!pending.size) return;
        const touches = new Map(pending);
        pending.clear();
        setNotes((prev) => prev.map((n) => {
            const ts = touches.get(n.id);
            return ts && ts !== n.updatedAt ? { ...n, updatedAt: ts } : n;
        }));
    }, [activeNoteId]);

    useEffect(() => {
        (async () => {
            try {
                setIsLoading(true);
                await refreshNotes();
            } finally {
                setIsLoading(false);
            }
        })();
        // No cipherKey dep: metadata is plaintext on the wire and doesn't depend
        // on the vault key. Bodies are handled by the effect below.
    }, [refreshNotes]);

    /**
     * Decrypt every note body once into the plain-text search cache. Only the
     * extracted text is retained — raw bodies are dropped — so memory doesn't
     * double. Concurrent callers share the in-flight promise.
     */
    const warmSearchIndex = useCallback(async (): Promise<void> => {
        const key = cipherKeyRef.current;
        if (key && warmedKeyRef.current === key) return;
        if (warmInFlight.current) return warmInFlight.current;
        const run = (async () => {
            const all = await fetchAllPages<Note>({
                pageSize: NOTES_PAGE_SIZE,
                fetchPage: (skip, limit) =>
                    apiRequest<Note[]>(
                        "GET",
                        `/api/v1/notes?content=1&skip=${skip}&limit=${limit}`
                    ),
            });
            await Promise.all(all.map(async (n) => {
                setCachedPlainText(n.id, await decryptBody(n));
            }));
            setWarmedKey(key);
        })();
        warmInFlight.current = run;
        try {
            await run;
        } finally {
            warmInFlight.current = null;
        }
    }, [apiRequest, decryptBody]);

    const createNote = useCallback(async (parentId: string | null = null) => {
        const created = await apiRequest<Note>("POST", "/api/v1/notes", {
            title: t("defaultTitle"),
            content: await encryptContent({}),
            parentId,
            icon: undefined,
        });
        if (!created?.id) throw new Error("Note create failed");
        contentLoadedIds.current.add(created.id);
        setContent(created.id, {});
        setActiveNoteId(created.id);
        // Server echoes the envelope back; the metadata array never carries a body.
        setNotes((prev) => [...prev, { ...created, content: null }].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
        return created.id;
    }, [apiRequest, t, encryptContent, setContent]);

    const updateNote = useCallback(async (id: string, updates: Partial<Note>) => {
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

        const contentOnly = updates.content !== undefined
            && updates.title === undefined && updates.parentId === undefined
            && updates.icon === undefined && updates.pinned === undefined
            && updates.tags === undefined;

        if (updates.content !== undefined) {
            contentLoadedIds.current.add(id);
            setContent(id, updates.content);
            // Keep the note searchable under its edited text without a re-warm.
            setCachedPlainText(id, updates.content);
        }

        if (contentOnly) {
            // ponytail: sidebar "Last modified" lags until the next note switch
            // flushes this. Sorting live would cost a whole-sidebar re-render per
            // autosave — the exact churn this split removes.
            pendingMetaTouch.current.set(id, updated.updatedAt);
            return;
        }

        // Metadata echo only — the body stays in contentById.
        setNotes((prev) => prev.map((n) => (n.id === updated.id ? { ...updated, content: null } : n)));
    }, [apiRequest, encryptContent, setContent]);

    const pinNote = useCallback(async (id: string, pinned: boolean) => {
        await updateNote(id, { pinned });
    }, [updateNote]);

    const duplicateNote = useCallback(async (id: string) => {
        const src = notesRef.current.find((n) => n.id === id);
        if (!src) throw new Error("Note not found");
        const store = contentStoreRef.current;
        let content: unknown = (store.key === cipherKeyRef.current ? store.map.get(id) : undefined) ?? null;
        if (!contentLoadedIds.current.has(id)) {
            const full = await apiRequest<Note>("GET", `/api/v1/notes/${id}`);
            if (!full?.id) throw new Error("Note fetch failed");
            content = await decryptBody(full);
            if (!lockedIds.current.has(id)) {
                contentLoadedIds.current.add(id);
                setContent(id, content);
                setCachedPlainText(id, content);
            }
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
        setContent(created.id, content);
        setCachedPlainText(created.id, content);
        setActiveNoteId(created.id);
        setNotes((prev) => [...prev, { ...created, content: null }].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
        return created.id;
    }, [apiRequest, t, decryptBody, encryptContent, setContent]);

    const moveNote = useCallback(async (id: string, newParentId: string | null) => {
        await updateNote(id, { parentId: newParentId });
    }, [updateNote]);

    const deleteNote = useCallback(async (id: string) => {
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
        for (const did of toDelete) {
            contentLoadedIds.current.delete(did);
            lockedIds.current.delete(did);
            pendingMetaTouch.current.delete(did);
            deleteCachedPlainText(did);
        }
        setContentStore((prev) => {
            const next = new Map(prev.map);
            for (const did of toDelete) next.delete(did);
            return { key: prev.key, map: next };
        });
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

    // Warmed/decrypted under a different key (or none) means it's stale.
    const searchIndexReady = warmedKey !== null && warmedKey === cipherKey;
    const contentById = contentStore.key === cipherKey ? contentStore.map : EMPTY_CONTENT;

    const dataValue = useMemo<NotesData>(
        () => ({ notes, noteById, isLoading, searchIndexReady }),
        [notes, noteById, isLoading, searchIndexReady]
    );

    const contentValue = useMemo<NotesContent>(
        () => ({ contentById, isContentLoading }),
        [contentById, isContentLoading]
    );

    const uiValue = useMemo<NotesUI>(
        () => ({ activeNoteId, setActiveNoteId, focusMode, setFocusMode }),
        [activeNoteId, focusMode]
    );

    const actionsValue = useMemo<NotesActions>(
        () => ({ createNote, updateNote, deleteNote, pinNote, duplicateNote, moveNote, warmSearchIndex }),
        [createNote, updateNote, deleteNote, pinNote, duplicateNote, moveNote, warmSearchIndex]
    );

    return (
        <NotesActionsContext.Provider value={actionsValue}>
            <NotesUIContext.Provider value={uiValue}>
                <NotesDataContext.Provider value={dataValue}>
                    <NotesContentContext.Provider value={contentValue}>
                        {children}
                    </NotesContentContext.Provider>
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

export function useNotesContent(): NotesContent {
    const ctx = useContext(NotesContentContext);
    if (ctx === undefined) throw new Error("useNotesContent must be used within a NotesProvider");
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
    return { ...useNotesData(), ...useNotesContent(), ...useNotesUI(), ...useNotesActions() };
}
