"use client"

import { useEffect, useState } from "react"
import type { User } from "firebase/auth"
import { Loader2 } from "lucide-react"
import { ensureBackendSession } from "@/lib/backend-auth"

type Props = {
    user: User | null
    children: React.ReactNode
}

/**
 * When Firebase has a user, ensures HttpOnly JWT cookies exist (new login or expired cookies).
 */
export function EnsureBackendSession({ user, children }: Props) {
    const [ready, setReady] = useState(!user)

    useEffect(() => {
        if (!user) {
            setReady(true)
            return
        }
        setReady(false)
        let cancelled = false
        ;(async () => {
            try {
                await ensureBackendSession(user)
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
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
                <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
        )
    }

    return <>{children}</>
}
