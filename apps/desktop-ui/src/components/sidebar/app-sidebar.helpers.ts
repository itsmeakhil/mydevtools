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
 * @param activeWs     The active Workspace, or null when it isn't loaded yet
 *                     (initial load / offline desktop where the workspace list
 *                     never fetches). When null we still show the pins — matching
 *                     the dashboard, which only needs the pinned URLs — and skip
 *                     the RBAC filter; permission is re-checked once the
 *                     workspace resolves and enforced at the tool itself.
 */
export function buildPinnedNavItems(
  pinnedTools: string[],
  activeWs: Workspace | null,
): NavLink[] {
  if (pinnedTools.length === 0) return []

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
    // Workspace not loaded yet — show the pin; RBAC applies once it resolves.
    if (!activeWs) return true
    const slug = sidebarUrlToToolSlug(String(link.url))
    // Non-matrix URL (e.g. /dashboard pinned somehow) — always show.
    if (!slug) return true
    return hasPermission(activeWs, slug, "read")
  })
}

// Lazy url→{icon, category} map over the whole catalog, so tab chips reuse the
// exact sidebar (@tabler) icons shown in Pinned/palette plus the tool's
// category (nav group title) for CATEGORY_ACCENT coloring.
export interface SidebarToolMeta {
  icon: NavLink["icon"]
  category: string
}
let metaByUrl: Map<string, SidebarToolMeta> | null = null
export function getSidebarToolMeta(url: string): SidebarToolMeta | undefined {
  if (!metaByUrl) {
    metaByUrl = new Map()
    for (const group of sidebarData.navGroups) {
      for (const item of group.items) {
        if (!("items" in item)) {
          metaByUrl.set(String((item as NavLink).url), {
            icon: (item as NavLink).icon,
            category: group.title,
          })
        } else {
          for (const sub of (item as NavCollapsible).items) {
            metaByUrl.set(String(sub.url), {
              icon: sub.icon ?? item.icon,
              category: group.title,
            })
          }
        }
      }
    }
  }
  return metaByUrl.get(url)
}

export interface CategoryGroup {
  title: string
  tools: NavLink[]
}

/**
 * All tool categories with their tools flattened (nested collapsibles inlined),
 * for the grouped top-nav menus. RBAC is enforced at the tool itself, so this
 * is an unfiltered structural view of the catalog.
 */
export function buildCategoryGroups(): CategoryGroup[] {
  return sidebarData.navGroups
    .map((group) => ({
      title: group.title,
      tools: group.items.flatMap((item) =>
        !("items" in item)
          ? [item as NavLink]
          : (item as NavCollapsible).items.map(
              (sub) => ({ ...sub, icon: sub.icon ?? item.icon } as NavLink),
            ),
      ),
    }))
    .filter((g) => g.tools.length > 0)
}
