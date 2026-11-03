'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { create } from 'zustand'
import { isDesktop } from '@/lib/desktop/is-desktop'

/**
 * macOS desktop chrome state. `isMac` is true only in the Tauri macOS build,
 * where the traffic lights are inset into the window (titleBarStyle: Overlay)
 * and need reserved space — unless the window is fullscreen (lights hidden).
 * Mount-guarded: isDesktop() is false during SSR.
 */
export function useMacChrome() {
  const [isMac, setIsMac] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    if (!isDesktop() || !/Mac/i.test(navigator.userAgent)) return
    setIsMac(true)
    let cancelled = false
    let unlisten: (() => void) | undefined
    void (async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      const win = getCurrentWindow()
      const sync = () =>
        win
          .isFullscreen()
          .then((v) => !cancelled && setIsFullscreen(v))
          .catch(() => {})
      sync()
      unlisten = await win.onResized(sync)
    })()
    return () => {
      cancelled = true
      unlisten?.()
    }
  }, [])

  /** Left inset that clears the traffic lights (0 when none are shown). */
  return { isMac, isFullscreen, trafficLightInset: isMac && !isFullscreen ? 88 : 0 }
}

/**
 * Keep the native window appearance in step with the app theme. Native
 * vibrancy (sidebar material) and the traffic lights follow the *window's*
 * appearance, so a light app theme on a dark-mode Mac would otherwise put
 * light-theme text over dark glass. 'system' hands control back to the OS.
 */
export function useNativeWindowTheme() {
  const { theme } = useTheme()
  useEffect(() => {
    if (!isDesktop() || !theme) return
    void import('@tauri-apps/api/window')
      .then(({ getCurrentWindow }) =>
        getCurrentWindow().setTheme(theme === 'light' || theme === 'dark' ? theme : null),
      )
      .catch(() => {})
  }, [theme])
}

const COLLAPSED_KEY = 'shell-sidebar-collapsed'

interface SidebarState {
  collapsed: boolean
  /** Read the persisted value — call from an effect (SSR renders expanded). */
  hydrate: () => void
  toggle: () => void
}

/** Sidebar collapse, persisted per device (a convenience, not app data). */
export const useSidebarState = create<SidebarState>((set, get) => ({
  collapsed: false,
  hydrate: () => {
    try {
      set({ collapsed: localStorage.getItem(COLLAPSED_KEY) === '1' })
    } catch {}
  },
  toggle: () => {
    const collapsed = !get().collapsed
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0')
    } catch {}
    set({ collapsed })
  },
}))
