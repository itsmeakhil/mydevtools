/**
 * Per-connection saved snippets.
 * ponytail: localStorage scoped by connectionId; sync across tabs via 'storage' event.
 * If users want cross-device sync, upgrade to backend persistence — keep API same.
 */

export interface Snippet {
    id: string;
    name: string;
    command: string;
}

const KEY_PREFIX = "redis-cmd-snippets:";

function storageKey(connectionId: string): string {
    return KEY_PREFIX + connectionId;
}

export function loadSnippets(connectionId: string): Snippet[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(storageKey(connectionId));
        if (!raw) return [];
        const parsed = JSON.parse(raw) as Snippet[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function saveSnippets(connectionId: string, snippets: Snippet[]): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey(connectionId), JSON.stringify(snippets));
}

export function addSnippet(connectionId: string, name: string, command: string): Snippet {
    const snippet: Snippet = {
        id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: name.trim() || command.split(/\s+/)[0] || "Snippet",
        command,
    };
    const all = loadSnippets(connectionId);
    all.unshift(snippet);
    saveSnippets(connectionId, all);
    return snippet;
}

export function deleteSnippet(connectionId: string, id: string): void {
    const all = loadSnippets(connectionId).filter((s) => s.id !== id);
    saveSnippets(connectionId, all);
}
