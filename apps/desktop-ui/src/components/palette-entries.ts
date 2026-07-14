import type React from 'react'
import { HelpCircle, Home, LayoutDashboard, LogIn, Settings } from 'lucide-react'
import { sidebarData } from '@/components/sidebar/data/sidebar-data'
import { getAllToolsMetadata } from '@/lib/tools-registry'

export type PaletteEntry = {
  title: string
  url: string
  description: string
  category: string
  searchValue: string
  Icon: React.ElementType
  requiresAuth: boolean
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
    requiresAuth: false,
  },
  {
    title: 'Dashboard',
    url: '/dashboard',
    description: 'Your tools dashboard',
    category: 'Site',
    Icon: LayoutDashboard,
    requiresAuth: false,
  },
  {
    title: 'Settings',
    url: '/settings',
    description: 'Account, theme, and tool visibility',
    category: 'Site',
    Icon: Settings,
    requiresAuth: false,
  },
  {
    title: 'Help',
    url: '/help',
    description: 'Documentation and support',
    category: 'Site',
    Icon: HelpCircle,
    requiresAuth: false,
  },
  {
    title: 'Log in',
    url: '/login',
    description: 'Sign in to your account',
    category: 'Site',
    Icon: LogIn,
    requiresAuth: false,
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
        requiresAuth: tool.requiresAuth,
      }
    })
  return cachedToolEntries
}

export const STATIC_ENTRIES_WITH_SEARCH = STATIC_ENTRIES.map((s) => ({
  ...s,
  searchValue: buildSearchValue(s),
})) as PaletteEntry[]
