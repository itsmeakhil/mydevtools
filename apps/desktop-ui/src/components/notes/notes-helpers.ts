import type { Note } from "@/app/app/notes/types/Note";
import { extractPlainText } from "@/app/app/notes/utils/noteContentUtils";

export type SortKey = "createdAt" | "updatedAt" | "title";
export type SortDir = "asc" | "desc";

// Module-level incremental cache for plain text. Keyed by `id|updatedAt` so
// only modified notes recompute when state updates. Bounded to prevent unbounded
// growth across long sessions where notes are repeatedly edited.
const PLAIN_TEXT_CACHE_MAX = 500;
const plainTextCache = new Map<string, string>();
export function getCachedPlainText(note: Note): string {
    const key = `${note.id}|${note.updatedAt}`;
    let v = plainTextCache.get(key);
    if (v === undefined) {
        if (plainTextCache.size >= PLAIN_TEXT_CACHE_MAX) {
            const first = plainTextCache.keys().next().value;
            if (first !== undefined) plainTextCache.delete(first);
        }
        v = extractPlainText(note.content);
        plainTextCache.set(key, v);
    }
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
