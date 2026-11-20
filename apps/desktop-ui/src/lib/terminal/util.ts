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

/**
 * Serializes PTY writes: one in flight at a time, data typed meanwhile is coalesced into a single
 * follow-up write. The Rust command runs on a multi-threaded runtime, so concurrent invokes could
 * reach the PTY out of order. The first write goes out immediately. A failed write is reported
 * once via `onError` and the queue keeps going.
 */
export function writeQueue(send: (data: string) => Promise<unknown>, onError: (e: unknown) => void) {
  let pending = ""
  let busy = false
  let reported = false
  const pump = async () => {
    busy = true
    while (pending) {
      const chunk = pending
      pending = ""
      try {
        await send(chunk)
      } catch (e) {
        if (!reported) onError(e)
        reported = true
      }
    }
    busy = false
  }
  return (data: string) => {
    pending += data
    if (!busy) void pump()
  }
}

/**
 * Runs `fn` for `key` only after every earlier call for that key has settled, so calls reach the
 * backend in issue order (used for terminal_attach: the last-mounted pane must attach last).
 */
export function keyedChain<K>() {
  const tails = new Map<K, Promise<void>>()
  return <T>(key: K, fn: () => Promise<T>): Promise<T> => {
    const run = (tails.get(key) ?? Promise.resolve()).then(fn)
    const tail = run.then(() => {}, () => {})
    tails.set(key, tail)
    void tail.then(() => tails.get(key) === tail && tails.delete(key))
    return run
  }
}

/** True for a text field other than xterm's own helper textarea (shortcuts must not fire there). */
export function isForeignEditable(target: { tagName?: string; isContentEditable?: boolean; classList?: { contains(c: string): boolean } } | null): boolean {
  if (!target) return false
  if (target.classList?.contains("xterm-helper-textarea")) return false
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || !!target.isContentEditable
}

/** The waiting terminal after `current` in list order, wrapping; first one when `current` isn't waiting. */
export function nextWaiting(ids: string[], current: string | null): string | null {
  if (ids.length === 0) return null
  const i = current ? ids.indexOf(current) : -1
  return ids[(i + 1) % ids.length]
}

export type PaneDir = "left" | "right" | "up" | "down"
export type TerminalShortcut =
  | "splitRow" | "splitCol" | "newTab" | "nextTab" | "prevTab" | "nextWaiting" | "zoomPane"
  | { focus: PaneDir } | { tab: number }

/**
 * ⌘D, ⌘⇧D, ⌘T, ⌘⇧], ⌘⇧[, ⌘J, ⌘⇧↵ (maximize pane), ⌘⌥ arrows (focus pane), ⌘1–⌘9 (tab; ⌘9 = last).
 * ⌘W is not here: the macOS menu owns it (Rust emits terminal://close-pane).
 */
