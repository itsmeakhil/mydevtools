/**
 * Sidebar helpers extracted for testability.
 * Pure functions only — no React hooks.
 */
import { hasPermission } from "@/lib/workspace-rbac"
import { sidebarUrlToToolSlug } from "@/lib/sidebar-tool-slug"
import { sidebarData } from "./data/sidebar-data"
import type { NavLink, NavCollapsible } from "./types"
import type { Workspace } from "@/lib/workspace-api"

/**
 * Returns the pinned NavLink items that the current workspace role is allowed
 * to read.  The pin records in the store are NOT mutated — this is a
 * render-side filter only.
 *
 * @param pinnedTools  Array of tool URLs currently pinned for the active workspace.
 * @param activeWs     The active Workspace (null = not yet loaded → return empty).
 */
export function buildPinnedNavItems(
  pinnedTools: string[],
  activeWs: Workspace | null,
): NavLink[] {
  if (pinnedTools.length === 0 || !activeWs) return []

  const allLinks: NavLink[] = sidebarData.navGroups.flatMap((group) =>
    group.items.flatMap((item) => {
      if (!("items" in item)) return [item as NavLink]
      return (item as NavCollapsible).items.map(
        (sub) =>
          ({
            ...sub,
            icon: sub.icon ?? item.icon,
          } as NavLink),
      )
    }),
  )

  const urlSet = new Set(pinnedTools)
  return allLinks.filter((link) => {
    if (!urlSet.has(String(link.url))) return false
    const slug = sidebarUrlToToolSlug(String(link.url))
    // Non-matrix URL (e.g. /dashboard pinned somehow) — always show.
    if (!slug) return true
    return hasPermission(activeWs, slug, "read")
  })
}
