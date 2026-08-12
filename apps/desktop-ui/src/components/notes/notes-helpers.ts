import type { Note } from "@/app/app/notes/types/Note";
import { extractPlainText } from "@/app/app/notes/utils/noteContentUtils";

export type SortKey = "createdAt" | "updatedAt" | "title";
export type SortDir = "asc" | "desc";

// Module-level plain-text cache for sidebar search, keyed by note id. Notes hold
// metadata only (bodies live in NotesContentContext), so entries are written
// explicitly by the search-index warm and by every content save. Bounded to
// prevent unbounded growth across long sessions.
const PLAIN_TEXT_CACHE_MAX = 500;
const plainTextCache = new Map<string, string>();

function cacheSet(id: string, text: string): void {
    if (!plainTextCache.has(id) && plainTextCache.size >= PLAIN_TEXT_CACHE_MAX) {
        const first = plainTextCache.keys().next().value;
        if (first !== undefined) plainTextCache.delete(first);
    }
    plainTextCache.set(id, text);
}

/** Cache a note's body as searchable plain text. */
export function setCachedPlainText(id: string, content: unknown): void {
    cacheSet(id, extractPlainText(content));
}

/** Forget one note's text (deleted note — plaintext shouldn't linger in memory). */
export function deleteCachedPlainText(id: string): void {
    plainTextCache.delete(id);
}

/** Drop all plaintext (vault lock — decrypted bodies must not survive it). */
export function clearPlainTextCache(): void {
    plainTextCache.clear();
}

/**
 * Plain text for search. Returns "" for a metadata-only note whose body hasn't
 * been warmed yet — such notes stay title/tag-searchable until the index warms.
 */
export function getCachedPlainText(note: Note): string {
    const hit = plainTextCache.get(note.id);
    if (hit !== undefined) return hit;
    if (note.content == null) return "";
    const v = extractPlainText(note.content);
    cacheSet(note.id, v);
    return v;
}

// Pre-computed map from parentId -> children (avoids O(n²) per render)
export type ChildrenMap = Map<string | null, Note[]>;

export function buildChildrenMap(notes: Note[]): ChildrenMap {
    const map: ChildrenMap = new Map();
    for (const note of notes) {
        const pid = note.parentId ?? null;
        if (!map.has(pid)) map.set(pid, []);
        map.get(pid)!.push(note);
    }
    return map;
}
