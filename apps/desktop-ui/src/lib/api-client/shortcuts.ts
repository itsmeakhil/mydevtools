/**
 * API Client keyboard map — the one list the key handler, the shortcuts
 * dialog and the menu/tooltip hints all read.
 *
 * `mod` = ⌘ on macOS, Ctrl elsewhere. Alt+T / Alt+W stand in for ⌘T / ⌘W,
 * which the browser (web build) and the native menu (⌘W = Close Window) own.
 */
export type ShortcutId =
    | "sendRequest"
    | "saveRequest"
    | "newTab"
    | "closeTab"
    | "nextTab"
    | "prevTab"
    | "focusUrl"

export interface Shortcut {
    id: ShortcutId
    /** First binding is the one shown in hints; the rest are aliases. */
    keys: string[]
}

export const SHORTCUTS: Shortcut[] = [
    { id: "sendRequest", keys: ["mod+Enter"] },
    { id: "saveRequest", keys: ["mod+S"] },
    { id: "newTab", keys: ["Alt+T"] },
    { id: "closeTab", keys: ["Alt+W"] },
    { id: "nextTab", keys: ["mod+Shift+]", "Ctrl+Tab"] },
    { id: "prevTab", keys: ["mod+Shift+[", "Ctrl+Shift+Tab"] },
    { id: "focusUrl", keys: ["mod+L"] },
]

type KeyInput = Pick<KeyboardEvent, "key" | "code" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey">

/**
 * Letters match the typed character so Dvorak/AZERTY users get the key they
 * see — except with Alt, which on macOS types a symbol (⌥T = "†"), so the
 * physical key decides. Brackets always go by physical key: Shift turns "]"
 * into "}".
 */
function keyMatches(key: string, e: KeyInput): boolean {
    if (key === "]") return e.code === "BracketRight"
    if (key === "[") return e.code === "BracketLeft"
    if (key.length > 1) return e.key === key
    if (e.altKey) return e.code === `Key${key.toUpperCase()}`
    return e.key.toLowerCase() === key.toLowerCase()
}

function matches(binding: string, e: KeyInput, isMac: boolean): boolean {
    const parts = binding.split("+")
    const key = parts.pop()!
    const want = {
        meta: isMac && parts.includes("mod"),
        ctrl: parts.includes("Ctrl") || (!isMac && parts.includes("mod")),
        alt: parts.includes("Alt"),
        shift: parts.includes("Shift"),
    }
    return e.metaKey === want.meta && e.ctrlKey === want.ctrl && e.altKey === want.alt &&
        e.shiftKey === want.shift && keyMatches(key, e)
}

/** The shortcut a keydown triggers, if any. */
export function matchShortcut(e: KeyInput, isMac: boolean): ShortcutId | null {
    for (const s of SHORTCUTS) {
        if (s.keys.some((k) => matches(k, e, isMac))) return s.id
    }
    return null
}

/** Display form: "⌘⇧]" on macOS, "Ctrl+Shift+]" elsewhere. */
export function formatKeys(binding: string, isMac: boolean): string {
    const parts = binding.split("+").map((p) => {
        if (!isMac) return p === "mod" ? "Ctrl" : p
        return ({ mod: "⌘", Ctrl: "⌃", Alt: "⌥", Shift: "⇧", Enter: "↵", Tab: "⇥" } as Record<string, string>)[p] ?? p
    })
    return parts.join(isMac ? "" : "+")
}

/** Primary binding of `id`, formatted for a hint. */
export function shortcutHint(id: ShortcutId, isMac: boolean): string {
    return formatKeys(SHORTCUTS.find((s) => s.id === id)!.keys[0], isMac)
}

export const isMacPlatform = (): boolean =>
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.userAgent)
