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
 * Fold pins that live under workspace ids which no longer exist (e.g. workspaces
 * removed during the org teardown) into the active workspace, so a user's pins
 * never disappear just because the id they were saved under is gone. Pins under
 * still-valid workspaces are left where they are. Returns the original map
 * untouched when there is nothing to rescue.
 */
function rescueOrphanedPins(
  map: Record<string, string[]>,
  activeId: string,
  validIds: Set<string>,
): Record<string, string[]> {
  if (!activeId || validIds.size === 0) return map
  const kept: Record<string, string[]> = {}
  const orphaned: string[] = []
  for (const [wsId, tools] of Object.entries(map)) {
    if (wsId === activeId || validIds.has(wsId)) kept[wsId] = tools ?? []
    else orphaned.push(...(tools ?? []))
  }
  if (orphaned.length === 0) return map
  kept[activeId] = normalizePinnedToolsList([...(kept[activeId] ?? []), ...orphaned])
  return kept
}

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

        // Read the freshest workspace state (the closure value can be stale, and
        // the active id may resolve after this effect first fires).
        const wsState = useWorkspaceStore.getState()
        const activeId = wsState.activeWorkspaceId ?? ""
        const validIds = new Set(wsState.workspaces.map((w) => w.id))

        // Resolve the starting per-workspace pin map from the server doc,
        // preferring the keyed shape and falling back to legacy flat favorites.
        const serverMap: Record<string, string[]> =
          data.pinnedToolsByWorkspace && Object.keys(data.pinnedToolsByWorkspace).length > 0
            ? { ...data.pinnedToolsByWorkspace }
            : Array.isArray(data.toolFavorites) && data.toolFavorites.length > 0 && activeId
              ? { [activeId]: data.toolFavorites }
              : {}
        let resolved = serverMap

        // One-time migration: the enable/disable feature is gone, so fold each
        // user's retired `enabledTools` list into their active-workspace pins.
        // Union (not replace) so any tools they'd already pinned are preserved
        // and nobody's sidebar loses entries in the switchover.
        const migFlag = ENABLED_TO_PINS_FLAG + user.uid
        const alreadyMigrated =
          typeof window !== "undefined" && window.localStorage.getItem(migFlag) === "1"
        const enabled = Array.isArray(data.enabledTools) ? data.enabledTools : []
        if (!alreadyMigrated && activeId && enabled.length > 0) {
          const existingActive = resolved[activeId] ?? []
          resolved = {
            ...resolved,
            [activeId]: normalizePinnedToolsList([...existingActive, ...enabled]),
          }
        }

        // Rescue pins stranded under workspace ids that no longer exist so they
        // survive logout/login and the org teardown.
        resolved = rescueOrphanedPins(resolved, activeId, validIds)

        // Replace the store wholesale with server truth (not a per-key merge) so
        // a different user logging in on this browser can never inherit the
        // previous user's in-memory pins.
        usePinnedToolsStore.setState({ pinnedByWorkspace: resolved })
        lastSavedRef.current = JSON.stringify(resolved)

        // Persist back if migration or the orphan rescue changed the map, and
        // record (once per uid, only once we had an active workspace to migrate
        // into) that the enable→pins migration has run.
        if (JSON.stringify(resolved) !== JSON.stringify(data.pinnedToolsByWorkspace ?? {})) {
          try {
            await patchUserPreferences({ pinnedToolsByWorkspace: resolved })
          } catch {
            // Non-blocking: the save effect will retry on the next change.
          }
        }
        if (!alreadyMigrated && activeId && typeof window !== "undefined") {
          window.localStorage.setItem(migFlag, "1")
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
    // Re-run when the active workspace resolves/changes too: the orphan rescue
    // and enable→pins migration both need a resolved active workspace id.
  }, [user?.uid, authLoading, activeWorkspaceId])

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
