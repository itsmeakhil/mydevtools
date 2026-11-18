import * as React from "react"

/**
 * Commands the open tool adds to the ⌘K palette (shown above Recent while
 * the tool is mounted). One slot: only one tool page is mounted at a time.
 */
export interface PaletteAction {
    id: string
    title: string
    /** Formatted shortcut shown on the right, e.g. "⌘S". */
    hint?: string
    /** Extra search words (already in the user's language). */
    keywords?: string[]
    Icon?: React.ElementType
    run: () => void
}

export interface PaletteActionGroup {
    heading: string
    actions: PaletteAction[]
}

let current: PaletteActionGroup | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function subscribe(listener: () => void) {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
}

/** Register `group` while the calling component is mounted. Memoize `group`. */
export function usePaletteActions(group: PaletteActionGroup | null): void {
    React.useEffect(() => {
        if (!group) return
        current = group
        emit()
        return () => {
            if (current === group) {
                current = null
                emit()
            }
        }
    }, [group])
}

/** The palette's view of the registered group. */
export function useRegisteredPaletteActions(): PaletteActionGroup | null {
    return React.useSyncExternalStore(subscribe, () => current, () => null)
}
