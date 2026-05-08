'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, Sparkles, Pin } from 'lucide-react'
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
    <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background/80 to-transparent rounded-r-xl" />
  </div>
)

/** A single tool card with pin, icon, description, and animated hover. */
export const ToolCard = React.memo(function ToolCard({
  item,
  id,
  index,
  user,
  isPinned,
  togglePin,
  timestamp,
}: ToolCardProps) {
  const tCard = useTranslations('Dashboard')
  const tTools = useTranslations('Dashboard.tools')
  const pathname = item.url?.toString().split('?')[0] ?? ''
  const toolKey = TOOL_PATH_TO_MESSAGE_KEY[pathname]
  const displayTitle = toolKey
    ? tTools(`${toolKey}.title` as Parameters<typeof tTools>[0])
    : item.title
  const displayDescription = toolKey
    ? tTools(`${toolKey}.description` as Parameters<typeof tTools>[0])
    : item.description || tCard('toolCard.defaultDescription')

  const itemRequiresAuth = item.url ? requiresAuth(item.url.toString()) : false

  const handleClick = (e: React.MouseEvent) => {
    if (itemRequiresAuth && !user) {
      e.preventDefault()
      window.location.href = '/login'
    }
  }

  return (
    <div
      className="card-gradient-border rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-300"
      style={{
        animationDelay: `${Math.min(index * 50, 300)}ms`,
        animationFillMode: 'both',
      }}
    >
      <Link href={item.url || '#'} className="block group h-full" onClick={handleClick}>
        <Card className="glass-card border-border/30 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 h-full relative overflow-hidden group-hover:-translate-y-0.5 md:group-hover:-translate-y-1.5">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <CardContent className="p-3 md:p-5 h-full flex flex-col justify-between relative z-10">
            <div className="flex justify-between items-start mb-2 md:mb-4">
              <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary group-hover:scale-110 transition-all duration-300 icon-container-pulse">
                {item.icon ? (
                  <item.icon
                    size={18}
                    strokeWidth={1.5}
                    className="md:w-[22px] md:h-[22px]"
                  />
                ) : (
                  <Sparkles
                    size={18}
                    strokeWidth={1.5}
                    className="md:w-[22px] md:h-[22px]"
                  />
                )}
              </div>
              {item.url && (
                <div
                  className="p-2 rounded-full hover:bg-muted/80 transition-colors z-20 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    togglePin(item.url!.toString())
                  }}
                >
                  <Pin
                    className={cn(
                      'transition-all duration-300',
                      isPinned(item.url.toString())
                        ? 'text-primary fill-primary scale-110'
                        : 'text-muted-foreground/60 hover:text-primary',
                    )}
                    size={14}
                  />
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-1.5 md:gap-2 mb-1">
                <h3 className="text-sm md:text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                  {displayTitle}
                </h3>
                {item.badge && (
                  <span className="bg-gradient-to-r from-primary/20 to-primary/10 text-primary text-[9px] md:text-[10px] font-semibold px-1.5 md:px-2 py-0.5 rounded-full uppercase tracking-wider border border-primary/20">
                    {item.badge}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground/80 text-xs md:text-sm line-clamp-2 group-hover:text-muted-foreground transition-colors">
                {displayDescription}
              </p>
              {timestamp && (
                <p className="mt-1 text-[10px] text-muted-foreground/50 tabular-nums">
                  {formatRelativeTime(timestamp)}
                </p>
              )}
            </div>

            <div className="mt-2 md:mt-3 flex items-center text-[10px] md:text-xs font-medium text-primary opacity-40 group-hover:opacity-100 transition-all duration-300 transform translate-x-[-4px] group-hover:translate-x-0">
              {tCard('toolCard.launchTool')}{' '}
              <ArrowRight
                size={10}
                className="md:w-3 md:h-3 ml-1 md:ml-1.5 group-hover:translate-x-1 transition-transform"
              />
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  )
})
