'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Sparkles, Pin } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { TOOL_PATH_TO_MESSAGE_KEY } from '@/lib/tool-i18n'
import { cn } from '@/lib/utils'
import { glassLift } from '@/lib/motion'
import { type ToolCardProps, formatRelativeTime } from './types'

/** Wraps a horizontal scroll row with a right-edge fade affordance. */
export const HScrollFade = ({ children }: { children: React.ReactNode }) => (
  <div className="relative">
    {children}
    <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent" />
  </div>
)

/** Matches ToolCard footprint so layout doesn't shift on hydration. */
export const ToolCardSkeleton = () => (
  <div className="rounded-xl h-full" aria-hidden>
    <div className="block h-full">
      <Card className="h-full overflow-hidden relative">
        <CardContent className="flex items-center gap-3 p-3 sm:p-3">
          <div className="shrink-0 h-9 w-9 rounded-lg bg-muted skeleton-shimmer" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3.5 w-3/4 rounded bg-muted skeleton-shimmer" />
            <div className="h-2.5 w-1/2 rounded bg-muted/70 skeleton-shimmer" />
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
)

/** A compact tool card: neutral icon tile + title (+ optional description), with hover pin action. */
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
  const displayDescription = toolKey
    ? (() => {
        try {
          return tTools(`${toolKey}.description` as Parameters<typeof tTools>[0])
        } catch {
          return item.description
        }
      })()
    : item.description

  const pinned = item.url ? isPinned(item.url.toString()) : false

  return (
    <motion.div className="rounded-xl h-full" {...glassLift}>
      <Link
        href={item.url || '#'}
        className="block group h-full rounded-xl focus-visible:outline-none"
        title={displayTitle}
      >
        <Card
          variant="glass"
          className={cn(
            'h-full overflow-hidden rounded-xl',
            'group-focus-visible:ring-2 group-focus-visible:ring-ring/60',
          )}
        >
          <CardContent className="flex items-start gap-3 p-3 sm:p-3">
            <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg bg-foreground/[0.05] text-primary">
              {item.icon ? (
                <item.icon size={18} strokeWidth={1.75} />
              ) : (
                <Sparkles size={18} strokeWidth={1.75} />
              )}
            </div>

            <div className="min-w-0 flex-1 pr-7">
              <div className="flex items-center gap-1.5">
                <h3 className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                  {displayTitle}
                </h3>
                {item.badge && (
                  <Badge className="shrink-0 px-1.5 py-0 text-[10px]">{item.badge}</Badge>
                )}
              </div>
              {displayDescription && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {displayDescription}
                </p>
              )}
              {timestamp && (
                <p className="mt-0.5 text-[11px] text-muted-foreground/70 tabular-nums">
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
                      'absolute top-2 right-2 rounded-md transition-opacity',
                      'flex items-center justify-center h-7 w-7',
                      'hover:bg-foreground/[0.05]',
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
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
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
    </motion.div>
  )
})
