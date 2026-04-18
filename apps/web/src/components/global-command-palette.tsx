'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { sidebarData } from '@/components/sidebar/data/sidebar-data'
import { getAllToolsMetadata } from '@/lib/tools-registry'
import { requiresAuth } from '@/lib/tool-config'
import useAuth from '@/utils/useAuth'
import { cn } from '@/lib/utils'
import {
  HelpCircle,
  Home,
  LayoutDashboard,
  LogIn,
  Settings,
  Star,
} from 'lucide-react'
import { usePinnedToolsStore } from '@/store/pinned-tools-store'

type PaletteEntry = {
  title: string
  url: string
  description: string
  category: string
  searchValue: string
  Icon: React.ElementType
  requiresAuth: boolean
}

const CATEGORY_ORDER = ['Site', 'Productivity', 'Security', 'Formatters', 'Converters', 'Generators', 'Network & API', 'Database', 'Media & Design'] as const

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

function getSidebarIconForUrl(url: string): React.ElementType | null {
  for (const group of sidebarData.navGroups) {
    for (const item of group.items) {
      if ('url' in item && item.url != null) {
        if (String(item.url) === url && item.icon) return item.icon
      }
      if ('items' in item && item.items) {
        const sub = item.items.find((s) => String(s.url) === url)
        if (sub?.icon) return sub.icon
      }
    }
  }
  return null
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

export function GlobalCommandPalette() {
  const [open, setOpen] = React.useState(false)
  const [modLabel, setModLabel] = React.useState('⌘')
  const router = useRouter()
  const { user } = useAuth(false)
  const pinnedTools = usePinnedToolsStore((s) => s.pinnedTools)

  const entries = React.useMemo((): PaletteEntry[] => {
    const tools = getAllToolsMetadata()
      .filter((t) => t.url.startsWith('/app/'))
      .map((tool) => {
        const Icon = getSidebarIconForUrl(tool.url) ?? LayoutDashboard
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

    const site = STATIC_ENTRIES.filter(
      (s) => s.url !== '/login' || !user
    ).map((s) => ({
      ...s,
      searchValue: buildSearchValue(s),
    }))

    return [...site, ...tools]
  }, [user])

  const pinnedEntries = React.useMemo(() => {
    const urlSet = new Set(pinnedTools)
    return entries
      .filter((e) => urlSet.has(e.url))
      .sort((a, b) => pinnedTools.indexOf(a.url) - pinnedTools.indexOf(b.url))
  }, [entries, pinnedTools])

  const grouped = React.useMemo(() => {
    const map = new Map<string, PaletteEntry[]>()
    for (const e of entries) {
      const list = map.get(e.category) ?? []
      list.push(e)
      map.set(e.category, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.title.localeCompare(b.title))
    }
    const keys = Array.from(map.keys()).sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a as (typeof CATEGORY_ORDER)[number])
      const ib = CATEGORY_ORDER.indexOf(b as (typeof CATEGORY_ORDER)[number])
      const sa = ia === -1 ? CATEGORY_ORDER.length : ia
      const sb = ib === -1 ? CATEGORY_ORDER.length : ib
      if (sa !== sb) return sa - sb
      return a.localeCompare(b)
    })
    return keys.map((k) => ({ category: k, items: map.get(k)! }))
  }, [entries])

  React.useEffect(() => {
    setModLabel(
      typeof navigator !== 'undefined' &&
        /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)
        ? '⌘'
        : 'Ctrl'
    )
  }, [])

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key !== 'k' && e.key !== 'K') return
      if (!(e.metaKey || e.ctrlKey)) return

      if (open) {
        e.preventDefault()
        setOpen(false)
        return
      }

      const t = e.target as HTMLElement | null
      if (t) {
        const tag = t.tagName
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          t.isContentEditable
        ) {
          return
        }
      }
      e.preventDefault()
      setOpen(true)
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open])

  const run = React.useCallback(
    (entry: PaletteEntry) => {
      if (entry.requiresAuth && !user) {
        window.location.href = '/login'
        setOpen(false)
        return
      }
      router.push(entry.url)
      setOpen(false)
    },
    [router, user]
  )

  const commandSurfaceClass =
    '[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'overflow-hidden p-0 gap-0 max-w-2xl',
          'max-h-[min(85vh,640px)] flex flex-col'
        )}
      >
        <DialogTitle className="sr-only">Search tools and pages</DialogTitle>
        <Command
          className={cn(
            'rounded-none border-none bg-transparent shadow-none',
            commandSurfaceClass
          )}
          shouldFilter
          loop
        >
          <CommandInput placeholder="Search tools and pages…" />
          <CommandList className="max-h-[min(60vh,480px)] overflow-y-auto">
            <CommandEmpty>No results found.</CommandEmpty>
            {pinnedEntries.length > 0 && (
              <React.Fragment>
                <CommandGroup heading="Pinned">
                  {pinnedEntries.map((entry) => {
                    const ItemIcon = entry.Icon
                    return (
                      <CommandItem
                        key={`pinned-${entry.url}`}
                        value={`pinned ${entry.searchValue} ${entry.url}`}
                        onSelect={() => run(entry)}
                        className="flex items-start gap-3 py-2.5 aria-selected:bg-accent"
                      >
                        <Star
                          className="mt-0.5 h-4 w-4 shrink-0 fill-primary text-primary"
                          aria-hidden
                        />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate font-medium leading-none">
                            {entry.title}
                          </span>
                          {entry.description ? (
                            <span className="line-clamp-2 text-xs text-muted-foreground">
                              {entry.description}
                            </span>
                          ) : null}
                        </span>
                        <ItemIcon
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-40"
                          aria-hidden
                        />
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
                <CommandSeparator />
              </React.Fragment>
            )}
            {grouped.map(({ category, items }, i) => (
              <React.Fragment key={category}>
                {i > 0 ? <CommandSeparator /> : null}
                <CommandGroup heading={category}>
                  {items.map((entry) => {
                    const ItemIcon = entry.Icon
                    return (
                    <CommandItem
                      key={entry.url}
                      value={`${entry.searchValue} ${entry.url}`}
                      onSelect={() => run(entry)}
                      className="flex items-start gap-3 py-2.5 aria-selected:bg-accent"
                    >
                      <ItemIcon
                        className="mt-0.5 h-4 w-4 shrink-0 opacity-70"
                        aria-hidden
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate font-medium leading-none">
                          {entry.title}
                        </span>
                        {entry.description ? (
                          <span className="line-clamp-2 text-xs text-muted-foreground">
                            {entry.description}
                          </span>
                        ) : null}
                      </span>
                    </CommandItem>
                    )
                  })}
                </CommandGroup>
              </React.Fragment>
            ))}
          </CommandList>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
            <span>
              <kbd className="pointer-events-none rounded border border-border bg-muted/80 px-1.5 py-0.5 font-mono">
                ↑↓
              </kbd>{' '}
              navigate
            </span>
            <span>
              <kbd className="pointer-events-none rounded border border-border bg-muted/80 px-1.5 py-0.5 font-mono">
                ↵
              </kbd>{' '}
              open
            </span>
            <span>
              <kbd className="pointer-events-none rounded border border-border bg-muted/80 px-1.5 py-0.5 font-mono">
                esc
              </kbd>{' '}
              close
            </span>
            <span className="ml-auto">
              <kbd className="pointer-events-none rounded border border-border bg-muted/80 px-1.5 py-0.5 font-mono">
                {modLabel}K
              </kbd>{' '}
              toggle
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
