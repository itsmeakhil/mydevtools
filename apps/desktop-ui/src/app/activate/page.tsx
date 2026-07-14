'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { BadgeCheck, Calendar, Crown, Globe, Loader2, PartyPopper, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { completeActivation, getActivation, type ActivationRecord } from '@/lib/desktop/activation'

/** Signup within this window of activation counts as a brand-new subscription. */
const FRESH_SIGNUP_WINDOW_MS = 10 * 60 * 1000

type Phase = 'idle' | 'waiting' | 'finishing' | 'done' | 'error'

export default function ActivatePage() {
  const t = useTranslations('Activate')
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')
  const [record, setRecord] = useState<ActivationRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const finishing = useRef(false)

  // Already activated (back-navigation etc.) → straight to the app.
  useEffect(() => {
    void getActivation().then((r) => {
      if (r) router.replace('/dashboard')
    }).catch(() => {})
  }, [router])

  const finish = useCallback(async () => {
    if (finishing.current) return
    finishing.current = true
    setPhase('finishing')
    try {
      setRecord(await completeActivation())
      setPhase('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setPhase('error')
    } finally {
      finishing.current = false
    }
  }, [])

  // Deep-link sign-in path (mydevtools://auth) completes outside this page's
  // startCloudSignIn call — listen for it and finish the activation here.
  useEffect(() => {
    const onAuthed = () => void finish()
    window.addEventListener('mydevtools:desktop-authed', onAuthed)
    return () => window.removeEventListener('mydevtools:desktop-authed', onAuthed)
  }, [finish])

  const signIn = async () => {
    setError(null)
    setPhase('waiting')
    try {
      const { startCloudSignIn } = await import('@/lib/desktop/cloud-signin')
      await startCloudSignIn()
      await finish()
    } catch (e) {
      if (finishing.current || phase === 'done') return
      setError(e instanceof Error ? e.message : String(e))
      setPhase('error')
    }
  }

  if (phase === 'done' && record) {
    const isPro = record.plan === 'pro'
    const isEarlyAdopter = record.plan_source === 'early_adopter'
    const freshSignup =
      record.created_at != null &&
      record.activated_at != null &&
      record.activated_at - record.created_at < FRESH_SIGNUP_WINDOW_MS
    const grantedAt = record.plan_granted_at
      ? new Date(record.plan_granted_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
      : null

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              {freshSignup && isPro
                ? <PartyPopper className="h-6 w-6 text-green-600 dark:text-green-400" />
                : <BadgeCheck className="h-6 w-6 text-green-600 dark:text-green-400" />}
            </div>
            <CardTitle>
              {freshSignup && isPro ? t('subscriptionCreated') : t('authSuccess')}
            </CardTitle>
            <CardDescription>
              {record.display_name || record.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="flex items-center gap-2 font-medium">
                <Crown className="h-4 w-4 text-primary" />
                {t('plan')}
              </span>
              {isPro ? (
                <Badge className="bg-primary/15 text-primary hover:bg-primary/15 border-primary/20">
                  {isEarlyAdopter ? t('earlyAdopter') : 'Pro'}
                </Badge>
              ) : (
                <Badge variant="secondary">Free</Badge>
              )}
            </div>
            {isPro && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                {t('lifetimeNote')}
              </div>
            )}
            {grantedAt && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {t('grantedOn')}: {grantedAt}
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Globe className="h-4 w-4" />
              {t('offlineNote')}
            </div>
            <Button className="w-full mt-2" onClick={() => router.replace('/dashboard')}>
              {t('start')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full"
            disabled={phase === 'waiting' || phase === 'finishing'}
            onClick={() => void signIn()}
          >
            {phase === 'waiting' || phase === 'finishing' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {phase === 'waiting' ? t('waitingForBrowser') : t('finishing')}
              </>
            ) : (
              t('signInWithBrowser')
            )}
          </Button>
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <p className="text-xs text-muted-foreground text-center">{t('privacyNote')}</p>
        </CardContent>
      </Card>
    </div>
  )
}
