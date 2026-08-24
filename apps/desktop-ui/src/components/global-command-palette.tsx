'use client'

import * as React from 'react'
import { flushSync } from 'react-dom'
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
import useAuth from '@/utils/useAuth'
import { cn } from '@/lib/utils'
import { Star } from 'lucide-react'
import { usePinnedToolsForActiveWorkspace } from '@/store/pinned-tools-store'
import {
  CATEGORY_ORDER, RECENT_STORAGE_KEY, STATIC_ENTRIES_WITH_SEARCH,
  getToolEntries, paletteFilter, type PaletteEntry,
} from './palette-entries'

export function GlobalCommandPalette() {
  const [open, setOpen] = React.useState(false)
  const [modLabel, setModLabel] = React.useState('⌘')
  const [recentEntries, setRecentEntries] = React.useState<PaletteEntry[]>([])
  const router = useRouter()
  const { user } = useAuth(false)
  const pinnedTools = usePinnedToolsForActiveWorkspace()

  const entries = React.useMemo((): PaletteEntry[] => {
    return [...STATIC_ENTRIES_WITH_SEARCH, ...getToolEntries()]
  }, [])

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
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY) ?? '[]') as string[]
      if (!Array.isArray(stored) || stored.length === 0) return
      const mapped = stored
        .map((url) => entries.find((e) => e.url === url))
        .filter(Boolean) as PaletteEntry[]
      if (mapped.length) setRecentEntries(mapped)
    } catch {
      // ignore storage errors
    }
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
    const openPalette = () => setOpen(true)
    document.addEventListener('keydown', down)
    document.addEventListener('open-command-palette', openPalette)
    return () => {
      document.removeEventListener('keydown', down)
      document.removeEventListener('open-command-palette', openPalette)
    }
  }, [open])

  const run = React.useCallback(
    (entry: PaletteEntry) => {
      setRecentEntries((prev) => {
        const nextUrls = [entry.url, ...prev.map((e) => e.url).filter((u) => u !== entry.url)].slice(0, 8)
        const mapped = nextUrls
          .map((url) => entries.find((e) => e.url === url))
          .filter(Boolean) as PaletteEntry[]
        try {
          localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(nextUrls))
        } catch {
          // ignore storage errors
        }
        return mapped
      })
      setOpen(false)
      setTimeout(() => {
        router.push(entry.url)
      }, 0)
    },
    [router, user, entries]
  )

  const commandSurfaceClass =
    '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-14 [&_[cmdk-input]]:text-base'

  // Shared row treatment — solid accent selection + icon chip.
  const itemClass =
    'group mx-1 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors aria-selected:bg-primary/10 aria-selected:ring-1 aria-selected:ring-inset aria-selected:ring-primary/20'
  const chipClass =
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--surface-3))] text-muted-foreground ring-1 ring-inset ring-border/50 transition-colors group-aria-selected:bg-primary/15 group-aria-selected:text-primary group-aria-selected:ring-primary/30'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'overflow-hidden p-0 gap-0 max-w-2xl',
          'max-h-[min(85vh,640px)] flex flex-col',
          'rounded-xl border-border bg-popover/95 backdrop-blur-xl',
          'shadow-2xl shadow-black/40'
        )}
      >
        <DialogTitle className="sr-only">Search tools and pages</DialogTitle>
        <div aria-hidden className="h-px w-full shrink-0 bg-border" />
        <Command
          className={cn(
            'rounded-none border-none bg-transparent shadow-none',
            commandSurfaceClass
          )}
          shouldFilter
          filter={paletteFilter}
          loop
        >
          <CommandInput
            placeholder="Search tools and pages…"
            aria-label="Search tools and pages"
            className="focus-visible:outline-none placeholder:text-muted-foreground/60"
          />
          <CommandList className="max-h-[min(60vh,480px)] overflow-y-auto">
            <CommandEmpty>No results found.</CommandEmpty>
            {recentEntries.length > 0 && (
              <React.Fragment>
                <CommandGroup heading="Recent">
                  {recentEntries.map((entry) => {
                    const ItemIcon = entry.Icon
                    return (
                      <CommandItem
                        key={`recent-${entry.url}`}
                        value={`recent-${entry.url}`}
                        keywords={[entry.title.toLowerCase(), entry.searchValue]}
                        onSelect={() => run(entry)}
                        className={itemClass}
                      >
                        <span className={chipClass}>
                          <ItemIcon className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate font-medium leading-none">
                            {entry.title}
                          </span>
                          {entry.description ? (
                            <span className="line-clamp-1 text-xs text-muted-foreground">
                              {entry.description}
                            </span>
                          ) : null}
                        </span>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
                <CommandSeparator />
              </React.Fragment>
            )}
            {pinnedEntries.length > 0 && (
              <React.Fragment>
                <CommandGroup heading="Pinned">
                  {pinnedEntries.map((entry) => {
                    const ItemIcon = entry.Icon
                    return (
                      <CommandItem
                        key={`pinned-${entry.url}`}
                        value={`pinned-${entry.url}`}
                        keywords={[entry.title.toLowerCase(), entry.searchValue]}
                        onSelect={() => run(entry)}
                        className={itemClass}
                      >
                        <span className={chipClass}>
                          <ItemIcon className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate font-medium leading-none">
                            {entry.title}
                          </span>
                          {entry.description ? (
                            <span className="line-clamp-1 text-xs text-muted-foreground">
                              {entry.description}
                            </span>
                          ) : null}
                        </span>
                        <Star
                          className="h-3.5 w-3.5 shrink-0 fill-primary text-primary"
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
                      value={entry.url}
                      keywords={[entry.title.toLowerCase(), entry.searchValue]}
                      onSelect={() => run(entry)}
                      className={itemClass}
                    >
                      <span className={chipClass}>
                        <ItemIcon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate font-medium leading-none">
                          {entry.title}
                        </span>
                        {entry.description ? (
                          <span className="line-clamp-1 text-xs text-muted-foreground">
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
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/50 bg-muted/20 px-4 py-2.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <kbd className="pointer-events-none rounded-md border border-border/60 bg-background/80 px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground/70 shadow-sm">
                ↑↓
              </kbd>
              navigate
            </span>
            <span className="inline-flex items-center gap-1.5">
              <kbd className="pointer-events-none rounded-md border border-border/60 bg-background/80 px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground/70 shadow-sm">
                ↵
              </kbd>
              open
            </span>
            <span className="inline-flex items-center gap-1.5">
              <kbd className="pointer-events-none rounded-md border border-border/60 bg-background/80 px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground/70 shadow-sm">
                esc
              </kbd>
              close
            </span>
            <span className="ml-auto inline-flex items-center gap-1.5">
              <kbd className="pointer-events-none rounded-md border border-border/60 bg-background/80 px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground/70 shadow-sm">
                {modLabel}K
              </kbd>
              toggle
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
