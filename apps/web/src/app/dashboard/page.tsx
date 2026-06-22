'use client'

import React, { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { BarChart3, LayoutGrid } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { sidebarData } from '@/components/sidebar/data/sidebar-data'
import { usePinnedToolsStore } from '@/store/pinned-tools-store'
import { useToolUsage } from '@/hooks/use-tool-usage'
import useAuth from '@/utils/useAuth'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  type FavoriteItem,
  type RenderToolItem,
  type RenderGroup,
  createItemId,
  findItemById,
  getTotalToolCount,
  POPULAR_TOOL_URLS,
} from '@/components/dashboard/types'
import { DashboardHero } from '@/components/dashboard/dashboard-hero'
import { DashboardSearchBar } from '@/components/dashboard/dashboard-search-bar'
import { DashboardPinnedSection } from '@/components/dashboard/dashboard-pinned-section'
import { DashboardWhatsNew } from '@/components/dashboard/dashboard-whats-new'
import { DashboardRecentTools } from '@/components/dashboard/dashboard-recent-tools'
import { ActivityLogDrawer } from '@/components/dashboard/activity/activity-log-drawer'
import { DashboardLoginCta } from '@/components/dashboard/dashboard-login-cta'
import { DashboardToolGrid } from '@/components/dashboard/dashboard-tool-grid'


// Lazy-load the analytics panel — it's behind a tab click, not in the critical path
const DashboardAnalyticsPanel = dynamic(
  () =>
    import('@/components/dashboard/dashboard-analytics-panel').then(
      (m) => m.DashboardAnalyticsPanel,
    ),
  {
    loading: () => (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      </div>
    ),
  },
)

// ─── Dashboard Page ─────────────────────────────────────────────────────────

