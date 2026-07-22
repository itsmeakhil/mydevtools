'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ExternalLink, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { isDesktop } from '@/lib/desktop/is-desktop'
import type { ActivationRecord } from '@/lib/desktop/activation'
import { DesktopUpdateDialog } from './desktop-update-dialog'

/** Settings card: locally-stored account summary + link to the web dashboard. */
export function DesktopPlanSettings() {
  const t = useTranslations('AccountCard')
  const [record, setRecord] = useState<ActivationRecord | null>(null)

  useEffect(() => {
    if (!isDesktop()) return
    void import('@/lib/desktop/activation').then(({ getActivation }) =>
      getActivation().then(setRecord).catch(() => {})
    )
  }, [])

  if (!isDesktop() || !record) return null

  const openAccountPage = async () => {
    const [{ openUrl }, { desktopWebBase }] = await Promise.all([
      import('@tauri-apps/plugin-opener'),
      import('@/lib/desktop/remote'),
    ])
    await openUrl(`${desktopWebBase()}/dashboard`)
  }

  return (
    <Card className="rounded-2xl border border-border/60 bg-card/60 shadow-sm backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-violet-500/10 text-primary ring-1 ring-inset ring-border/50">
            <UserRound className="h-4 w-4" />
          </span>
          {t('title')}
        </CardTitle>
        <CardDescription>
          {record.display_name || record.email}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <Button variant="outline" size="sm" onClick={() => void openAccountPage()}>
          <ExternalLink className="mr-2 h-4 w-4" />
          {t('manage')}
        </Button>
        <DesktopUpdateDialog />
      </CardContent>
    </Card>
  )
}
