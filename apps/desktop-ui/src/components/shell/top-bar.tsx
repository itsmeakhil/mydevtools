'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AccountMenu } from '@/components/shell/account-menu'
import { isDesktop } from '@/lib/desktop/is-desktop'
import { cn } from '@/lib/utils'

/**
 * Unified top bar above the app sidebar: brand → dashboard on the left; the
 * account menu lives in the sidebar footer (here only on narrow windows).
 * ⌘K stays a shortcut. The wide middle is a drag region —
 * `data-tauri-drag-region` makes it draggable once the OS title bar is turned
 * off (traffic lights inset).
 */
export function TopBar() {
  const router = useRouter()

  // macOS traffic lights are inset into this bar (titleBarStyle: Overlay), so
  // reserve room for them on the left — but ONLY on macOS. titleBarStyle and
  // trafficLightPosition are macOS-only options; Linux and Windows keep their
  // native title bar, so the same inset there is just an empty 92px gap.
  // Mounted-guarded to avoid an SSR hydration mismatch (isDesktop() is false on
  // the server).
  const [isMacDesktop, setIsMacDesktop] = useState(false)
  useEffect(() => {
    setIsMacDesktop(isDesktop() && /Mac/i.test(navigator.userAgent))
  }, [])

  // macOS hides the traffic lights in fullscreen, so the left inset that
  // reserves room for them is only needed when the window is NOT fullscreen.
  const [isFullscreen, setIsFullscreen] = useState(false)
  useEffect(() => {
    if (!isDesktop()) return
    let cancelled = false
    let unlisten: (() => void) | undefined
    void (async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      const win = getCurrentWindow()
      const sync = () =>
        win
          .isFullscreen()
          .then((v) => {
            if (!cancelled) setIsFullscreen(v)
          })
          .catch(() => {})
      sync()
      unlisten = await win.onResized(sync)
    })()
    return () => {
      cancelled = true
      unlisten?.()
    }
  }, [])

  // px-4 everywhere, except the macOS traffic-light inset when windowed.
  const headerPadLeft = isMacDesktop && !isFullscreen ? 92 : 16

  return (
    <header
      data-tauri-drag-region
      className={cn(
        'flex h-14 w-full shrink-0 items-center gap-3 border-b border-border bg-[hsl(var(--surface-2))]',
        !isMacDesktop ? 'px-4' : 'pr-6',
      )}
      style={isMacDesktop ? { paddingLeft: headerPadLeft } : undefined}
    >
      {/* Brand → dashboard. Text wordmark in Courier Prime, no logo mark. */}
      <button
        onClick={() => router.push('/dashboard')}
        className="flex shrink-0 items-center rounded-md px-1.5 py-1.5 transition-colors hover:bg-foreground/[0.06]"
        aria-label="Go to dashboard"
      >
        <span
          className="text-[15px] font-bold leading-none tracking-wide"
          style={{ fontFamily: 'var(--font-courier-prime), ui-monospace, monospace' }}
        >
          mydevtools<span className="text-primary">.tech</span>
        </span>
      </button>

      {/* Draggable spacer — the breathing room in the middle */}
      <div data-tauri-drag-region className="h-full flex-1" />

      {/* Account menu lives in the sidebar footer; the sidebar is hidden below
          md, so the avatar shows here only on narrow windows. */}
      <div className="flex shrink-0 items-center md:hidden">
        <AccountMenu variant="header" />
      </div>
    </header>
  )
}
