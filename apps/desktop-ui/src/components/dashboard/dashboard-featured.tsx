'use client'

import React from 'react'
import { TrendingUp } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { type RenderToolItem, type ToolCardProps } from './types'
import { ToolCard } from './dashboard-tool-card'
import { DashboardSectionHeader } from './dashboard-section-header'

interface DashboardFeaturedProps {
  items: RenderToolItem[]
  toolCardProps: Omit<ToolCardProps, 'item' | 'id' | 'index'>
  searchQuery: string
  filterGroup: string | null
}

/**
 * "Popular tools" section — a suggested starting point.
 * Hidden while searching/filtering (the grid below handles those states).
 */
export function DashboardFeatured({
  items,
  toolCardProps,
  searchQuery,
  filterGroup,
}: DashboardFeaturedProps) {
  const t = useTranslations('Dashboard')

  if (items.length === 0 || searchQuery || filterGroup) return null

  return (
    <section className="space-y-3">
      <DashboardSectionHeader icon={TrendingUp} title={t('popularTools')} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {items.map((item, index) => (
          <ToolCard
            key={`featured-${item.originalId}`}
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
