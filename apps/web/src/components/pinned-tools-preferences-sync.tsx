"use client"

import { useEffect, useRef } from "react"
import useAuth from "@/utils/useAuth"
import { usePinnedToolsStore } from "@/store/pinned-tools-store"
import { useWorkspaceStore } from "@/store/workspace-store"
import { getUserPreferences, patchUserPreferences } from "@/lib/user-preferences-api"

/**
 * Invisible component that syncs the workspace-keyed pinned-tools map
 * (pinnedByWorkspace) to/from the backend `user_preferences` document.
 *
 * Read path (mount / uid change):
 *   GET /api/v1/user-preferences
 *   - If `pinnedToolsByWorkspace` is present → hydrate each workspace bucket
 *     via setPinnedTools(workspaceId, tools).
 *   - If only the legacy `toolFavorites` field is present (pre-T24 doc) →
 *     load it into the active workspace's bucket so the user's pins survive
 *     the migration without a hard reset.
 *
 * Write path (pinnedByWorkspace change):
 *   PATCH /api/v1/user-preferences { pinnedToolsByWorkspace: { ...map } }
 *   Debounced: fires at most once per in-flight request cycle.
 *   Frontend no longer sends the legacy `toolFavorites` field.
 */
export function PinnedToolsPreferencesSync() {
  const { user, loading: authLoading } = useAuth(false)
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId) ?? ""
  const pinnedByWorkspace = usePinnedToolsStore((s) => s.pinnedByWorkspace)
  const setPinnedTools = usePinnedToolsStore((s) => s.setPinnedTools)

  const serverSyncedRef = useRef(false)
  const isSavingRef = useRef(false)
  const lastSavedRef = useRef("")

  // Load from API when user logs in (or uid changes)
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

        if (data.pinnedToolsByWorkspace && Object.keys(data.pinnedToolsByWorkspace).length > 0) {
          // New shape: hydrate every workspace bucket from the keyed map.
          for (const [wsId, tools] of Object.entries(data.pinnedToolsByWorkspace)) {
            if (Array.isArray(tools)) {
              setPinnedTools(wsId, tools)
            }
          }
          lastSavedRef.current = JSON.stringify(data.pinnedToolsByWorkspace)
        } else if (Array.isArray(data.toolFavorites) && data.toolFavorites.length > 0) {
          // Legacy fallback: migrate flat toolFavorites into the active workspace bucket.
          // This covers users whose doc predates the T24 backend write path.
          if (activeWorkspaceId) {
            setPinnedTools(activeWorkspaceId, data.toolFavorites)
          }
          // Compute what pinnedByWorkspace would look like so lastSaved matches.
          const migrated = activeWorkspaceId
            ? { [activeWorkspaceId]: data.toolFavorites }
            : {}
          lastSavedRef.current = JSON.stringify(migrated)
        } else {
          lastSavedRef.current = JSON.stringify({})
        }
      } catch {
        // Keep existing store state on error; next mount will retry.
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
    // activeWorkspaceId intentionally omitted: we only want to re-run on
    // auth state changes, not workspace switches (the store already holds
    // the full map for all workspaces after the initial load).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, authLoading])

  // Save to API whenever pinnedByWorkspace changes
  useEffect(() => {
    if (authLoading || !user?.uid || !serverSyncedRef.current || isSavingRef.current) return

    const next = JSON.stringify(pinnedByWorkspace)
    if (next === lastSavedRef.current) return

    const save = async () => {
      isSavingRef.current = true
      try {
        await patchUserPreferences({ pinnedToolsByWorkspace: pinnedByWorkspace })
        lastSavedRef.current = next
      } catch {
        // Silently fail — next change will retry.
      } finally {
        isSavingRef.current = false
      }
    }

    void save()
  }, [pinnedByWorkspace, user?.uid, authLoading])

  return null
}
