import type { UnifiedTab } from "@/components/data-explorer/types";

/**
 * A restored tab is only as trustworthy as localStorage: an older build, a
 * future shape change, or any other writer on the same key can leave a value
 * that parses as JSON but is not an array of tabs. `JSON.parse` succeeding is
 * not validation — the shell then calls `tabs.find(...)` and the pane reads
 * `state.dbName`, so an unchecked value white-screens the tool with no way to
 * clear it.
 */
function isStoredTab(value: unknown): value is UnifiedTab {
    if (typeof value !== "object" || value === null) return false;
    const tab = value as Record<string, unknown>;
    return (
        typeof tab.id === "string" &&
        typeof tab.connectionId === "string" &&
        typeof tab.sourceId === "string" &&
        typeof tab.title === "string" &&
        // Every adapter's pane reads its own fields off `state` unguarded.
        typeof tab.state === "object" &&
        tab.state !== null
    );
}

/**
 * Parses persisted tabs, dropping anything malformed. Returns [] for a value
 * that is not an array at all — the caller clears the key when nothing
 * survives. Each surviving tab is rebuilt field by field, so keys retired
 * since it was written (the old `readOnly` snapshot) are dropped instead of
 * being carried forward on the next save.
 */
export function parseStoredTabs(raw: string): UnifiedTab[] {
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return [];
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredTab).map((tab) => ({
        id: tab.id,
        connectionId: tab.connectionId,
        sourceId: tab.sourceId,
        title: tab.title,
        subtitle: typeof tab.subtitle === "string" ? tab.subtitle : undefined,
        connectionColor: typeof tab.connectionColor === "string" ? tab.connectionColor : null,
        state: tab.state,
    }));
}
