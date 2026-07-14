'use client'

import React from 'react'
import { TrendingUp } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { type RenderToolItem, type ToolCardProps } from './types'
import { ToolCard } from './dashboard-tool-card'
import { DashboardSectionHeader } from './dashboard-section-header'

const FEATURED_ACCENT = { bg: 'bg-primary/15', text: 'text-primary' }

interface DashboardFeaturedProps {
  items: RenderToolItem[]
  toolCardProps: Omit<ToolCardProps, 'item' | 'id' | 'index'>
  searchQuery: string
  filterGroup: string | null
}

/**
 * "Popular tools" featured panel — a bento-style highlighted starting point.
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
    <section className="space-y-4 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.06] via-card/20 to-transparent p-4 md:p-5">
      <DashboardSectionHeader
        icon={TrendingUp}
        title={t('popularTools')}
        accent={FEATURED_ACCENT}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-6">
        {items.map((item, index) => (
          <ToolCard
            key={`featured-${item.originalId}`}
            item={item}
            id={item.originalId!}
            index={index}
            accent={FEATURED_ACCENT}
            {...toolCardProps}
          />
        ))}
      </div>
    </section>
  )
}
