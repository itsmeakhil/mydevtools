/**
 * Pure logic behind the collapsed tool-sidebar rail — registry bookkeeping,
 * overflow splitting, the keyboard shortcut predicate and the width clamp.
 *
 * This lives outside the React component on purpose: Jest here runs in the node
 * environment with no DOM harness, so anything branchy has to be testable as a
 * plain function.
 */
import type React from "react"

export const DEFAULT_SIDEBAR_WIDTH = 256
export const MIN_SIDEBAR_WIDTH = 200
export const MAX_SIDEBAR_WIDTH = 480

/** Rail buttons that fit before the overflow menu takes the last slot. */
export const RAIL_MAX_VISIBLE = 8

export interface ToolSidebarRailEntry {
  /** Unique within its group. `flattenRail` namespaces it to `groupId/id`. */
  id: string
  /** Tooltip text and accessible name. */
  label: string
  icon?: React.ElementType
  count?: number
  active?: boolean
  /**
   * Set by `flattenRail` on the first entry of every group but the first, so
   * the rail can draw a separator above it. Not set by producers.
   */
  groupStart?: boolean
  /**
   * Invoked on rail click, after the layout expands the panel. Deliberately
   * excluded from `railEntriesKey` — see the note there.
   */
  onSelect?: () => void
}

export interface RailRegistry {
  /** Group ids in mount order. */
  order: string[]
  groups: Record<string, ToolSidebarRailEntry[]>
}

/** The handler-map key for an entry, shared by the registry and the layout. */
export function railHandlerKey(groupId: string, entryId: string): string {
  return `${groupId}/${entryId}`
}

export function emptyRailRegistry(): RailRegistry {
  return { order: [], groups: {} }
}

export function registerRailGroup(
  reg: RailRegistry,
  groupId: string,
  entries: ToolSidebarRailEntry[],
): RailRegistry {
  return {
    order: reg.order.includes(groupId) ? reg.order : [...reg.order, groupId],
    groups: { ...reg.groups, [groupId]: entries },
  }
}

export function unregisterRailGroup(reg: RailRegistry, groupId: string): RailRegistry {
  if (!(groupId in reg.groups)) return reg
  const groups = { ...reg.groups }
  delete groups[groupId]
  return { order: reg.order.filter((id) => id !== groupId), groups }
}

/**
 * Render order for the rail. Ids are namespaced to their group so two groups can
 * both have an "all" entry, and the first entry of each group after the first is
 * marked `groupStart` so the rail can draw a separator above it. Empty groups
 * are skipped, so a tool whose facets are still loading leaves no stray line.
 */
export function flattenRail(reg: RailRegistry): ToolSidebarRailEntry[] {
  const out: ToolSidebarRailEntry[] = []
  for (const groupId of reg.order) {
    const entries = reg.groups[groupId]
    if (!entries?.length) continue
    entries.forEach((e, i) => {
      out.push({
        ...e,
        id: railHandlerKey(groupId, e.id),
        groupStart: i === 0 && out.length > 0,
      })
    })
  }
  return out
}

/**
 * Splits entries into the buttons the rail draws and the ones behind the "…"
 * menu. When anything overflows, the menu itself consumes a slot, so only
 * `max - 1` entries stay visible. An active entry is always kept visible —
 * a rail that hides the current selection tells you nothing.
 */
export function splitRailEntries(
  entries: ToolSidebarRailEntry[],
  max: number = RAIL_MAX_VISIBLE,
): { visible: ToolSidebarRailEntry[]; overflow: ToolSidebarRailEntry[] } {
  if (entries.length <= max) return { visible: entries, overflow: [] }

  const visible = entries.slice(0, max - 1)
  const overflow = entries.slice(max - 1)

  const activeIndex = overflow.findIndex((e) => e.active)
  if (activeIndex !== -1 && visible.length) {
    const [active] = overflow.splice(activeIndex, 1)
    const displaced = visible[visible.length - 1]
    visible[visible.length - 1] = active
    overflow.unshift(displaced)
  }

  return { visible, overflow }
}

/**
 * Dependency key for the registration effect. Handlers are excluded on purpose:
 * a body that rebuilds `onSelect` every render would otherwise re-register in a
 * loop. The layout reads live handlers through a ref instead, so excluding them
 * here cannot go stale.
 */
export function railEntriesKey(entries: ToolSidebarRailEntry[]): string {
  return entries.map((e) => `${e.id}${e.label}${e.count ?? ""}${e.active ? 1 : 0}`).join("")
}

/**
 * True when a keydown should toggle the tool sidebar. Matched on `code` rather
 * than `key` because backslash sits behind different physical keys per layout.
 */
export function isSidebarShortcut(e: {
  code: string
  metaKey: boolean
  ctrlKey: boolean
  target: { tagName?: string; isContentEditable?: boolean } | null
}): boolean {
  if (e.code !== "Backslash") return false
  if (!e.metaKey && !e.ctrlKey) return false
  const t = e.target
  if (!t) return true
  if (t.isContentEditable) return false
  return t.tagName !== "INPUT" && t.tagName !== "TEXTAREA" && t.tagName !== "SELECT"
}

export function clampSidebarWidth(px: number): number {
  if (!Number.isFinite(px)) return DEFAULT_SIDEBAR_WIDTH
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, Math.round(px)))
}
