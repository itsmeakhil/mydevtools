'use client'

import * as React from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ToolMobileTabsProps<T extends string> {
  value: T
  onValueChange: (value: T) => void
  tabs: { value: T; label: string }[]
  className?: string
}

/**
 * Shared mobile input/output switcher for tool pages — replaces each tool's
 * hand-rolled pill-button toggle (`bg-muted/40 p-1` div) with the shadcn Tabs
 * primitive the rest of the app already uses (e.g. dashboard's Apps/Analytics
 * switch, markdown-preview-html's format switch).
 */
export function ToolMobileTabs<T extends string>({
  value,
  onValueChange,
  tabs,
  className,
}: ToolMobileTabsProps<T>) {
  return (
    <Tabs value={value} onValueChange={(v) => onValueChange(v as T)} className={className}>
      <TabsList className="w-full">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="flex-1">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
