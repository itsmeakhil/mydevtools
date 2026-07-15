'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import useAuth from '@/utils/useAuth'
import { backendFetch, ensureBackendSession } from '@/lib/backend-auth'
import type { PlanProfile } from '@/components/plan-card'

/**
 * Loads the signed-in user's account profile for authed pages (dashboard, plan).
 *
 * Right after OAuth sign-in, LoginRedirectIfAuthed navigates here on the
 * `onAuthStateChanged` event — which can fire *before* login-form's
 * `establishBackendSession` has set the API cookie. Calling `ensureBackendSession`
 * first mints/verifies that cookie from the Firebase user, so `/auth/me` doesn't
 * 401 → forceLogout → bounce the user straight back to /login.
 */
export function useAccountProfile(nextPath: string): { profile: PlanProfile | null } {
  const { user, loading } = useAuth(false)
  const router = useRouter()
  const [profile, setProfile] = useState<PlanProfile | null>(null)

  useEffect(() => {
    if (loading) return
    const toLogin = () => router.replace(`/login?next=${encodeURIComponent(nextPath)}`)
    if (!user) {
      toLogin()
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        await ensureBackendSession(user)
        const res = await backendFetch('/api/backend/auth/me')
        if (cancelled) return
        if (!res.ok) {
          toLogin()
          return
        }
        setProfile(await res.json())
      } catch {
        if (!cancelled) toLogin()
      }
    })()
    return () => { cancelled = true }
  }, [user, loading, router, nextPath])

  return { profile }
}
