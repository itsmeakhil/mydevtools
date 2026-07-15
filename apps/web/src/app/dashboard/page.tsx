'use client'

import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { PlanCard } from '@/components/plan-card'
import { PasskeysManager } from '@/components/passkeys-manager'
import { useAccountProfile } from '@/lib/use-account-profile'

export default function DashboardPage() {
  const t = useTranslations('Dashboard')
  const { profile } = useAccountProfile('/dashboard')

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
