/** Pure helpers for the Terminal tool UI. */

/** xterm `onData` string → UTF-8 bytes → base64. Never `btoa(string)`: it throws on non-Latin1. */
export function encodeInput(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ""
  // Chunked so a large paste doesn't overflow the argument limit of fromCharCode.
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

/** PTY output base64 → raw bytes for `term.write` (xterm reassembles UTF-8 split across chunks). */
export function decodeOutput(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** Runs `fn` for `key` unless a previous call for that key is still pending (then skips → undefined). */
export function singleFlight<K>() {
  const busy = new Set<K>()
  return async <T>(key: K, fn: () => Promise<T>): Promise<T | undefined> => {
    if (busy.has(key)) return undefined
    busy.add(key)
    try {
      return await fn()
    } finally {
      busy.delete(key)
    }
  }
}

/** The waiting terminal after `current` in list order, wrapping; first one when `current` isn't waiting. */
export function nextWaiting(ids: string[], current: string | null): string | null {
  if (ids.length === 0) return null
  const i = current ? ids.indexOf(current) : -1
  return ids[(i + 1) % ids.length]
}

export type TerminalShortcut = "splitRow" | "splitCol" | "newTab" | "nextTab" | "prevTab" | "nextWaiting"

/** ⌘D, ⌘⇧D, ⌘T, ⌘⇧], ⌘⇧[, ⌘J. ⌘W is not here: the macOS menu owns it (Rust emits terminal://close-pane). */
export function matchShortcut(e: { metaKey: boolean; ctrlKey: boolean; altKey: boolean; shiftKey: boolean; code: string }): TerminalShortcut | null {
  if (!e.metaKey || e.ctrlKey || e.altKey) return null
  switch (e.code) {
    case "KeyD": return e.shiftKey ? "splitCol" : "splitRow"
    case "KeyT": return e.shiftKey ? null : "newTab"
    case "KeyJ": return e.shiftKey ? null : "nextWaiting"
    case "BracketRight": return e.shiftKey ? "nextTab" : null
    case "BracketLeft": return e.shiftKey ? "prevTab" : null
    default: return null
  }
}
