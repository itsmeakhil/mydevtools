'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Sparkles, Pin } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { requiresAuth } from '@/lib/tool-config'
import { TOOL_PATH_TO_MESSAGE_KEY } from '@/lib/tool-i18n'
import { cn } from '@/lib/utils'
import { type ToolCardProps, DEFAULT_ACCENT, formatRelativeTime } from './types'

/** Wraps a horizontal scroll row with a right-edge fade affordance. */
export const HScrollFade = ({ children }: { children: React.ReactNode }) => (
  <div className="relative">
    {children}
    <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background/80 to-transparent rounded-r-lg" />
  </div>
)

/** Matches ToolCard footprint so layout doesn't shift on hydration. */
export const ToolCardSkeleton = () => (
  <div className="rounded-xl h-full" aria-hidden>
    <div className="block h-full">
      <Card className="bg-card border border-border h-full overflow-hidden rounded-xl relative">
        <CardContent className="flex items-center gap-2.5 p-3 md:p-3.5">
          <div className="shrink-0 h-9 w-9 md:h-10 md:w-10 rounded-lg bg-muted skeleton-shimmer" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3.5 w-3/4 rounded bg-muted skeleton-shimmer" />
            <div className="h-2.5 w-1/2 rounded bg-muted/70 skeleton-shimmer" />
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
)

/** A compact tool card: accented icon + title (+ optional description), with hover pin action. */
export const ToolCard = React.memo(function ToolCard({
  item,
  user,
  isPinned,
  togglePin,
  timestamp,
  accent,
}: ToolCardProps) {
  const tTools = useTranslations('Dashboard.tools')
  const pathname = item.url?.toString().split('?')[0] ?? ''
  const toolKey = TOOL_PATH_TO_MESSAGE_KEY[pathname]
  const displayTitle = toolKey
    ? tTools(`${toolKey}.title` as Parameters<typeof tTools>[0])
    : item.title
  const displayDescription = toolKey
    ? (() => {
        try {
          return tTools(`${toolKey}.description` as Parameters<typeof tTools>[0])
        } catch {
          return item.description
        }
      })()
    : item.description

  const itemRequiresAuth = item.url ? requiresAuth(item.url.toString()) : false
  const a = accent ?? DEFAULT_ACCENT

  const handleClick = (e: React.MouseEvent) => {
    if (itemRequiresAuth && !user) {
      e.preventDefault()
      window.location.href = '/login'
    }
  }

  const pinned = item.url ? isPinned(item.url.toString()) : false

  const cardRef = React.useRef<HTMLDivElement>(null)
  const handleMove = (e: React.MouseEvent) => {
    const el = cardRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  return (
    <div className="rounded-xl h-full">
      <Link
        href={item.url || '#'}
        className="block group h-full rounded-xl focus-visible:outline-none"
        onClick={handleClick}
        onMouseMove={handleMove}
        title={displayTitle}
      >
        <Card
          ref={cardRef}
          className={cn(
            'dash-card-sheen relative h-full overflow-hidden rounded-lg border border-border bg-card',
            'shadow-sm dark:shadow-none',
            'transition-[colors,transform,box-shadow,border-color] duration-200 ease-out',
            'hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 motion-safe:hover:-translate-y-0.5',
            'group-focus-visible:ring-2 group-focus-visible:ring-primary/60 group-focus-visible:border-primary',
          )}
        >
          <CardContent className="flex items-start gap-3 p-3 md:p-3.5 relative z-10">
            <div
              className={cn(
                'shrink-0 p-2 md:p-2.5 rounded-lg ring-1 ring-inset ring-border/50 transition-transform duration-200 ease-out',
                'motion-safe:group-hover:scale-110',
                a.bg,
                a.text,
              )}
            >
              {item.icon ? (
                <item.icon size={18} strokeWidth={1.5} className="md:w-5 md:h-5" />
              ) : (
                <Sparkles size={18} strokeWidth={1.5} className="md:w-5 md:h-5" />
              )}
            </div>

            <div className="min-w-0 flex-1 pr-7">
              <div className="flex items-center gap-1.5">
                <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                  {displayTitle}
                </h3>
                {item.badge && (
                  <span className="shrink-0 bg-primary/10 text-primary text-[9px] md:text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider border border-primary/20">
                    {item.badge}
                  </span>
                )}
              </div>
              {displayDescription && (
                <p className="mt-0.5 truncate text-[11px] md:text-xs text-muted-foreground/80">
                  {displayDescription}
                </p>
              )}
              {timestamp && (
                <p className="mt-0.5 text-[10px] text-muted-foreground/60 tabular-nums">
                  {formatRelativeTime(timestamp)}
                </p>
              )}
            </div>

            {item.url && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={pinned}
                    aria-label={`${pinned ? 'Unpin' : 'Pin'} ${displayTitle}`}
                    className={cn(
                      'absolute top-1.5 right-1.5 rounded-md transition-all cursor-pointer',
                      'flex items-center justify-center h-7 w-7',
                      'hover:bg-muted/80',
                      pinned
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100',
                    )}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      togglePin(item.url!.toString())
                    }}
                  >
                    <motion.span
                      key={pinned ? 'pinned' : 'unpinned'}
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 520, damping: 14 }}
                      className="inline-flex"
                    >
                      <Pin
                        className={cn(
                          'transition-colors',
                          pinned
                            ? 'text-primary fill-primary'
                            : 'text-muted-foreground/70 hover:text-primary',
                        )}
                        size={14}
                      />
                    </motion.span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={4} className="text-xs">
                  {pinned ? 'Unpin' : 'Pin'}
                </TooltipContent>
              </Tooltip>
            )}
          </CardContent>
        </Card>
      </Link>
    </div>
  )
})