export function matchShortcut(e: { metaKey: boolean; ctrlKey: boolean; altKey: boolean; shiftKey: boolean; code: string }): TerminalShortcut | null {
  if (!e.metaKey || e.ctrlKey) return null
  if (e.altKey) {
    if (e.shiftKey) return null
    const dir = ({ ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" } as const)[e.code as "ArrowLeft"]
    return dir ? { focus: dir } : null
  }
  const digit = /^Digit([1-9])$/.exec(e.code)
  if (digit) return e.shiftKey ? null : { tab: Number(digit[1]) }
  switch (e.code) {
    case "Enter": return e.shiftKey ? "zoomPane" : null
    case "KeyD": return e.shiftKey ? "splitCol" : "splitRow"
    case "KeyT": return e.shiftKey ? null : "newTab"
    case "KeyJ": return e.shiftKey ? null : "nextWaiting"
    case "BracketRight": return e.shiftKey ? "nextTab" : null
    case "BracketLeft": return e.shiftKey ? "prevTab" : null
    default: return null
  }
}

/** Index for ⌘1–⌘9 in a list of `count` tabs: ⌘9 is always the last tab, others past the end are null. */
export function tabIndexFor(n: number, count: number): number | null {
  if (count === 0) return null
  if (n === 9) return count - 1
  return n <= count ? n - 1 : null
}

export interface PaneRect { id: string; left: number; top: number; right: number; bottom: number }

/** Nearest pane from `fromId` in `dir`: edge-adjacent panes that overlap first, then by centre offset. */
export function neighborPane(rects: PaneRect[], fromId: string, dir: PaneDir): string | null {
  const from = rects.find((r) => r.id === fromId)
  if (!from) return null
  const horizontal = dir === "left" || dir === "right"
  const EPS = 2 // hairline dividers
  const ahead = rects.filter((r) => {
    if (r.id === fromId) return false
    if (dir === "left") return r.right <= from.left + EPS
    if (dir === "right") return r.left >= from.right - EPS
    if (dir === "up") return r.bottom <= from.top + EPS
    return r.top >= from.bottom - EPS
  })
  const gap = (r: PaneRect) =>
    dir === "left" ? from.left - r.right : dir === "right" ? r.left - from.right : dir === "up" ? from.top - r.bottom : r.top - from.bottom
  const overlap = (r: PaneRect) =>
    horizontal ? Math.min(r.bottom, from.bottom) - Math.max(r.top, from.top) : Math.min(r.right, from.right) - Math.max(r.left, from.left)
  const centre = (r: PaneRect) => (horizontal ? (r.top + r.bottom) / 2 : (r.left + r.right) / 2)
  const offset = (r: PaneRect) => Math.abs(centre(r) - centre(from))
  const best = [...ahead].sort(
    (a, b) => Number(overlap(b) > 0) - Number(overlap(a) > 0) || gap(a) - gap(b) || offset(a) - offset(b),
  )[0]
  return best?.id ?? null
}

/** Path from an OSC 7 payload (`file://host/path`, percent-encoded); null if it isn't a file URL. */
export function cwdFromOsc7(data: string): string | null {
  if (!data.startsWith("file://")) return null
  const slash = data.indexOf("/", "file://".length)
  if (slash < 0) return null
  try {
    return decodeURIComponent(data.slice(slash)) || null
  } catch {
    return null
  }
}

/** `/Users/me/src` → `~/src` when `home` is `/Users/me`. */
export function tildify(path: string, home: string | null): string {
  if (!home) return path
  const h = home.replace(/\/+$/, "")
  return path === h ? "~" : path.startsWith(h + "/") ? "~" + path.slice(h.length) : path
}

export const FONT_SIZE = { min: 9, max: 24, default: 13 } as const
export const clampFontSize = (n: number) =>
  Number.isFinite(n) ? Math.min(FONT_SIZE.max, Math.max(FONT_SIZE.min, Math.round(n))) : FONT_SIZE.default

export type PaneShortcut = "find" | "clear" | "zoomIn" | "zoomOut" | "zoomReset" | "prevPrompt" | "nextPrompt"

/** Shortcuts the focused pane handles itself: ⌘F, ⌘K, ⌘= (⌘+), ⌘−, ⌘0, ⌘↑, ⌘↓. */
export function matchPaneShortcut(e: { metaKey: boolean; ctrlKey: boolean; altKey: boolean; shiftKey: boolean; code: string }): PaneShortcut | null {
  if (!e.metaKey || e.ctrlKey || e.altKey) return null
  if (e.code === "Equal") return "zoomIn" // ⌘= and ⌘+ (⇧=)
  if (e.shiftKey) return null
  switch (e.code) {
    case "KeyF": return "find"
    case "KeyK": return "clear"
    case "Minus": return "zoomOut"
    case "Digit0": return "zoomReset"
    case "ArrowUp": return "prevPrompt"
    case "ArrowDown": return "nextPrompt"
    default: return null
  }
}

/**
 * Line to scroll to for ⌘↑ / ⌘↓ between prompts (OSC 133 marks), relative to the
 * top visible line. `null` = no prompt that way (⌘↓ then scrolls to the bottom).
 */
export function promptTarget(lines: number[], top: number, dir: "prev" | "next"): number | null {
  const sorted = [...lines].sort((a, b) => a - b)
  if (dir === "prev") return sorted.filter((l) => l < top).pop() ?? null
  return sorted.find((l) => l > top) ?? null
}

/** How long ago `since` was, in the user's locale ("5 min. ago"); minute granularity. */
export function ago(since: number, now: number, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "narrow" })
  const m = Math.max(0, Math.floor((now - since) / 60_000))
  if (m < 60) return rtf.format(-m, "minute")
  const h = Math.floor(m / 60)
  return h < 24 ? rtf.format(-h, "hour") : rtf.format(-Math.floor(h / 24), "day")
}

