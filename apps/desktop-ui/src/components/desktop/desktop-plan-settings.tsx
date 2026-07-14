'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Crown, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { isDesktop } from '@/lib/desktop/is-desktop'
import type { ActivationRecord } from '@/lib/desktop/activation'

/** Settings card: locally-stored plan summary + link to the web plan page. */
export function DesktopPlanSettings() {
  const t = useTranslations('PlanCard')
  const [record, setRecord] = useState<ActivationRecord | null>(null)

  useEffect(() => {
    if (!isDesktop()) return
    void import('@/lib/desktop/activation').then(({ getActivation }) =>
      getActivation().then(setRecord).catch(() => {})
    )
  }, [])

  if (!isDesktop() || !record) return null

  const isPro = record.plan === 'pro'
  const isEarlyAdopter = record.plan_source === 'early_adopter'
  const grantedAt = record.plan_granted_at
    ? new Date(record.plan_granted_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  const openPlanPage = async () => {
    const [{ openUrl }, { desktopWebBase }] = await Promise.all([
      import('@tauri-apps/plugin-opener'),
      import('@/lib/desktop/remote'),
    ])
    await openUrl(`${desktopWebBase()}/account/plan`)
  }

  return (
    <Card className="rounded-2xl border border-border/60 bg-card/60 shadow-sm backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-violet-500/10 text-primary ring-1 ring-inset ring-border/50">
            <Crown className="h-4 w-4" />
          </span>
          {t('title')}
          {isPro ? (
            <Badge className="bg-primary/15 text-primary hover:bg-primary/15 border-primary/20">
              {isEarlyAdopter ? t('earlyAdopter') : 'Pro'}
            </Badge>
          ) : (
            <Badge variant="secondary">Free</Badge>
          )}
        </CardTitle>
        <CardDescription>
          {isPro ? t('lifetimeDescription') : t('freeDescription')}
          {grantedAt ? ` · ${t('grantedOn')} ${grantedAt}` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" size="sm" onClick={() => void openPlanPage()}>
          <ExternalLink className="mr-2 h-4 w-4" />
          {t('manage')}
        </Button>
      </CardContent>
    </Card>
  )
}
