'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { getRouteConfig } from '@/lib/route-config'
import { getToolMessageKey } from '@/lib/tool-i18n'
import { getSidebarToolMeta } from '@/components/sidebar/app-sidebar.helpers'
import { toolCategoryMap } from '@/lib/tool-categories'
import { categoryAccent } from '@/components/dashboard/types'
import { cn } from '@/lib/utils'

/**
 * The one contextual strip under the tab bar. When the active route is a tool,
 * it shows that tool's category and every sibling in it as a quick-jump pill —
 * so moving between related tools (Notes → Bookmarks → Tasks) is one click, and
 * every tool page wears the identical top strip instead of its own chrome.
 *
 * Renders nothing outside a categorised `/app/<slug>` route.
 */
function pathToSlug(pathname: string): string | null {
  const match = pathname.match(/^\/app\/([^/?#]+)/)
  return match ? match[1] : null
}

export function ToolContextBar() {
  const pathname = usePathname() ?? ''
  const tNav = useTranslations('Navigation')

  const slug = pathToSlug(pathname)
  const category = slug ? toolCategoryMap[slug] : undefined
  if (!slug || !category) return null

  const siblings = Object.keys(toolCategoryMap).filter(
    (s) => toolCategoryMap[s] === category,
  )
  // A lone tool has nothing to switch to — the strip would just be its own name.
  if (siblings.length <= 1) return null

  const accent = categoryAccent(category)

  return (
    <nav
      aria-label={`${category} tools`}
      className="flex h-10 shrink-0 items-center gap-2 border-b border-border/60 bg-[hsl(var(--surface-2))]/60 px-3 backdrop-blur-md"
    >
      <span
        className={cn(
          'hidden shrink-0 items-center gap-1.5 pr-1 text-[11px] font-semibold uppercase tracking-wider sm:inline-flex',
          accent.text,
        )}
      >
        <span className={cn('size-1.5 rounded-full', accent.bg)} aria-hidden />
        {category}
      </span>
      <div className="no-scrollbar flex min-w-0 items-center gap-1 overflow-x-auto">
        {siblings.map((s) => {
          const path = `/app/${s}`
          const key = getToolMessageKey(path)
          const cfg = getRouteConfig(path)
          const title = (key ? tNav(key as never) : cfg?.title) ?? s
          const Icon = getSidebarToolMeta(path)?.icon ?? cfg?.icon
          const active = s === slug
          return (
            <Link
              key={s}
              href={path}
              aria-current={active ? 'page' : undefined}
              title={title}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
                active
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
              <span className="truncate">{title}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
