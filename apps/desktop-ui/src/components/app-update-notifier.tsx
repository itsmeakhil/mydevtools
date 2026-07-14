'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { X, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const DISMISS_KEY = 'app-update-dismissed-build'
const POLL_MS = 5 * 60 * 1000

export function AppUpdateNotifier() {
  const [visible, setVisible] = useState(false)
  const clientBuildIdRef = useRef<string | null>(null)
  const remoteBuildIdRef = useRef<string | null>(null)

  const checkVersion = useCallback(async () => {
    const clientId = clientBuildIdRef.current
    if (!clientId || clientId === 'development' || clientId === 'local') {
      return
    }

    try {
      const res = await fetch('/api/app-version', {
        cache: 'no-store',
        credentials: 'same-origin',
      })
      if (!res.ok) return
      const data = (await res.json()) as { buildId?: string }
      const remoteId = typeof data.buildId === 'string' ? data.buildId : null
      if (!remoteId || remoteId === 'unknown') return

      remoteBuildIdRef.current = remoteId
      if (remoteId === clientId) {
        setVisible(false)
        return
      }

      try {
        const dismissed = sessionStorage.getItem(DISMISS_KEY)
        if (dismissed === remoteId) return
      } catch {
        /* private mode */
      }

      setVisible(true)
    } catch {
      /* offline or blocked */
    }
  }, [])

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_APP_BUILD_ID ?? 'unknown'
    if (clientId === 'development' || clientId === 'local') {
      return
    }

    clientBuildIdRef.current = clientId
    void checkVersion()

    const interval = window.setInterval(() => void checkVersion(), POLL_MS)

    const onVisible = () => {
      if (document.visibilityState === 'visible') void checkVersion()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [checkVersion])

  const handleDismiss = () => {
    const remote = remoteBuildIdRef.current
    if (remote) {
      try {
        sessionStorage.setItem(DISMISS_KEY, remote)
      } catch {
        /* ignore */
      }
    }
    setVisible(false)
  }

  const handleReload = () => {
    window.location.reload()
  }

  if (!visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed z-[60] pointer-events-none',
        'left-3 right-3',
        'bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:bottom-6 md:left-6 md:right-6 md:mx-auto md:max-w-lg'
      )}
    >
      <div
        className={cn(
          'pointer-events-auto flex flex-col gap-3 rounded-xl border border-border/80 bg-popover/95 p-4 shadow-xl backdrop-blur-md',
          'animate-in slide-in-from-bottom-3 fade-in duration-300'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-foreground">New version available</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Reload the page to get the latest fixes and features. You can dismiss this if you want to
              finish what you are doing first.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-lg"
            onClick={handleDismiss}
            aria-label="Dismiss update notice"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" className="gap-2" onClick={handleReload}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Reload
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleDismiss}>
            Later
          </Button>
        </div>
      </div>
    </div>
  )
}
