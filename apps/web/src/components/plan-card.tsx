'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { BadgeCheck, Calendar, Crown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export type PlanProfile = {
  email: string | null
  display_name: string | null
  plan: string
  plan_source: string | null
  plan_granted_at: number | null
  created_at: number | null
}

export function PlanCard({ profile }: { profile: PlanProfile }) {
  const t = useTranslations('AccountPlan')

  const isPro = profile.plan === 'pro'
  const isEarlyAdopter = profile.plan_source === 'early_adopter'
  const grantedAt = profile.plan_granted_at
    ? new Date(profile.plan_granted_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null
  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-primary" />
          {isPro ? 'Pro' : 'Free'}
          {isPro ? (
            <Badge className="bg-primary/15 text-primary hover:bg-primary/15 border-primary/20">
              {isEarlyAdopter ? t('earlyAdopter') : 'Pro'}
            </Badge>
          ) : (
            <Badge variant="secondary">Free</Badge>
          )}
        </CardTitle>
        <CardDescription>
          {isPro
            ? isEarlyAdopter ? t('lifetimeDescription') : t('proDescription')
            : t('freeDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {isPro && (
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span>{t('expiry')}: <strong>{t('neverExpires')}</strong></span>
          </div>
        )}
        {grantedAt && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{t('grantedOn')}: {grantedAt}</span>
          </div>
        )}
        {memberSince && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{t('memberSince')}: {memberSince}</span>
          </div>
        )}
        {!isPro && (
          <Button asChild className="mt-2">
            <Link href="/pricing">{t('viewPlans')}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
