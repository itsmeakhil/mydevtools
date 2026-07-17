'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/database/firebase'

export interface AppUser {
  name: string
  email: string
  avatar: string
}

/** Live Firebase profile (empty strings when signed out). */
export function useAppUser(): AppUser {
  const [user, setUser] = useState<AppUser>({ name: '', email: '', avatar: '' })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(
        u
          ? { name: u.displayName || '', email: u.email || '', avatar: u.photoURL || '' }
          : { name: '', email: '', avatar: '' },
      )
    })
    return () => unsubscribe()
  }, [])

  return user
}
