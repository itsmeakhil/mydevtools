import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useWorkspaceStore } from '@/store/workspace-store'
import {
  normalizePinnedToolPath,
  normalizePinnedToolsList,
} from '@/lib/pinned-tools-path'

interface PinnedToolsStore {
  pinnedByWorkspace: Record<string, string[]>
  setPinnedTools: (workspaceId: string, tools: string[]) => void
  togglePin: (workspaceId: string, toolUrl: string) => void
}

export const usePinnedToolsStore = create<PinnedToolsStore>()(
  persist(
    (set) => ({
      pinnedByWorkspace: {},
      setPinnedTools: (workspaceId, tools) =>
        set((state) => ({
          pinnedByWorkspace: {
            ...state.pinnedByWorkspace,
            [workspaceId]: normalizePinnedToolsList(tools),
          },
        })),
      togglePin: (workspaceId, toolUrl) =>
        set((state) => {
          const current = normalizePinnedToolsList(
            state.pinnedByWorkspace[workspaceId] ?? []
          )
          const key = normalizePinnedToolPath(toolUrl)
          const has = current.includes(key)
          return {
            pinnedByWorkspace: {
              ...state.pinnedByWorkspace,
              [workspaceId]: has
                ? current.filter((u) => u !== key)
                : [...current, key],
            },
          }
        }),
    }),
    {
      name: 'pinned-tools-storage',
      version: 2,
      // ponytail: v1→v2 migration drops all local pins intentionally.
      // The server is the source of truth (toolFavorites in user preferences).
      // T24 (pinned-tools-preferences-sync rewrite) will repopulate
      // pinnedByWorkspace[activeWorkspaceId] from the API on next login.
      // Drop this migrate shim once all sessions have migrated (i.e. after
      // the v1 persist key has aged out of localStorage).
      migrate: (persistedState, fromVersion) => {
        if (fromVersion < 2) {
          // Upgrade path: discard legacy flat pinnedTools array.
          // Server backfill via T24 is the source of truth.
          return { pinnedByWorkspace: {} } as never
        }
        const p = (persistedState ?? {}) as { pinnedByWorkspace?: Record<string, string[]> }
        return {
          pinnedByWorkspace: p.pinnedByWorkspace ?? {},
        } as never
      },
      // merge also resets to empty on any version mismatch (version field
      // missing = legacy entry). Correct state arrives via preferences-sync.
      merge: (_persistedState, currentState) => {
        return { ...currentState, pinnedByWorkspace: {} }
      },
    }
  )
)

/** Returns true once the persisted state has finished rehydrating from storage. */
export function usePinnedToolsHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => usePinnedToolsStore.persist.hasHydrated())
  useEffect(() => {
    if (usePinnedToolsStore.persist.hasHydrated()) {
      setHydrated(true)
      return
    }
    const unsub = usePinnedToolsStore.persist.onFinishHydration(() => setHydrated(true))
    return unsub
  }, [])
  return hydrated
}

/**
 * Returns the pinned tool URLs for the currently active workspace.
 * Subscribes to both the workspace store (for activeWorkspaceId changes)
 * and the pinned-tools store (for pinnedByWorkspace changes) so the
 * consuming component re-renders on either change.
 */
// Stable empty-array reference returned when no active workspace or no pins
// for that workspace. Returning a fresh `[]` from a zustand selector breaks
// useSyncExternalStore's snapshot-cache invariant → infinite render loop.
const EMPTY_PINS: string[] = []

export function usePinnedToolsForActiveWorkspace(): string[] {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  return usePinnedToolsStore(
    (s) =>
      (activeWorkspaceId
        ? s.pinnedByWorkspace[activeWorkspaceId] ?? EMPTY_PINS
        : EMPTY_PINS)
  )
}
