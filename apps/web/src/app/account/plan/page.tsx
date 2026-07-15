'use client'

import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { PlanCard } from '@/components/plan-card'
import { useAccountProfile } from '@/lib/use-account-profile'

export default function AccountPlanPage() {
  const t = useTranslations('AccountPlan')
  const { profile } = useAccountProfile('/account/plan')

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight mb-1">{t('title')}</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {profile.display_name || profile.email}
      </p>
      <PlanCard profile={profile} />
    </div>
  )
}
