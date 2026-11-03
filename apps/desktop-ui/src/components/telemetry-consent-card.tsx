'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getConsent, setConsent, initTelemetry } from '@/lib/telemetry'
import { getUserPreferences } from '@/lib/user-preferences-api'

/**
 * Asks once, on a run after the first-run walkthrough is done, and never again
 * — the answer is remembered either way, and Settings owns it from then on.
 */
export function TelemetryConsentCard() {
  const t = useTranslations('Telemetry')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (getConsent() !== 'unset') return

    let cancelled = false
    void getUserPreferences()
      .then((prefs) => {
        // Waiting on onboarding keeps this from stacking under the walkthrough.
        if (!cancelled && prefs.onboardingCompleted) setVisible(true)
      })
      .catch(() => {
        // Store unavailable — asking later is better than asking over an error.
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!visible) return null

  const answer = (granted: boolean) => {
    setConsent(granted ? 'granted' : 'denied')
    setVisible(false)
    if (granted) void initTelemetry()
  }

  return (
    <div
      role="dialog"
      aria-label={t('consent.title')}
      className={cn(
        'fixed z-[60] pointer-events-none',
        'left-3 right-3',
        'bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:bottom-6 md:right-6 md:left-auto md:max-w-sm'
      )}
    >
      <div
        className={cn(
          'glass pointer-events-auto flex flex-col gap-3 rounded-2xl p-4',
          'animate-in slide-in-from-bottom-2 fade-in duration-200'
        )}
      >
        <div className="flex items-start gap-3">
          <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 space-y-1">
            <p className="text-[13px] font-semibold text-foreground">{t('consent.title')}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{t('consent.body')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" onClick={() => answer(true)}>
            {t('consent.accept')}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => answer(false)}>
            {t('consent.decline')}
          </Button>
        </div>
      </div>
    </div>
  )
}
