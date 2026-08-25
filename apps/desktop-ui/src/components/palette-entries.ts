import type React from 'react'
import { HelpCircle, Home, LayoutDashboard, Settings } from 'lucide-react'
import { sidebarData } from '@/components/sidebar/data/sidebar-data'
import { getAllToolsMetadata } from '@/lib/tools-registry'

export type PaletteEntry = {
  title: string
  url: string
  description: string
  category: string
  searchValue: string
  Icon: React.ElementType
}

export const CATEGORY_ORDER = ['Site', 'Productivity', 'Security', 'Formatters', 'Converters', 'Generators', 'Network & API', 'Database', 'PDF', 'Media & Design'] as const
export const RECENT_STORAGE_KEY = 'mdt:palette:recent'

const STATIC_ENTRIES: Omit<PaletteEntry, 'searchValue'>[] = [
  {
    title: 'Home',
    url: '/',
    description: 'Landing page and all tools',
    category: 'Site',
    Icon: Home,
  },
  {
    title: 'Dashboard',
    url: '/dashboard',
    description: 'Your tools dashboard',
    category: 'Site',
    Icon: LayoutDashboard,
  },
  {
    title: 'Settings',
    url: '/settings',
    description: 'Account, theme, and tool visibility',
    category: 'Site',
    Icon: Settings,
  },
  {
    title: 'Help',
    url: '/help',
    description: 'Documentation and support',
    category: 'Site',
    Icon: HelpCircle,
  },
]

function buildSidebarIconMap(): Map<string, React.ElementType> {
  const map = new Map<string, React.ElementType>()
  for (const group of sidebarData.navGroups) {
    for (const item of group.items) {
      if ('url' in item && item.url != null && item.icon) {
        map.set(String(item.url), item.icon)
      }
      if ('items' in item && item.items) {
        for (const sub of item.items) {
          if (sub.url != null && sub.icon) map.set(String(sub.url), sub.icon)
        }
      }
    }
  }
  return map
}

function buildSearchValue(entry: {
  title: string
  description: string
  category: string
  tags?: string[]
  keywords?: string[]
}): string {
  return [
    entry.title,
    entry.description,
    entry.category,
    ...(entry.tags ?? []),
    ...(entry.keywords ?? []),
  ]
    .join(' ')
    .toLowerCase()
}

// Tool entries and sidebar icons are static across the app lifetime — compute once.
let cachedToolEntries: PaletteEntry[] | null = null
export function getToolEntries(): PaletteEntry[] {
  if (cachedToolEntries) return cachedToolEntries
  const iconMap = buildSidebarIconMap()
  cachedToolEntries = getAllToolsMetadata()
    .filter((t) => t.url.startsWith('/app/'))
    .map((tool) => {
      const Icon = iconMap.get(tool.url) ?? LayoutDashboard
      const topCategory = tool.category.includes('>')
        ? tool.category.split('>')[0]!.trim()
        : tool.category
      return {
        title: tool.title,
        url: tool.url,
        description: tool.description,
        category: topCategory,
        searchValue: buildSearchValue({
          title: tool.title,
          description: tool.description,
          category: tool.category,
          tags: tool.tags,
          keywords: tool.keywords,
        }),
        Icon,
      }
    })
  return cachedToolEntries
}

export const STATIC_ENTRIES_WITH_SEARCH = STATIC_ENTRIES.map((s) => ({
  ...s,
  searchValue: buildSearchValue(s),
})) as PaletteEntry[]

/**
 * cmdk custom filter. Substring match with title-first ranking instead of
 * cmdk's default fuzzy subsequence scorer (which over-matches — "json" would
 * hit any tool whose blob happens to contain j…s…o…n as a subsequence).
 *
 * `keywords[0]` = lowercased title, `keywords[1]` = full searchValue blob.
 * Returns a 0–1 score; 0 hides the item.
 */
export function paletteFilter(_value: string, search: string, keywords?: string[]): number {
  const q = search.trim().toLowerCase()
  if (!q) return 1
  const title = keywords?.[0] ?? ''
  const blob = keywords?.[1] ?? ''
  if (title === q) return 1
  if (title.startsWith(q)) return 0.9
  if ((' ' + title).includes(' ' + q)) return 0.8 // matches a word start inside the title
  if (title.includes(q)) return 0.6
  if (blob.includes(q)) return 0.4
  const tokens = q.split(/\s+/).filter(Boolean)
  if (tokens.length > 1 && tokens.every((t) => blob.includes(t))) return 0.2 // all words present, any order
  return 0
}
