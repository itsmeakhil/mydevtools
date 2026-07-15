'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { backendFetch } from '@/lib/backend-auth'
import { PlanCard, type PlanProfile } from '@/components/plan-card'

export default function AccountPlanPage() {
  const t = useTranslations('AccountPlan')
  const router = useRouter()
  const [profile, setProfile] = useState<PlanProfile | null>(null)

  useEffect(() => {
    let cancelled = false
    backendFetch('/api/backend/auth/me')
      .then(async (res) => {
        if (cancelled) return
        if (!res.ok) {
          router.replace('/login?next=/account/plan')
          return
        }
        setProfile(await res.json())
      })
      .catch(() => {
        if (!cancelled) router.replace('/login?next=/account/plan')
      })
    return () => { cancelled = true }
  }, [router])

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
