'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { KeyRound, Loader2 } from 'lucide-react'
import { DashboardShell, type DashboardNavItem } from '@/components/dashboard-shell'
import { PasskeysManager } from '@/components/passkeys-manager'
import { useAccountProfile } from '@/lib/use-account-profile'

export default function DashboardPage() {
  const t = useTranslations('Dashboard')
  const { profile } = useAccountProfile('/dashboard')
  const [tab, setTab] = useState('security')

  const items: DashboardNavItem[] = [
    { key: 'security', label: t('navSecurity'), icon: KeyRound },
  ]

  if (!profile) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    )
  }

  const title = t('navSecurity')

  return (
    <DashboardShell
      items={items}
      active={tab}
      onSelect={setTab}
      userLabel={profile.display_name || profile.email}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {profile.display_name || profile.email}
        </p>
      </div>

      <PasskeysManager />
    </DashboardShell>
  )
}
