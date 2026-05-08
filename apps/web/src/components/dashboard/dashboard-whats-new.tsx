'use client'

import React from 'react'
import { Wand2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { type RenderToolItem, type ToolCardProps } from './types'
import { ToolCard, HScrollFade } from './dashboard-tool-card'

interface DashboardWhatsNewProps {
  whatsNewItems: RenderToolItem[]
  toolCardProps: Omit<ToolCardProps, 'item' | 'id' | 'index'>
  searchQuery: string
  filterGroup: string | null
}

/**
 * "What's New" section — shows tools with badges.
 * Hidden when searching or filtering by category.
 */
export function DashboardWhatsNew({
  whatsNewItems,
  toolCardProps,
  searchQuery,
  filterGroup,
}: DashboardWhatsNewProps) {
  const t = useTranslations('Dashboard')

  if (whatsNewItems.length === 0 || searchQuery || filterGroup) return null

  return (
    <section className="space-y-3 md:space-y-5 rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-4 md:p-5">
      <div className="flex items-center gap-3 pb-2 border-b border-amber-500/15">
        <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500">
          <Wand2 size={18} strokeWidth={1.5} />
        </div>
        <h2 className="text-xl font-semibold">{t('sections.whatsNew')}</h2>
        <span className="text-xs font-medium text-amber-600/80 dark:text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
          {whatsNewItems.length}
        </span>
      </div>
      {/* Mobile: horizontal scroll */}
      <div className="md:hidden -mx-4 px-4">
        <HScrollFade>
          <div className="flex gap-3 overflow-x-auto scroll-snap-x pb-2 mobile-scrollbar-hide">
            {whatsNewItems.map((item, index) => (
              <div
                key={`new-mobile-${item.originalId}`}
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
        {whatsNewItems.map((item, index) => (
          <ToolCard
            key={`new-${item.originalId}`}
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
