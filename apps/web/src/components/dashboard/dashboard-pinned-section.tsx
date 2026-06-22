'use client'

import React, { useState } from 'react'
import { Pin, ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { type RenderToolItem, type ToolCardProps } from './types'
import { ToolCard, ToolCardSkeleton, HScrollFade } from './dashboard-tool-card'
import { usePinnedToolsHydrated } from '@/store/pinned-tools-store'
import { Button } from '@/components/ui/button'

interface DashboardPinnedSectionProps {
  pinnedItems: RenderToolItem[]
  toolCardProps: Omit<ToolCardProps, 'item' | 'id' | 'index'>
  searchQuery: string
  filterGroup: string | null
}

const VISIBLE_CAP = 8

const SKELETON_GRID_CLASS =
  'hidden md:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4'

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
  const hydrated = usePinnedToolsHydrated()
  const [expanded, setExpanded] = useState(false)

  // Hide entirely when searching or filtering by category
  if (searchQuery || filterGroup) return null

  // Show skeleton until persisted state hydrates — avoids empty-state flash
  if (!hydrated) {
    return (
      <section className="space-y-3 md:space-y-5">
        <div className="flex items-center gap-3 section-header-line pb-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Pin size={18} strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-semibold">{t('sections.pinned')}</h2>
        </div>
        <div className={SKELETON_GRID_CLASS}>
          {Array.from({ length: 4 }).map((_, i) => (
            <ToolCardSkeleton key={i} />
          ))}
        </div>
      </section>
    )
  }

  // Empty state
  if (pinnedItems.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-dashed border-border/50 bg-muted/20 px-4 py-3.5">
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

  const overflow = pinnedItems.length - VISIBLE_CAP
  const visible = expanded ? pinnedItems : pinnedItems.slice(0, VISIBLE_CAP)

  return (
    <section className="space-y-3 md:space-y-5">
      <div className="flex items-center gap-3 section-header-line pb-2">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
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
      <div className="hidden md:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
        {visible.map((item, index) => (
          <ToolCard
            key={`pinned-${item.originalId}`}
            item={item}
            id={item.originalId!}
            index={index}
            {...toolCardProps}
          />
        ))}
      </div>
      {overflow > 0 && (
        <div className="hidden md:flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            className="gap-1.5 text-xs text-muted-foreground"
          >
            {expanded ? 'Show less' : `Show ${overflow} more`}
            <ChevronDown
              size={14}
              className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </Button>
        </div>
      )}
    </section>
  )
}
