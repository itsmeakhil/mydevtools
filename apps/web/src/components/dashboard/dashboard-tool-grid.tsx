'use client'

import React from 'react'
import { Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  type RenderGroup,
  type RenderToolItem,
  type ToolItem,
  type ToolCardProps,
  createItemId,
  groupDisplayTitle,
} from './types'
import { ToolCard } from './dashboard-tool-card'

interface DashboardToolGridProps {
  filteredGroups: RenderGroup[]
  popularItems: RenderToolItem[]
  toolCardProps: Omit<ToolCardProps, 'item' | 'id' | 'index'>
  searchQuery: string
  filterGroup: string | null
}

/**
 * Main tool grid — renders all tool groups and individual cards.
 * Also handles the no-results state with popular tool suggestions.
 */
export function DashboardToolGrid({
  filteredGroups,
  popularItems,
  toolCardProps,
  searchQuery,
  filterGroup,
}: DashboardToolGridProps) {
  const t = useTranslations('Dashboard')

  return (
    <div className="space-y-5 md:space-y-8">
      {filteredGroups.map((group, groupIndex) => (
        <section key={`${group.title}-${group.originalGroupIndex}`} className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 section-header-line pb-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                {group.icon ? (
                  <group.icon size={18} strokeWidth={1.5} />
                ) : (
                  <Sparkles size={18} strokeWidth={1.5} />
                )}
              </div>
              <h2 className="text-xl font-semibold">{groupDisplayTitle(group.title, t)}</h2>
              <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                {group.items.reduce(
                  (acc, item) => acc + (item.items ? item.items.length : 1),
                  0,
                )}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {group.items.map((item: any, itemIndex: number) => (
              <React.Fragment key={`${groupIndex}-${itemIndex}`}>
                {/* Render search result items (flattened) */}
                {item.originalId && (
                  <ToolCard
                    item={item}
                    id={item.originalId}
                    index={itemIndex}
                    {...toolCardProps}
                  />
                )}

                {/* Render nested items directly in the grid (only when not searching) */}
                {item.items &&
                  item.items.map((subItem: ToolItem, subIndex: number) => (
                    <ToolCard
                      key={`${groupIndex}-${itemIndex}-${subIndex}`}
                      item={{ ...subItem, icon: item.icon }}
                      id={createItemId(group.originalGroupIndex, itemIndex, subIndex)}
                      index={subIndex}
                      {...toolCardProps}
                    />
                  ))}
              </React.Fragment>
            ))}
          </div>
        </section>
      ))}
      {/* No results state */}
      {(searchQuery || filterGroup) && filteredGroups.length === 0 && (
        <div className="space-y-5">
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm font-medium text-foreground">{t('noResults')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('noResultsHint')}</p>
          </div>
          {popularItems.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                {t('popularTools')}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                {popularItems.map((item, index) => (
                  <ToolCard
                    key={`popular-${item.originalId}`}
                    item={item}
                    id={item.originalId!}
                    index={index}
                    {...toolCardProps}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