const DashboardPage: React.FC = () => {
  const t = useTranslations('Dashboard')
  const tTabs = useTranslations('Dashboard.tabs')
  const { user, loading } = useAuth(false)
  const pinnedToolUrls = usePinnedToolsStore((s) => s.pinnedTools)
  const togglePin = usePinnedToolsStore((s) => s.togglePin)
  const isPinned = (url: string) => pinnedToolUrls.includes(url)
  const { getRecentlyUsedTools } = useToolUsage()
  const [recentlyUsedItems, setRecentlyUsedItems] = useState<FavoriteItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterGroup, setFilterGroup] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const totalTools = useMemo(() => getTotalToolCount(), [])

  // Get recently used tools
  useEffect(() => {
    const recent = getRecentlyUsedTools(8)
    const items = recent
      .map((usage) => {
        const item = findItemById(usage.toolId)
        return item ? { id: usage.toolId, timestamp: usage.timestamp, ...item } : null
      })
      .filter((item): item is FavoriteItem => !!item)
    setRecentlyUsedItems(items)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Tools with a badge — shown in the "What's New" section
  const whatsNewItems = useMemo<RenderToolItem[]>(() => {
    const items: RenderToolItem[] = []
    sidebarData.navGroups.forEach((group, groupIndex) => {
      group.items.forEach((item, itemIndex) => {
        if (item.badge) {
          items.push({ ...item, originalId: createItemId(groupIndex, itemIndex) })
        }
        item.items?.forEach((subItem, subIndex) => {
          if (subItem.badge) {
            items.push({
              ...subItem,
              icon: subItem.icon || item.icon,
              originalId: createItemId(groupIndex, itemIndex, subIndex),
            })
          }
        })
      })
    })
    return items
  }, [])

  // Pinned tools — derived from URL-keyed store, preserving pin order
  const pinnedItems = useMemo<RenderToolItem[]>(() => {
    if (pinnedToolUrls.length === 0) return []
    const found: RenderToolItem[] = []
    sidebarData.navGroups.forEach((group, groupIndex) => {
      group.items.forEach((item, itemIndex) => {
        const url = item.url?.toString() ?? ''
        if (pinnedToolUrls.includes(url)) {
          found.push({ ...item, originalId: createItemId(groupIndex, itemIndex) })
        }
        item.items?.forEach((subItem, subIndex) => {
          const subUrl = subItem.url?.toString() ?? ''
          if (pinnedToolUrls.includes(subUrl)) {
            found.push({
              ...subItem,
              icon: subItem.icon || item.icon,
              originalId: createItemId(groupIndex, itemIndex, subIndex),
            })
          }
        })
      })
    })
    return pinnedToolUrls
      .map((url) => found.find((i) => i.url?.toString() === url))
      .filter((i): i is RenderToolItem => !!i)
  }, [pinnedToolUrls])

  // Filter tools based on search query and active group filter
  const filteredGroups = useMemo<RenderGroup[]>(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    const mobileFilteredGroups = sidebarData.navGroups
      .map((group, groupIndex) => {
        if (filterGroup && group.title !== filterGroup) return null

        const visibleItems = group.items.map((item, itemIndex) => ({ item, itemIndex }))

        const searchableItems = visibleItems.flatMap<RenderToolItem>(({ item, itemIndex }) => {
          if (item.items?.length) {
            return item.items
              .map((subItem, subIndex) => ({
                ...subItem,
                icon: subItem.icon || item.icon,
                originalId: createItemId(groupIndex, itemIndex, subIndex),
              }))
              .filter((subItem) => {
                if (!normalizedQuery) return true
                const title = (subItem.title || '').toLowerCase()
                const description = (subItem.description || '').toLowerCase()
                return title.includes(normalizedQuery) || description.includes(normalizedQuery)
              })
          }

          const normalizedTitle = (item.title || '').toLowerCase()
          const normalizedDescription = (item.description || '').toLowerCase()
          if (
            normalizedQuery &&
            !normalizedTitle.includes(normalizedQuery) &&
            !normalizedDescription.includes(normalizedQuery)
          ) {
            return []
          }
          return [{ ...item, originalId: createItemId(groupIndex, itemIndex) }]
        })

        const groupMatches =
          normalizedQuery && group.title.toLowerCase().includes(normalizedQuery)
        const finalItems =
          groupMatches && searchableItems.length === 0
            ? visibleItems
                .filter(({ item }) => !item.items)
                .map(({ item, itemIndex }) => ({
                  ...item,
                  originalId: createItemId(groupIndex, itemIndex),
                }))
            : searchableItems

        const dedupedItems = Array.from(
          new Map(finalItems.map((item) => [item.originalId || item.title, item])).values(),
        )

        const itemsToRender: RenderToolItem[] = normalizedQuery
          ? dedupedItems
          : visibleItems.map(({ item, itemIndex }) => {
              if (item.items?.length) {
                return {
                  ...item,
                  items: item.items.map((subItem, subIndex) => ({
                    ...subItem,
                    icon: subItem.icon || item.icon,
                    originalId: createItemId(groupIndex, itemIndex, subIndex),
                  })),
                  originalId: createItemId(groupIndex, itemIndex),
                }
              }
              return { ...item, originalId: createItemId(groupIndex, itemIndex) }
            })
        if (itemsToRender.length === 0) return null

        return {
          ...group,
          items: itemsToRender,
          originalGroupIndex: groupIndex,
        }
      })
      .filter((group): group is RenderGroup => group !== null)

    return mobileFilteredGroups
  }, [searchQuery, filterGroup])

  // Popular tools shown in the no-results state
  const popularItems = useMemo<RenderToolItem[]>(() => {
    const found: RenderToolItem[] = []
    sidebarData.navGroups.forEach((group, gi) => {
      group.items.forEach((item, ii) => {
        const url = item.url?.toString() ?? ''
        if (POPULAR_TOOL_URLS.includes(url)) {
          found.push({ ...item, originalId: createItemId(gi, ii) })
        }
        item.items?.forEach((sub, si) => {
          const subUrl = sub.url?.toString() ?? ''
          if (POPULAR_TOOL_URLS.includes(subUrl)) {
            found.push({
              ...sub,
              icon: sub.icon || item.icon,
              originalId: createItemId(gi, ii, si),
            })
          }
        })
      })
    })
    return POPULAR_TOOL_URLS.map((url) => found.find((i) => i.url?.toString() === url)).filter(
      (i): i is RenderToolItem => !!i,
    )
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 bg-muted rounded-full" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </div>
    )
  }

  const toolCardProps = { user, isPinned, togglePin }

  return (
    <div className="min-h-screen bg-background/50 dashboard-grid-bg mobile-nav-offset">
      {/* ── Mobile Sticky Header (outside padded container for full-bleed) ── */}
      <DashboardHero
        user={user}
        totalTools={totalTools}
        pinnedCount={pinnedItems.length}
        recentCount={recentlyUsedItems.length}
        mobileOnly
      />

      <div className="px-3 md:px-8 pb-24 md:pb-12">
        <div className="max-w-7xl mx-auto space-y-5 md:space-y-8">
          {/* ── Desktop Hero (inside padded container for alignment) ── */}
          <DashboardHero
            user={user}
            totalTools={totalTools}
            pinnedCount={pinnedItems.length}
            recentCount={recentlyUsedItems.length}
            desktopOnly
          />
          <Tabs defaultValue="apps" className="w-full">
            <div className="mb-3 flex items-center justify-between gap-3">
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-muted/50 p-1 sm:inline-flex sm:w-auto sm:justify-start">
                <TabsTrigger value="apps" className="gap-1.5 text-xs sm:text-sm">
                  <LayoutGrid className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {tTabs('apps')}
                </TabsTrigger>
                <TabsTrigger value="analytics" className="gap-1.5 text-xs sm:text-sm">
                  <BarChart3 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {tTabs('analytics')}
                </TabsTrigger>
              </TabsList>
              <ActivityLogDrawer />
            </div>

            <TabsContent
              value="apps"
              className="mt-0 space-y-4 md:space-y-6 focus-visible:outline-none"
            >
              {/* ── Search ── */}
              <DashboardSearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                filterGroup={filterGroup}
                onFilterGroupChange={setFilterGroup}
                showFilters={showFilters}
                onShowFiltersChange={setShowFilters}
                totalTools={totalTools}
              />



              {/* ── Pinned Tools ── */}
              <DashboardPinnedSection
                pinnedItems={pinnedItems}
                toolCardProps={toolCardProps}
                searchQuery={searchQuery}
                filterGroup={filterGroup}
              />

              {/* ── What's New ── */}
              <DashboardWhatsNew
                whatsNewItems={whatsNewItems}
                toolCardProps={toolCardProps}
                searchQuery={searchQuery}
                filterGroup={filterGroup}
              />

              {/* ── Recently Used ── */}
              <DashboardRecentTools
                recentItems={recentlyUsedItems}
                toolCardProps={toolCardProps}
                user={user}
                searchQuery={searchQuery}
              />

              {/* ── Login CTA (non-auth) ── */}
              <DashboardLoginCta user={user} searchQuery={searchQuery} />

              {/* ── All Tools Grid ── */}
              <DashboardToolGrid
                filteredGroups={filteredGroups}
                popularItems={popularItems}
                toolCardProps={toolCardProps}
                searchQuery={searchQuery}
                filterGroup={filterGroup}
              />
            </TabsContent>

            <TabsContent value="analytics" className="mt-0 rounded-2xl focus-visible:outline-none">
              {user ? (
                <DashboardAnalyticsPanel />
              ) : (
                <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/50 bg-gradient-to-br from-primary/[0.04] via-muted/20 to-background px-6 py-12 text-center md:px-10 md:py-16">
                  <div
                    className="pointer-events-none absolute inset-0 dashboard-grid-bg opacity-30"
                    aria-hidden
                  />
                  <div className="relative mx-auto max-w-md space-y-5">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-violet-500/10 text-primary shadow-inner ring-1 ring-border/40">
                      <BarChart3 className="h-8 w-8" strokeWidth={1.5} aria-hidden />
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {t('analytics.loginHint')}
                    </p>
                    <Button type="button" className="rounded-xl shadow-sm" asChild>
                      <Link href="/login">{t('signIn')}</Link>
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
