'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { X, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
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

  // Scroll active tab into view when it changes
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

  // Horizontal scroll via mouse wheel
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

  function handleClose(e: React.MouseEvent, path: string) {
    e.stopPropagation()
    const { tabs, activeTabPath } = useTabStore.getState()
    const idx = tabs.findIndex(t => t.path === path)
    const newTabs = tabs.filter(t => t.path !== path)
    if (activeTabPath === path) {
      const next = newTabs[idx]?.path ?? newTabs[Math.max(0, idx - 1)]?.path ?? null
      router.push(next ?? '/dashboard')
    }
    closeTab(path)
  }

  return (
    <TooltipProvider delayDuration={500}>
      <div className="flex h-9 w-full shrink-0 items-end border-b bg-muted/30 px-1 gap-0.5">

        {/* Left scroll arrow */}
        <button
          onClick={() => scroll('left')}
          aria-hidden={!canScrollLeft}
          className={cn(
            'mb-0.5 flex h-6 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-all hover:bg-muted hover:text-foreground',
            canScrollLeft ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>

        {/* Scrollable tab list */}
        <div
          ref={scrollRef}
          className="flex min-w-0 flex-1 items-end gap-0.5 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {tabs.map((tab) => {
            const config = getRouteConfig(tab.path)
            const Icon = config?.icon
            const title = config?.title ?? tab.path.split('/').pop() ?? tab.path
            const isActive = tab.path === activeTabPath

            return (
              <Tooltip key={tab.path}>
                <TooltipTrigger asChild>
                  <button
                    ref={isActive ? activeTabRef : null}
                    onClick={() => handleTabClick(tab.path)}
                    className={cn(
                      'group relative flex h-8 max-w-[200px] min-w-[90px] shrink-0 cursor-pointer items-center gap-1.5 rounded-t-md border px-2.5 text-xs transition-all duration-150',
                      isActive
                        ? 'border-border border-b-background bg-background text-foreground shadow-sm z-10'
                        : 'border-transparent bg-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground hover:border-border/50'
                    )}
                  >
                    {Icon && (
                      <Icon
                        className={cn(
                          'h-3 w-3 shrink-0 transition-colors',
                          isActive ? 'text-primary' : 'text-muted-foreground/70 group-hover:text-muted-foreground'
                        )}
                        strokeWidth={2}
                      />
                    )}
                    <span className="min-w-0 flex-1 truncate text-left font-medium leading-none tracking-tight">
                      {title}
                    </span>
                    <span
                      role="button"
                      aria-label={`Close ${title}`}
                      onClick={(e) => handleClose(e, tab.path)}
                      className={cn(
                        'ml-0.5 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded transition-all duration-100',
                        isActive
                          ? 'text-muted-foreground/60 hover:bg-muted hover:text-foreground opacity-100'
                          : 'text-muted-foreground/40 hover:bg-muted hover:text-foreground opacity-0 group-hover:opacity-100'
                      )}
                    >
                      <X className="h-2.5 w-2.5" strokeWidth={2.5} />
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {title}
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
            'mb-0.5 flex h-6 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-all hover:bg-muted hover:text-foreground',
            canScrollRight ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          )}
        >
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>

        {/* Divider */}
        <div className="mb-1 mx-0.5 h-4 w-px shrink-0 bg-border/60" />

        {/* New tab button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onNewTab}
              className="mb-0.5 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Open tool (⌘K)"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
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
