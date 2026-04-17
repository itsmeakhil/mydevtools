"use client"

import { useEffect, useRef } from "react"
import useAuth from "@/utils/useAuth"
import { usePinnedToolsStore } from "@/store/pinned-tools-store"
import { getUserPreferences, patchUserPreferences } from "@/lib/user-preferences-api"

export function PinnedToolsPreferencesSync() {
  const { user, loading: authLoading } = useAuth(false)
  const pinnedTools = usePinnedToolsStore((s) => s.pinnedTools)
  const setPinnedTools = usePinnedToolsStore((s) => s.setPinnedTools)
  const serverSyncedRef = useRef(false)
  const isSavingRef = useRef(false)
  const lastSavedRef = useRef("")

  // Load from API when user logs in
  useEffect(() => {
    if (authLoading) return
    let cancelled = false

    const load = async () => {
      if (!user?.uid) {
        serverSyncedRef.current = false
        lastSavedRef.current = ""
        return
      }

      serverSyncedRef.current = false
      try {
        const data = await getUserPreferences()
        if (cancelled) return
        const favorites = Array.isArray(data.toolFavorites) ? data.toolFavorites : []
        lastSavedRef.current = JSON.stringify(favorites)
        setPinnedTools(favorites)
      } catch {
        // keep existing store state on error
      } finally {
        window.setTimeout(() => {
          if (!cancelled) serverSyncedRef.current = true
        }, 0)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [user?.uid, authLoading, setPinnedTools])

  // Save to API whenever pinned tools change
  useEffect(() => {
    if (authLoading || !user?.uid || !serverSyncedRef.current || isSavingRef.current) return

    const next = JSON.stringify(pinnedTools)
    if (next === lastSavedRef.current) return

    const save = async () => {
      isSavingRef.current = true
      try {
        await patchUserPreferences({ toolFavorites: pinnedTools })
        lastSavedRef.current = next
      } catch {
        // silently fail — next change will retry
      } finally {
        isSavingRef.current = false
      }
    }

    void save()
  }, [pinnedTools, user?.uid, authLoading])

  return null
}
