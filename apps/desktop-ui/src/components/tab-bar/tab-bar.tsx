'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { X, Grid2x2Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTabStore } from '@/store/tab-store'
import { getRouteConfig } from '@/lib/route-config'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface TabBarProps {
  onNewTab?: () => void
}

export function TabBar({ onNewTab }: TabBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { tabs, activeTabPath, closeTab } = useTabStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLButtonElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateScrollState()
    el.addEventListener('scroll', updateScrollState, { passive: true })
    const ro = new ResizeObserver(updateScrollState)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateScrollState)
      ro.disconnect()
    }
  }, [tabs, updateScrollState])

  useEffect(() => {
    const btn = activeTabRef.current
    const container = scrollRef.current
    if (!btn || !container) return
    const { offsetLeft, offsetWidth } = btn
    const { scrollLeft, clientWidth } = container
    if (offsetLeft < scrollLeft) {
      container.scrollTo({ left: offsetLeft - 8, behavior: 'smooth' })
    } else if (offsetLeft + offsetWidth > scrollLeft + clientWidth) {
      container.scrollTo({ left: offsetLeft + offsetWidth - clientWidth + 8, behavior: 'smooth' })
    }
  }, [activeTabPath])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return
      e.preventDefault()
      el.scrollBy({ left: e.deltaY, behavior: 'smooth' })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  if (tabs.length === 0) return null

  function scroll(dir: 'left' | 'right') {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -160 : 160, behavior: 'smooth' })
  }

  function handleTabClick(path: string) {
    if (path !== pathname) router.push(path)
  }

  const closeTabAndNavigate = useCallback((path: string) => {
    const { tabs, activeTabPath } = useTabStore.getState()
    const idx = tabs.findIndex(t => t.path === path)
    const newTabs = tabs.filter(t => t.path !== path)
    if (activeTabPath === path) {
      const next = newTabs[idx]?.path ?? newTabs[Math.max(0, idx - 1)]?.path ?? null
      router.push(next ?? '/dashboard')
    }
    closeTab(path)
  }, [router, closeTab])

  function handleClose(e: React.MouseEvent, path: string) {
    e.stopPropagation()
    closeTabAndNavigate(path)
  }

  // Keyboard shortcuts: ⌥1–9 jump to tab, ⌥W close active tab.
  // (⌘W / ⌘1–9 are browser-reserved and cannot be intercepted.)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      // e.code is layout-independent — on macOS ⌥ changes e.key ('w' → '∑').
      if (e.code === 'KeyW') {
        const { activeTabPath } = useTabStore.getState()
        if (!activeTabPath) return
        e.preventDefault()
        closeTabAndNavigate(activeTabPath)
        return
      }
      const digit = /^Digit([1-9])$/.exec(e.code)
      if (digit) {
        const { tabs, activeTabPath } = useTabStore.getState()
        const tab = tabs[Number(digit[1]) - 1]
        if (!tab) return
        e.preventDefault()
        if (tab.path !== activeTabPath) router.push(tab.path)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [router, closeTabAndNavigate])

  return (
    <TooltipProvider delayDuration={500}>
      {/* Raised strip; tabs align to its bottom edge and weld to the content
          below across the shared seam (the strip's bottom border). */}
      <div className="flex h-11 w-full shrink-0 items-end gap-0 border-b border-border bg-[hsl(var(--surface-2))] pl-2 pr-1.5">

        {/* Left scroll arrow */}
        <button
          onClick={() => scroll('left')}
          aria-hidden={!canScrollLeft}
          className={cn(
            'mb-[9px] flex h-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-all duration-150 hover:bg-[hsl(var(--surface-3))] hover:text-foreground',
            canScrollLeft ? 'w-5 opacity-100 pointer-events-auto' : 'w-0 opacity-0 pointer-events-none'
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>

        {/* Scrollable tab list */}
        <div
          ref={scrollRef}
          className="flex min-w-0 flex-1 items-end gap-0 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {tabs.map((tab, i) => {
            const config = getRouteConfig(tab.path)
            const Icon = config?.icon
            const title = config?.title ?? tab.path.split('/').pop() ?? tab.path
            const isActive = tab.path === activeTabPath
            const prevActive = i > 0 && tabs[i - 1].path === activeTabPath
            // Bifurcation between two inactive neighbours; suppressed next to the
            // active tab, whose own border already separates it. Always occupies
            // 1px so tabs never shift when the divider toggles.
            const showDivider = i > 0 && !isActive && !prevActive

            return (
              <React.Fragment key={tab.path}>
                <div
                  aria-hidden
                  className={cn(
                    'h-5 w-px shrink-0 self-center bg-border transition-opacity duration-150',
                    showDivider ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      ref={isActive ? activeTabRef : null}
                      onClick={() => handleTabClick(tab.path)}
                      className={cn(
                        'group relative flex h-[34px] max-w-[230px] min-w-[144px] shrink-0 cursor-pointer items-center gap-2.5 rounded-t-[8px] border border-b-0 px-4 text-[13px] font-medium leading-none transition-colors duration-150',
                        isActive
                          // Welded to content: content surface, sits 1px over the
                          // strip's bottom border (breaks the seam), accent cap on top.
                          ? 'z-10 -mb-px border-border bg-[hsl(var(--surface-1))] text-foreground'
                          : 'border-transparent text-foreground/60 hover:bg-foreground/[0.05] hover:text-foreground/90'
                      )}
                    >
                      {isActive && (
                        <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 rounded-t-[8px] bg-primary" />
                      )}

                      {Icon && (
                        <Icon
                          className={cn(
                            'h-3.5 w-3.5 shrink-0 transition-colors',
                            isActive
                              ? 'text-primary'
                              : 'text-muted-foreground/70 group-hover:text-foreground/70'
                          )}
                          strokeWidth={2}
                        />
                      )}

                      <span className="min-w-0 flex-1 truncate text-left">
                        {title}
                      </span>

                      <span
                        role="button"
                        aria-label={`Close ${title}`}
                        onClick={(e) => handleClose(e, tab.path)}
                        className={cn(
                          'flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded transition-all duration-100 hover:bg-[hsl(var(--surface-3))] hover:text-foreground',
                          isActive
                            ? 'text-muted-foreground opacity-100'
                            : 'text-muted-foreground/40 opacity-0 group-hover:opacity-100'
                        )}
                      >
                        <X className="h-3 w-3" strokeWidth={2.5} />
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="flex items-center gap-1.5 text-xs">
                    {title}
                    {i < 9 && (
                      <kbd className="rounded border border-border/60 bg-muted/60 px-1 font-mono text-[10px] text-muted-foreground">
                        ⌥{i + 1}
                      </kbd>
                    )}
                  </TooltipContent>
                </Tooltip>
              </React.Fragment>
            )
          })}
        </div>

        {/* Right scroll arrow */}
        <button
          onClick={() => scroll('right')}
          aria-hidden={!canScrollRight}
          className={cn(
            'mb-[9px] flex h-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-all duration-150 hover:bg-[hsl(var(--surface-3))] hover:text-foreground',
            canScrollRight ? 'w-5 opacity-100 pointer-events-auto' : 'w-0 opacity-0 pointer-events-none'
          )}
        >
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>

        {/* Divider */}
        <div className="mx-1 mb-[9px] h-5 w-px shrink-0 self-center bg-border" />

        {/* New tab button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onNewTab}
              className="mb-[9px] flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors duration-150 hover:bg-[hsl(var(--surface-3))] hover:text-foreground"
              aria-label="Open tool (⌘K)"
            >
              <Grid2x2Plus className="h-4 w-4" strokeWidth={2} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Open tool (⌘K)
          </TooltipContent>
        </Tooltip>

      </div>
    </TooltipProvider>
  )
}
