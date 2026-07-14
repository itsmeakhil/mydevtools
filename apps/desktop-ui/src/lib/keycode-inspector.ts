/**
 * Pure logic for the Keycode Inspector tool.
 * Works on plain objects mirroring KeyboardEvent fields so it is fully
 * testable without a DOM.
 */

export interface KeyEventLike {
  key: string
  code: string
  keyCode: number
  which: number
  location: number
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  metaKey: boolean
  repeat?: boolean
}

export interface SerializedKeyEvent {
  key: string
  code: string
  keyCode: number
  which: number
  location: number
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  metaKey: boolean
  repeat: boolean
}

/**
 * Extracts the interesting fields of a keyboard event into a plain,
 * JSON-serializable object.
 */
export function serializeKeyEvent(e: KeyEventLike): SerializedKeyEvent {
  return {
    key: e.key,
    code: e.code,
    keyCode: e.keyCode,
    which: e.which,
    location: e.location,
    ctrlKey: e.ctrlKey,
    shiftKey: e.shiftKey,
    altKey: e.altKey,
    metaKey: e.metaKey,
    repeat: e.repeat ?? false,
  }
}

export type KeyLocationName = 'standard' | 'left' | 'right' | 'numpad' | 'unknown'

/**
 * Maps KeyboardEvent.location to a stable name
 * (DOM_KEY_LOCATION_STANDARD/LEFT/RIGHT/NUMPAD).
 */
export function locationName(location: number): KeyLocationName {
  switch (location) {
    case 0:
      return 'standard'
    case 1:
      return 'left'
    case 2:
      return 'right'
    case 3:
      return 'numpad'
    default:
      return 'unknown'
  }
}

/**
 * Keys whose default action would scroll or navigate the page while
 * inspecting: Space and arrows scroll, Tab moves focus, quotes and slash
 * open quick-find in Firefox.
 */
const PREVENTABLE_KEYS = new Set([
  ' ',
  'Tab',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  "'",
  '"',
  '/',
])

/**
 * True when preventDefault() should be called for this event.
 * Never true while Ctrl or Meta is held so browser-critical shortcuts
 * (Cmd/Ctrl+R, Cmd/Ctrl+T, ...) keep working.
 */
export function isPreventable(e: Pick<KeyEventLike, 'key' | 'ctrlKey' | 'metaKey'>): boolean {
  if (e.ctrlKey || e.metaKey) return false
  return PREVENTABLE_KEYS.has(e.key)
}

/** Maximum number of events kept in the history list. */
export const KEY_HISTORY_LIMIT = 10
