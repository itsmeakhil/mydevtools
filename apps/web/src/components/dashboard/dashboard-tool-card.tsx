'use client'

import React from 'react'
import Link from 'next/link'
import { Sparkles, Pin } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { requiresAuth } from '@/lib/tool-config'
import { TOOL_PATH_TO_MESSAGE_KEY } from '@/lib/tool-i18n'
import { cn } from '@/lib/utils'
import { type ToolCardProps, formatRelativeTime } from './types'

/** Wraps a horizontal scroll row with a right-edge fade affordance. */
export const HScrollFade = ({ children }: { children: React.ReactNode }) => (
  <div className="relative">
    {children}
    <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background/80 to-transparent rounded-r-lg" />
  </div>
)

/** Matches ToolCard footprint so layout doesn't shift on hydration. */
export const ToolCardSkeleton = () => (
  <div className="rounded-lg h-full" aria-hidden>
    <div className="block h-full">
      <Card className="bg-card border border-border h-full overflow-hidden rounded-lg">
        <CardContent className="flex items-center gap-2.5 p-2.5 md:p-3">
          <div className="shrink-0 h-9 w-9 md:h-10 md:w-10 rounded-lg bg-muted animate-pulse" />
          <div className="min-w-0 flex-1 h-4 rounded bg-muted animate-pulse" />
        </CardContent>
      </Card>
    </div>
  </div>
)

/** A compact single-line tool card: icon + title, with hover pin action. */
export const ToolCard = React.memo(function ToolCard({
  item,
  user,
  isPinned,
  togglePin,
  timestamp,
}: ToolCardProps) {
  const tTools = useTranslations('Dashboard.tools')
  const pathname = item.url?.toString().split('?')[0] ?? ''
  const toolKey = TOOL_PATH_TO_MESSAGE_KEY[pathname]
  const displayTitle = toolKey
    ? tTools(`${toolKey}.title` as Parameters<typeof tTools>[0])
    : item.title

  const itemRequiresAuth = item.url ? requiresAuth(item.url.toString()) : false

  const handleClick = (e: React.MouseEvent) => {
    if (itemRequiresAuth && !user) {
      e.preventDefault()
      window.location.href = '/login'
    }
  }

  const pinned = item.url ? isPinned(item.url.toString()) : false

  return (
    <div className="rounded-lg h-full">
      <Link
        href={item.url || '#'}
        className="block group h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        onClick={handleClick}
        title={displayTitle}
      >
        <Card className="bg-card border border-border hover:border-primary/40 hover:bg-accent/20 hover:shadow-sm active:scale-[0.99] transition-[colors,background-color,transform,box-shadow] duration-200 h-full relative overflow-hidden rounded-lg">
          <CardContent className="flex items-center gap-2.5 p-2.5 md:p-3 relative z-10">
            <div className="shrink-0 p-2 md:p-2.5 rounded-lg bg-primary/10 text-primary">
              {item.icon ? (
                <item.icon size={18} strokeWidth={1.5} className="md:w-5 md:h-5" />
              ) : (
                <Sparkles size={18} strokeWidth={1.5} className="md:w-5 md:h-5" />
              )}
            </div>

            <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              {displayTitle}
            </h3>

            {item.badge && (
              <span className="shrink-0 bg-primary/10 text-primary text-[9px] md:text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider border border-primary/20">
                {item.badge}
              </span>
            )}

            {timestamp && !item.badge && (
              <span className="shrink-0 text-[10px] text-muted-foreground/50 tabular-nums">
                {formatRelativeTime(timestamp)}
              </span>
            )}

            {item.url && (
              <button
                type="button"
                aria-label={`${pinned ? 'Unpin' : 'Pin'} ${displayTitle}`}
                aria-pressed={pinned}
                className={cn(
                  'shrink-0 rounded-md hover:bg-muted/80 transition-colors cursor-pointer',
                  'flex items-center justify-center min-h-11 min-w-11 md:min-h-0 md:min-w-0 md:p-1 -m-2 md:m-0',
                  'opacity-60 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100',
                )}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  togglePin(item.url!.toString())
                }}
              >
                <Pin
                  className={cn(
                    'transition-colors',
                    pinned
                      ? 'text-primary fill-primary'
                      : 'text-muted-foreground/60 hover:text-primary',
                  )}
                  size={14}
                />
              </button>
            )}
          </CardContent>
        </Card>
      </Link>
    </div>
  )
})
