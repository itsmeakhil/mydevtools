'use client'

import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { LayoutGrid, ChevronDown, ArrowRight, Pin } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getToolEntries } from '@/components/palette-entries'
import { ONBOARDING_ROLES, BASICS } from '@/lib/onboarding-roles'
import { toolCategoryMap } from '@/lib/tool-categories'
import { cn } from '@/lib/utils'

/**
 * The tool launcher — a header-anchored popover with two sections:
 *
 *   1. The current tool's *role* (Frontend developer, Backend developer…),
 *      labelled by name, showing that role's other tools as a tile grid — the
 *      "what pairs with this" set. Tools no role curates fall back to their
 *      functional category name.
 *   2. **Essentials**, always pinned at the bottom (bookmarks, notes, tasks,
 *      snippets) — the sticky productivity core, present on every tool.
 *
 * A tile grid, not a list; ⌘K handoff for browsing everything.
 */
const MAX_ROLE_TOOLS = 9

interface LauncherGroup {
  label: string
  urls: string[]
  /** The persistent Essentials tray, rendered as a visually distinct zone. */
  essential?: boolean
}

/** The primary-role section (or functional-category fallback) for a tool. */
function primaryGroup(currentUrl: string): LauncherGroup | null {
  // Basics have no "role" of their own — they *are* the Essentials section.
  if (BASICS.includes(currentUrl)) return null

  // A tool's primary role = the first role that pins it as a core tool.
  const role = ONBOARDING_ROLES.find(
    (r) => r.id !== 'exploring' && r.pins.includes(currentUrl),
  )
  if (role) {
    // role.tools = BASICS + pins + extras (ordered); drop basics + self.
    const urls = role.tools
      .filter((u) => u !== currentUrl && !BASICS.includes(u))
      .slice(0, MAX_ROLE_TOOLS)
    if (urls.length > 0) return { label: role.label, urls }
  }

  // Fallback: functional-category siblings, labelled by category.
  const slug = currentUrl.replace('/app/', '')
  const cat = toolCategoryMap[slug]
  if (!cat || cat === 'Productivity') return null
  const urls = Object.keys(toolCategoryMap)
    .filter((s) => s !== slug && toolCategoryMap[s] === cat)
    .slice(0, MAX_ROLE_TOOLS)
    .map((s) => `/app/${s}`)
  return urls.length > 0 ? { label: cat, urls } : null
}

export function ToolLauncher({ className }: { className?: string }) {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const [open, setOpen] = React.useState(false)

  const entryByUrl = React.useMemo(
    () => new Map(getToolEntries().map((e) => [e.url, e])),
    [],
  )

  const currentUrl = React.useMemo(() => {
    const match = pathname.match(/^\/app\/[^/?#]+/)
    return match ? match[0] : null
  }, [pathname])

  const groups = React.useMemo<LauncherGroup[]>(() => {
    const result: LauncherGroup[] = []
    const primary = currentUrl ? primaryGroup(currentUrl) : null
    if (primary) result.push(primary)
    result.push({ label: 'Essentials', urls: BASICS, essential: true })
    return result
  }, [currentUrl])

  const go = (url: string) => {
    setOpen(false)
    if (url !== currentUrl) router.push(url)
  }

  const browseAll = () => {
    setOpen(false)
    document.dispatchEvent(new CustomEvent('open-command-palette'))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Tools"
          className={cn(
            'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border/60 bg-[hsl(var(--surface-2))] px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground',
            open && 'border-primary/50 text-foreground',
            className,
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Tools</span>
          <ChevronDown
            className={cn('h-3 w-3 transition-transform', open && 'rotate-180')}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(20rem,calc(100vw-2rem))] overflow-hidden p-0"
      >
        {groups.map((group) => {
          const items = group.urls
            .map((url) => entryByUrl.get(url))
            .filter((e): e is NonNullable<typeof e> => Boolean(e))
          if (items.length === 0) return null
          return (
            <div
              key={group.label}
              className={cn(
                // Essentials reads as a pinned tray: its own tinted surface +
                // a full-strength divider, so it never blends into the role
                // group above it.
                group.essential &&
                  'border-t border-border bg-[hsl(var(--surface-2))]/70',
              )}
            >
              <div className="flex items-center gap-1.5 px-3 pb-1.5 pt-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {group.essential && <Pin className="h-3 w-3" aria-hidden />}
                {group.label}
              </div>
              <div className="grid grid-cols-3 gap-1 p-1.5">
                {items.map((entry) => {
                  const Icon = entry.Icon
                  const active = entry.url === currentUrl
                  return (
                    <button
                      key={entry.url}
                      type="button"
                      onClick={() => go(entry.url)}
                      title={entry.title}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'group flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-center transition-colors',
                        active
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-transparent hover:border-border/60 hover:bg-muted/50',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-inset transition-colors',
                          active
                            ? 'bg-primary/15 text-primary ring-primary/30'
                            : 'bg-[hsl(var(--surface-3))] text-muted-foreground ring-border/50 group-hover:text-primary group-hover:ring-primary/30',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="w-full truncate text-[11px] font-medium text-foreground/90">
                        {entry.title}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
        <button
          type="button"
          onClick={browseAll}
          className="flex w-full items-center justify-between gap-2 border-t border-border/60 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          Browse all tools
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </PopoverContent>
    </Popover>
  )
}
