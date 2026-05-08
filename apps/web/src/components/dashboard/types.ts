import type { LinkProps } from 'next/link'
import { sidebarData } from '@/components/sidebar/data/sidebar-data'

// ─── Core Types ─────────────────────────────────────────────────────────────

export interface ToolItem {
  title: string
  url?: LinkProps['href']
  icon?: React.ElementType
  badge?: string
  description?: string
  items?: ToolItem[]
  customUI?: boolean
  hiddenOnMobile?: boolean
}

export interface FavoriteItem extends ToolItem {
  id: string
  timestamp: number
}

export interface RenderToolItem extends ToolItem {
  originalId?: string
}

export interface RenderGroup {
  title: string
  icon?: React.ElementType
  items: RenderToolItem[]
  originalGroupIndex: number
}

export interface ToolCardProps {
  item: ToolItem
  id: string
  index: number
  user: { displayName?: string | null } | null
  isPinned: (url: string) => boolean
  togglePin: (url: string) => void
  timestamp?: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Create a unique ID for a sidebar item by its position indices. */
export const createItemId = (
  groupIndex: number,
  itemIndex: number,
  subIndex: number | null = null,
): string => {
  return subIndex !== null
    ? `${groupIndex}-${itemIndex}-${subIndex}`
    : `${groupIndex}-${itemIndex}`
}

/** Resolve a position-based ID back to the sidebar ToolItem it represents. */
export const findItemById = (id: string | undefined | null): ToolItem | undefined => {
  if (!id || typeof id !== 'string') {
    return undefined
  }

  const [groupIndexStr, itemIndexStr, subIndexStr] = id.split('-')
  const groupIndex = parseInt(groupIndexStr)
  const itemIndex = parseInt(itemIndexStr)
  const subIndex = subIndexStr ? parseInt(subIndexStr) : undefined

  if (isNaN(groupIndex) || isNaN(itemIndex) || groupIndex >= sidebarData.navGroups.length) {
    return undefined
  }

  const group = sidebarData.navGroups[groupIndex]
  if (!group || itemIndex >= group.items.length) {
    return undefined
  }

  if (subIndex !== undefined && !isNaN(subIndex)) {
    const parentItem = group.items[itemIndex]
    return parentItem.items && subIndex < parentItem.items.length
      ? parentItem.items[subIndex]
      : undefined
  } else {
    return group.items[itemIndex]
  }
}

/** Human-readable relative time from a unix-ms timestamp. */
export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

/** Return the translated group title, with special-case mappings. */
export function groupDisplayTitle(title: string, t: (key: string) => string): string {
  if (title === 'Apps') return t('groups.apps')
  return title
}

/** Time-of-day greeting key. */
export function dashboardGreeting(t: (key: string) => string): string {
  const hour = new Date().getHours()
  if (hour < 12) return t('greeting.morning')
  if (hour < 17) return t('greeting.afternoon')
  return t('greeting.evening')
}

/** Total tool count across all sidebar groups. */
export function getTotalToolCount(): number {
  return sidebarData.navGroups.reduce(
    (acc, group) =>
      acc +
      group.items.reduce((itemAcc, item) => {
        return itemAcc + (item.items ? item.items.length : 1)
      }, 0),
    0,
  )
}

/** Popular tool slugs shown in the no-results state. */
export const POPULAR_TOOL_URLS = [
  '/app/json-formatter',
  '/app/jwt-decoder',
  '/app/api-client',
  '/app/regex-tester',
  '/app/uuid-generator',
  '/app/base64',
]
