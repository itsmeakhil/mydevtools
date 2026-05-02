'use client'

import React, { useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { X, Plus } from 'lucide-react'
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

  // Scroll active tab into view when it changes
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }, [activeTabPath])

  if (tabs.length === 0) return null

  function handleTabClick(path: string) {
    if (path !== pathname) {
      router.push(path)
    }
  }

  function handleClose(e: React.MouseEvent, path: string) {
    e.stopPropagation()
    const { tabs, activeTabPath } = useTabStore.getState()
    const idx = tabs.findIndex(t => t.path === path)
    const newTabs = tabs.filter(t => t.path !== path)

    // If closing active tab, navigate to the adjacent one
    if (activeTabPath === path) {
      const nextPath = newTabs[idx]?.path ?? newTabs[Math.max(0, idx - 1)]?.path ?? null
      if (nextPath) {
        router.push(nextPath)
      } else {
        router.push('/dashboard')
      }
    }

    closeTab(path)
  }

  return (
    <TooltipProvider delayDuration={600}>
      <div className="flex h-9 w-full shrink-0 items-end border-b bg-background px-1">
        {/* Scrollable tab list */}
        <div
          ref={scrollRef}
          className="flex min-w-0 flex-1 items-end gap-px overflow-x-auto scrollbar-none"
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
                      'group relative flex h-8 max-w-[180px] min-w-[80px] shrink-0 cursor-pointer items-center gap-1.5 rounded-t-md border border-b-0 px-2.5 text-xs transition-colors',
                      isActive
                        ? 'border-border bg-background text-foreground shadow-sm'
                        : 'border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                    )}
                  >
                    {Icon && (
                      <Icon
                        className={cn(
                          'h-3 w-3 shrink-0',
                          isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                        )}
                        strokeWidth={2}
                      />
                    )}
                    <span className="min-w-0 flex-1 truncate text-left font-medium leading-none">
                      {title}
                    </span>
                    <span
                      role="button"
                      aria-label={`Close ${title}`}
                      onClick={(e) => handleClose(e, tab.path)}
                      className={cn(
                        'ml-0.5 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-sm transition-colors',
                        isActive
                          ? 'opacity-60 hover:bg-muted hover:opacity-100'
                          : 'opacity-0 group-hover:opacity-60 hover:bg-muted hover:!opacity-100'
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

        {/* New tab button */}
        {onNewTab && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onNewTab}
                className="ml-1 mb-0.5 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Open new tool"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Open tool (⌘K)
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}
