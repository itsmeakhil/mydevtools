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

// App-icon chip background tints (matches the blue "Z" badge in the reference).
const chipColors = [
  'bg-sky-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-indigo-500',
]

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
      <div className="flex h-12 w-full shrink-0 items-center border-b bg-background/95 px-2 gap-1 backdrop-blur">

        {/* Left scroll arrow */}
        <button
          onClick={() => scroll('left')}
          aria-hidden={!canScrollLeft}
          className={cn(
            'flex h-6 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-all hover:bg-muted hover:text-foreground',
            canScrollLeft ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>

        {/* Scrollable tab list */}
        <div
          ref={scrollRef}
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1.5"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {tabs.map((tab, i) => {
            const config = getRouteConfig(tab.path)
            const Icon = config?.icon
            const title = config?.title ?? tab.path.split('/').pop() ?? tab.path
            const isActive = tab.path === activeTabPath
            const chipColor = chipColors[i % chipColors.length]

            return (
              <Tooltip key={tab.path}>
                <TooltipTrigger asChild>
                  <button
                    ref={isActive ? activeTabRef : null}
                    onClick={() => handleTabClick(tab.path)}
                    className={cn(
                      'group relative flex h-8 max-w-[200px] min-w-[80px] shrink-0 cursor-pointer items-center gap-2 rounded-full border px-2.5 text-xs font-medium transition-all duration-150',
                      isActive
                        ? 'border-border/60 bg-foreground/[0.07] text-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.06)] backdrop-blur-sm'
                        : 'border-transparent text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground'
                    )}
                  >
                    {Icon && (
                      <span
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] shadow-sm transition-all',
                          chipColor,
                          isActive ? 'opacity-100' : 'opacity-60 saturate-[0.7] group-hover:opacity-90'
                        )}
                      >
                        <Icon className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
                      </span>
                    )}

                    <span className="min-w-0 flex-1 truncate text-left leading-none tracking-tight">
                      {title}
                    </span>

                    <span
                      role="button"
                      aria-label={`Close ${title}`}
                      onClick={(e) => handleClose(e, tab.path)}
                      className={cn(
                        'flex h-3.5 w-3.5 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all duration-100',
                        isActive
                          ? 'text-muted-foreground hover:bg-muted hover:text-foreground opacity-100'
                          : 'text-muted-foreground/30 hover:bg-muted hover:text-foreground opacity-0 group-hover:opacity-100'
                      )}
                    >
                      <X className="h-2.5 w-2.5" strokeWidth={2.5} />
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
            )
          })}
        </div>

        {/* Right scroll arrow */}
        <button
          onClick={() => scroll('right')}
          aria-hidden={!canScrollRight}
          className={cn(
            'flex h-6 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-all hover:bg-muted hover:text-foreground',
            canScrollRight ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          )}
        >
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>

        {/* Divider */}
        <div className="mx-0.5 h-4 w-px shrink-0 bg-border/60" />

        {/* New tab button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onNewTab}
              className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
