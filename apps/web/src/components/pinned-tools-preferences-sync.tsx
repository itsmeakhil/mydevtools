"use client"

import { useEffect, useRef } from "react"
import useAuth from "@/utils/useAuth"
import { usePinnedToolsStore } from "@/store/pinned-tools-store"
import { useWorkspaceStore } from "@/store/workspace-store"
import { getUserPreferences, patchUserPreferences } from "@/lib/user-preferences-api"
import { normalizePinnedToolsList } from "@/lib/pinned-tools-path"

// Marks (per uid) that the retired enable/disable list has been folded into
// pins. Cleared naturally when localStorage is wiped; safe to re-run if so.
const ENABLED_TO_PINS_FLAG = "enabled-to-pins-migrated:"

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

        // Resolve the starting per-workspace pin map from the server doc,
        // preferring the keyed shape and falling back to legacy flat favorites.
        let resolved: Record<string, string[]> = {}
        if (data.pinnedToolsByWorkspace && Object.keys(data.pinnedToolsByWorkspace).length > 0) {
          resolved = { ...data.pinnedToolsByWorkspace }
        } else if (Array.isArray(data.toolFavorites) && data.toolFavorites.length > 0 && activeWorkspaceId) {
          resolved = { [activeWorkspaceId]: data.toolFavorites }
        }

        // One-time migration: the enable/disable feature is gone, so fold each
        // user's retired `enabledTools` list into their active-workspace pins.
        // Union (not replace) so any tools they'd already pinned are preserved
        // and nobody's sidebar loses entries in the switchover.
        const migFlag = ENABLED_TO_PINS_FLAG + user.uid
        const alreadyMigrated =
          typeof window !== "undefined" && window.localStorage.getItem(migFlag) === "1"
        const enabled = Array.isArray(data.enabledTools) ? data.enabledTools : []
        let didMigrate = false
        if (!alreadyMigrated && activeWorkspaceId && enabled.length > 0) {
          const existingActive = resolved[activeWorkspaceId] ?? []
          const merged = normalizePinnedToolsList([...existingActive, ...enabled])
          if (merged.length !== existingActive.length) {
            resolved = { ...resolved, [activeWorkspaceId]: merged }
            didMigrate = true
          }
        }

        // Hydrate the store from the resolved map.
        for (const [wsId, tools] of Object.entries(resolved)) {
          if (Array.isArray(tools)) setPinnedTools(wsId, tools)
        }
        lastSavedRef.current = JSON.stringify(resolved)

        // Record that migration ran (once per uid) and persist the folded-in
        // pins so the server reflects them on the next device.
        if (!alreadyMigrated && typeof window !== "undefined") {
          window.localStorage.setItem(migFlag, "1")
          if (didMigrate) {
            try {
              await patchUserPreferences({ pinnedToolsByWorkspace: resolved })
            } catch {
              // Non-blocking: the save effect will retry on the next change.
            }
          }
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
