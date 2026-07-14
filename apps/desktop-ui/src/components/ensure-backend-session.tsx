"use client"

import { useEffect, useState } from "react"
import type { User } from "firebase/auth"
import { ensureBackendSession } from "@/lib/backend-auth"
import { AppLoadingScreen } from "@/components/app-loading-screen"
import { useWorkspaceStore } from "@/store/workspace-store"

type Props = {
    user: User | null
    children: React.ReactNode
}

// Module-level cache: tracks which uid already has a valid backend session this page session.
// Cleared when the user changes (logout), preventing stale entries.
let confirmedSessionUid: string | null = null

/**
 * When Firebase has a user, ensures HttpOnly JWT cookies exist (new login or expired cookies).
 * Caches the result per-uid so client-side re-navigation between routes never re-shows
 * the full-screen spinner for an already-confirmed session.
 */
export function EnsureBackendSession({ user, children }: Props) {
    const alreadyConfirmed = !!user && user.uid === confirmedSessionUid
    const [ready, setReady] = useState(!user || alreadyConfirmed)

    useEffect(() => {
        if (!user) {
            confirmedSessionUid = null
            setReady(true)
            return
        }
        if (user.uid === confirmedSessionUid) {
            setReady(true)
            return
        }
        setReady(false)
        let cancelled = false
        ;(async () => {
            try {
                await ensureBackendSession(user)
                confirmedSessionUid = user.uid
                // Hydrate workspace store once per auth session, non-blocking
                useWorkspaceStore.getState().loadFromBackend().catch((e) => {
                    console.warn("Workspace hydration failed:", e)
                })
            } catch (e) {
                console.error("Backend session sync failed:", e)
            } finally {
                if (!cancelled) setReady(true)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [user])

    if (user && !ready) {
        return <AppLoadingScreen label="Securing your session" />
    }

    return <>{children}</>
}
