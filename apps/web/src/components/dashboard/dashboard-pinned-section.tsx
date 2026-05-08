'use client'

import React from 'react'
import { Pin } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { type RenderToolItem, type ToolCardProps } from './types'
import { ToolCard, HScrollFade } from './dashboard-tool-card'

interface DashboardPinnedSectionProps {
  pinnedItems: RenderToolItem[]
  toolCardProps: Omit<ToolCardProps, 'item' | 'id' | 'index'>
  searchQuery: string
  filterGroup: string | null
}

/**
 * Pinned tools section.
 * Shows a helpful empty-state prompt when nothing is pinned,
 * or a responsive grid/scroll of pinned tool cards.
 */
export function DashboardPinnedSection({
  pinnedItems,
  toolCardProps,
  searchQuery,
  filterGroup,
}: DashboardPinnedSectionProps) {
  const t = useTranslations('Dashboard')

  // Hide entirely when searching or filtering by category
  if (searchQuery || filterGroup) return null

  // Empty state
  if (pinnedItems.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-dashed border-border/50 bg-muted/20 px-4 py-3.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5">
          <Pin size={16} strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{t('sections.pinned')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t('pinnedEmpty')}</p>
        </div>
      </div>
    )
  }

  return (
    <section className="space-y-3 md:space-y-5">
      <div className="flex items-center gap-3 section-header-line pb-2">
        <div className="p-2 rounded-xl bg-primary/10 text-primary">
          <Pin size={18} strokeWidth={1.5} />
        </div>
        <h2 className="text-xl font-semibold">{t('sections.pinned')}</h2>
        <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
          {pinnedItems.length}
        </span>
      </div>
      {/* Mobile: horizontal scroll */}
      <div className="md:hidden -mx-4 px-4">
        <HScrollFade>
          <div className="flex gap-3 overflow-x-auto scroll-snap-x pb-2 mobile-scrollbar-hide">
            {pinnedItems.map((item, index) => (
              <div
                key={`pinned-mobile-${item.originalId}`}
                className="scroll-snap-item w-[min(280px,75vw)] flex-shrink-0"
              >
                <ToolCard item={item} id={item.originalId!} index={index} {...toolCardProps} />
              </div>
            ))}
          </div>
        </HScrollFade>
      </div>
      {/* Desktop: grid */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4">
        {pinnedItems.map((item, index) => (
          <ToolCard
            key={`pinned-${item.originalId}`}
            item={item}
            id={item.originalId!}
            index={index}
            {...toolCardProps}
          />
        ))}
      </div>
    </section>
  )
}
