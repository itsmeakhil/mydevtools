'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Grid2x2Plus } from 'lucide-react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { TopNavStrip, NavIcon } from '@/components/shell/top-nav-strip'
import { SidebarToggle } from '@/components/shell/app-sidebar'
import { useNativeWindowTheme, useSidebarState } from '@/components/shell/use-mac-chrome'
import { cn } from '@/lib/utils'

/**
 * Window toolbar above the content pane: open-tool tabs in a Liquid Glass
 * capsule + a round ⌘K button, floating over the backdrop. The bar itself is a
 * Tauri drag region and always leads with the sidebar toggle, so it sits in
 * the same place expanded or collapsed (the traffic lights stay in the sidebar).
 */
export function TopBar() {
  const t = useTranslations('Shell')
  const toggle = useSidebarState((s) => s.toggle)
  const hydrate = useSidebarState((s) => s.hydrate)

  useEffect(() => hydrate(), [hydrate])
  useNativeWindowTheme()

  // ⌃⌘S — the macOS standard "Show/Hide Sidebar" shortcut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey && e.ctrlKey && e.code === 'KeyS') {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])

  return (
    <header
      data-tauri-drag-region
      className={cn(
        'chrome relative z-30 flex h-10 w-full shrink-0 items-center gap-2 px-2 md:mb-3 md:px-0',
      )}
    >
      {/* Same spot whether the sidebar is expanded or collapsed. */}
      <div className="liquid hidden h-10 w-10 shrink-0 items-center justify-center rounded-full md:flex">
        <SidebarToggle />
      </div>
      <TopNavStrip />
      <div data-tauri-drag-region className="h-full min-w-6 flex-1" />
      <TooltipProvider delayDuration={300}>
        <NavIcon
          label={`${t('openTool')} (⌘K)`}
          icon={Grid2x2Plus}
          onClick={() => document.dispatchEvent(new CustomEvent('open-command-palette'))}
        />
      </TooltipProvider>
    </header>
  )
}
