'use client'

import React from 'react'
import { Wand2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { type RenderToolItem, type ToolCardProps } from './types'
import { ToolCard, HScrollFade } from './dashboard-tool-card'
import { DashboardSectionHeader } from './dashboard-section-header'

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
    <section className="space-y-3">
      <DashboardSectionHeader
        icon={Wand2}
        title={t('sections.whatsNew')}
        count={whatsNewItems.length}
      />
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
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-3">
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
