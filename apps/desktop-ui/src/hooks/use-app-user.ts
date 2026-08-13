'use client'

import { useEffect, useState } from 'react'
import { getUserPreferences } from '@/lib/user-preferences-api'

export interface AppUser {
  name: string
  avatar: string
}

/** Dispatched by the profile form so open surfaces pick up the new name/avatar. */
export const PROFILE_UPDATED_EVENT = 'mydevtools:profile-updated'

const EMPTY: AppUser = { name: '', avatar: '' }

/**
 * Local profile (display name + avatar), stored in user preferences. There is
 * no account behind it — it only decides what the app calls you.
 */
export function useAppUser(): AppUser {
  const [user, setUser] = useState<AppUser>(EMPTY)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const prefs = await getUserPreferences()
        if (!cancelled) {
          setUser({ name: prefs.displayName || '', avatar: prefs.avatar || '' })
        }
      } catch {
        // Store unavailable (vault locked, first launch) — fall back to defaults.
      }
    }
    void load()
    const onUpdate = () => void load()
    window.addEventListener(PROFILE_UPDATED_EVENT, onUpdate)
    return () => {
      cancelled = true
      window.removeEventListener(PROFILE_UPDATED_EVENT, onUpdate)
    }
  }, [])

  return user
}
