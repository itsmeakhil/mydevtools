'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, ArrowRight, LayoutGrid } from 'lucide-react'
import { sidebarData } from '@/components/sidebar/data/sidebar-data'
import { usePinnedToolsStore, usePinnedToolsForActiveWorkspace, usePinWorkspaceId } from '@/store/pinned-tools-store'
import { useToolUsage } from '@/hooks/use-tool-usage'
import useAuth from '@/utils/useAuth'
import { TooltipProvider } from '@/components/ui/tooltip'
import {
  type FavoriteItem,
  type RenderToolItem,
  type RenderGroup,
  createItemId,
  findItemByUrl,
  getTotalToolCount,
  POPULAR_TOOL_URLS,
} from '@/components/dashboard/types'
import { DashboardHero } from '@/components/dashboard/dashboard-hero'
import { DashboardSearchBar } from '@/components/dashboard/dashboard-search-bar'
import { DashboardPinnedSection } from '@/components/dashboard/dashboard-pinned-section'
import { DashboardWhatsNew } from '@/components/dashboard/dashboard-whats-new'
import { DashboardRecentTools } from '@/components/dashboard/dashboard-recent-tools'
import { ActivityLogDrawer } from '@/components/dashboard/activity/activity-log-drawer'
import { DashboardToolGrid } from '@/components/dashboard/dashboard-tool-grid'
import { DashboardFeatured } from '@/components/dashboard/dashboard-featured'
import { RevealItem } from '@/components/dashboard/dashboard-reveal'
import { AppLoadingScreen } from '@/components/app-loading-screen'


// ─── Dashboard Page ─────────────────────────────────────────────────────────

const DashboardPage: React.FC = () => {
  const { user, loading } = useAuth(false)
  const pinnedToolUrls = usePinnedToolsForActiveWorkspace()
  const togglePinKeyed = usePinnedToolsStore((s) => s.togglePin)
  const pinWorkspaceId = usePinWorkspaceId()
  const togglePin = (url: string) => togglePinKeyed(pinWorkspaceId, url)
  const isPinned = (url: string) => pinnedToolUrls.includes(url)
  const { getRecentlyUsedTools } = useToolUsage()
  const [recentlyUsedItems, setRecentlyUsedItems] = useState<FavoriteItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterGroup, setFilterGroup] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  // Home-screen model: 'home' shows a curated launchpad; 'all' opens the full catalog.
  const [view, setView] = useState<'home' | 'all'>('home')

  const totalTools = useMemo(() => getTotalToolCount(), [])

  // Get recently used tools. Usage is keyed by route path; `usage.url` is the
  // fallback for entries written before that (their toolId was a bare slug).
  useEffect(() => {
    const recent = getRecentlyUsedTools(8)
    const items = recent
      .map((usage) => {
        const item = findItemByUrl(usage.toolId) ?? findItemByUrl(usage.url)
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
    return <AppLoadingScreen />
  }

  const toolCardProps = { user, isPinned, togglePin }

  // Home-screen model: curated launchpad by default; the full catalog only shows
  // when the user searches, filters, or explicitly opens "Browse all".
  const showCurated = view === 'home' && !searchQuery && !filterGroup
  const isBrowsing = !!searchQuery || !!filterGroup || view === 'all'

  return (
    <TooltipProvider delayDuration={300} disableHoverableContent>
    <div className="relative min-h-screen mobile-nav-offset">
      {/* ── Mobile Sticky Header (outside padded container for full-bleed) ── */}
      <DashboardHero
        totalTools={totalTools}
        pinnedCount={pinnedItems.length}
        recentCount={recentlyUsedItems.length}
        mobileOnly
      />

      <div className="px-3 pt-4 md:px-8 md:pt-8 pb-24 md:pb-12">
        <div className="max-w-6xl mx-auto space-y-5 md:space-y-6">
          {/* ── Desktop Hero (inside padded container for alignment) ── */}
          <RevealItem index={0}>
            <DashboardHero
              totalTools={totalTools}
              pinnedCount={pinnedItems.length}
              recentCount={recentlyUsedItems.length}
              desktopOnly
            />
          </RevealItem>
          <div className="w-full">
            <div className="mb-3 flex items-center justify-end gap-3">
              <ActivityLogDrawer />
            </div>

            <div className="space-y-6 md:space-y-8">
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



              {/* ── Curated home (launchpad) ── */}
              {showCurated && (
                <>
                  {/* Pinned — your go-to tools */}
                  <RevealItem index={1}>
                    <DashboardPinnedSection
                      pinnedItems={pinnedItems}
                      toolCardProps={toolCardProps}
                      searchQuery={searchQuery}
                      filterGroup={filterGroup}
                    />
                  </RevealItem>

                  {/* Recently used — jump back in */}
                  <RevealItem index={2}>
                    <DashboardRecentTools
                      recentItems={recentlyUsedItems}
                      toolCardProps={toolCardProps}
                      user={user}
                      searchQuery={searchQuery}
                    />
                  </RevealItem>

                  {/* Suggested / popular — discovery */}
                  <RevealItem index={3}>
                    <DashboardFeatured
                      items={popularItems}
                      toolCardProps={toolCardProps}
                      searchQuery={searchQuery}
                      filterGroup={filterGroup}
                    />
                  </RevealItem>

                  {/* What's new */}
                  <RevealItem index={4}>
                    <DashboardWhatsNew
                      whatsNewItems={whatsNewItems}
                      toolCardProps={toolCardProps}
                      searchQuery={searchQuery}
                      filterGroup={filterGroup}
                    />
                  </RevealItem>

                  {/* Browse-all entry — the door to the full catalog */}
                  <RevealItem index={6}>
                    <button
                      type="button"
                      onClick={() => setView('all')}
                      className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-elev-1 transition-colors duration-150 hover:border-foreground/[0.12] hover:bg-foreground/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.05] text-primary">
                        <LayoutGrid className="h-[18px] w-[18px]" strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-foreground">
                          Browse all {totalTools} tools
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Explore the full toolkit by category
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                    </button>
                  </RevealItem>
                </>
              )}

              {/* ── Full catalog (searching, filtering, or "Browse all") ── */}
              {isBrowsing && (
                <RevealItem index={1}>
                  {view === 'all' && !searchQuery && !filterGroup && (
                    <button
                      type="button"
                      onClick={() => setView('home')}
                      className="mb-3 inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to home
                    </button>
                  )}
                  <DashboardToolGrid
                    filteredGroups={filteredGroups}
                    popularItems={popularItems}
                    toolCardProps={toolCardProps}
                    searchQuery={searchQuery}
                    filterGroup={filterGroup}
                  />
                </RevealItem>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  )
}

export default DashboardPage
