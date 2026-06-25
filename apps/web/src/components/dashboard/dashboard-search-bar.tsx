'use client'

import React, { useEffect, useRef, useMemo } from 'react'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { sidebarData } from '@/components/sidebar/data/sidebar-data'
import { cn } from '@/lib/utils'
import { groupDisplayTitle } from './types'

interface DashboardSearchBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  filterGroup: string | null
  onFilterGroupChange: (group: string | null) => void
  showFilters: boolean
  onShowFiltersChange: (show: boolean) => void
  totalTools: number
}

/**
 * Sticky search bar with category filter chips.
 * Supports Cmd/Ctrl+K to focus from anywhere on the page.
 */
export function DashboardSearchBar({
  searchQuery,
  onSearchChange,
  filterGroup,
  onFilterGroupChange,
  showFilters,
  onShowFiltersChange,
  totalTools,
}: DashboardSearchBarProps) {
  const t = useTranslations('Dashboard')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Cmd/Ctrl + K focuses search
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Groups for category filter chips
  const filterGroups = useMemo(
    () => sidebarData.navGroups.map((g) => ({ title: g.title, icon: g.icon })),
    [],
  )

  return (
    <div className="sticky top-[56px] md:top-0 z-30 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border border-border/40 rounded-xl px-3 py-2 shadow-sm transition-all focus-within:border-primary/50 focus-within:shadow-md focus-within:shadow-primary/5 focus-within:ring-1 focus-within:ring-primary/20">
      <div className="relative flex items-center gap-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground" />
        <Input
          ref={searchInputRef}
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={`Search or jump to any of ${totalTools}+ tools…`}
          className="h-12 pl-11 pr-24 text-[15px] border-transparent bg-transparent shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:border-transparent"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {searchQuery && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onSearchChange('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7',
              (showFilters || filterGroup) && 'text-primary bg-primary/10',
            )}
            onClick={() => onShowFiltersChange(!showFilters)}
            aria-label="Toggle category filters"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </Button>
          <span className="hidden md:inline-flex items-center rounded-md border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            Ctrl/⌘ K
          </span>
        </div>
      </div>
      {/* Category filter chips — hidden until toggled */}
      {(showFilters || filterGroup !== null) && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 mobile-scrollbar-hide">
          <button
            type="button"
            onClick={() => onFilterGroupChange(null)}
            className={cn(
              'shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors',
              filterGroup === null
                ? 'bg-gradient-to-r from-primary to-violet-500 text-primary-foreground border-transparent shadow-sm'
                : 'bg-muted/50 text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground',
            )}
          >
            {t('filterAll')}
          </button>
          {filterGroups.map(({ title, icon: GroupIcon }) => (
            <button
              key={title}
              type="button"
              onClick={() => onFilterGroupChange(filterGroup === title ? null : title)}
              className={cn(
                'shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                filterGroup === title
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/50 text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground',
              )}
            >
              {GroupIcon && <GroupIcon className="w-3 h-3 shrink-0" />}
              {groupDisplayTitle(title, t)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