/** A command's run time in the user's locale ("45s", "3m", "2h"); one unit, rounded down. */
export function duration(ms: number, locale: string): string {
  const s = Math.floor(ms / 1000)
  const [n, unit] = s < 60 ? [s, "second"] : s < 3600 ? [Math.floor(s / 60), "minute"] : [Math.floor(s / 3600), "hour"]
  return new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay: "narrow" }).format(n)
}

export type CursorStyle = "block" | "bar" | "underline"

/** User settings for every pane; saved with the terminal state. */
export interface TerminalPrefs {
  /** Empty: the system monospace stack. */
  fontFamily: string
  lineHeight: number
  cursorStyle: CursorStyle
  cursorBlink: boolean
  scrollback: number
  copyOnSelect: boolean
  /** xterm's accessibility tree, so VoiceOver can read output (costs memory). */
  screenReader: boolean
  notifyBlocked: boolean
  notifyDone: boolean
  notifySound: boolean
}

export const DEFAULT_PREFS: TerminalPrefs = {
  fontFamily: "", lineHeight: 1, cursorStyle: "block", cursorBlink: true, scrollback: 10_000, copyOnSelect: false, screenReader: false,
  notifyBlocked: true, notifyDone: true, notifySound: false,
}
export const LINE_HEIGHTS = [1, 1.1, 1.2, 1.3, 1.4] as const
export const SCROLLBACK_SIZES = [1_000, 5_000, 10_000, 50_000] as const

/** Saved prefs (possibly old, partial or hand-edited) → a complete, in-range set. */
export function normalizePrefs(raw: unknown): TerminalPrefs {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof TerminalPrefs, unknown>>
  const bool = (k: keyof TerminalPrefs) => (typeof r[k] === "boolean" ? (r[k] as boolean) : (DEFAULT_PREFS[k] as boolean))
  const pick = <T,>(v: unknown, allowed: readonly T[], d: T) => (allowed.includes(v as T) ? (v as T) : d)
  return {
    fontFamily: typeof r.fontFamily === "string" ? r.fontFamily.slice(0, 200) : DEFAULT_PREFS.fontFamily,
    lineHeight: pick(r.lineHeight, LINE_HEIGHTS, DEFAULT_PREFS.lineHeight),
    cursorStyle: pick(r.cursorStyle, ["block", "bar", "underline"] as const, DEFAULT_PREFS.cursorStyle),
    cursorBlink: bool("cursorBlink"),
    scrollback: pick(r.scrollback, SCROLLBACK_SIZES, DEFAULT_PREFS.scrollback),
    copyOnSelect: bool("copyOnSelect"),
    screenReader: bool("screenReader"),
    notifyBlocked: bool("notifyBlocked"),
    notifyDone: bool("notifyDone"),
    notifySound: bool("notifySound"),
  }
}

/** Paths as shell words: plain ones as-is, anything else single-quoted ('it'\''s'). */
export function shellQuote(paths: string[]): string {
  return paths.map((p) => (/^[\w@%+=:,./-]+$/.test(p) ? p : `'${p.replace(/'/g, `'\\''`)}'`)).join(" ")
}
