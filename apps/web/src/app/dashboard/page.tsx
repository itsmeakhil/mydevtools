'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { backendFetch } from '@/lib/backend-auth'
import { PlanCard, type PlanProfile } from '@/components/plan-card'
import { PasskeysManager } from '@/components/passkeys-manager'

export default function DashboardPage() {
  const t = useTranslations('Dashboard')
  const router = useRouter()
  const [profile, setProfile] = useState<PlanProfile | null>(null)

  useEffect(() => {
    let cancelled = false
    backendFetch('/api/backend/auth/me')
      .then(async (res) => {
        if (cancelled) return
        if (!res.ok) {
          router.replace('/login?next=/dashboard')
          return
        }
        setProfile(await res.json())
      })
      .catch(() => {
        if (!cancelled) router.replace('/login?next=/dashboard')
      })
    return () => { cancelled = true }
  }, [router])

  return (
    <>
      <Header />
      <main className="min-h-[70vh] pt-24">
        <div className="mx-auto w-full max-w-2xl px-4 py-8">
          {!profile ? (
            <div className="flex min-h-[50vh] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight mb-1">{t('title')}</h1>
              <p className="text-sm text-muted-foreground mb-6">
                {profile.display_name || profile.email}
              </p>
              <div className="space-y-6">
                <PlanCard profile={profile} />
                <PasskeysManager />
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
