"use client"

import { useEffect, useState } from "react"
import { backendFetch } from "@/lib/backend-auth"

const POLL_INTERVAL_MS = 2000
const MAX_ELAPSED_MS = 60_000

export function MigrationBanner() {
  const [status, setStatus] = useState<"pending" | "done" | null>(null)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const startedAt = Date.now()

    async function tick() {
      try {
        const res = await backendFetch("/api/backend/auth/me")
        if (!res.ok) return
        const me = await res.json()
        if (cancelled) return

        // Already migrated — no banner needed
        if (me.migrated_at || me.migrated_fast === true) {
          setStatus("done")
          return
        }

        if (me.migration_status === "pending") {
          setStatus("pending")
          const elapsed = Date.now() - startedAt
          if (elapsed >= MAX_ELAPSED_MS) {
            // Give up silently after 60s; hide the banner
            setStatus("done")
            return
          }
          timer = setTimeout(tick, POLL_INTERVAL_MS)
        } else {
          setStatus("done")
        }
      } catch {
        // Network error — retry if we haven't timed out
        if (cancelled) return
        const elapsed = Date.now() - startedAt
        if (elapsed < MAX_ELAPSED_MS) {
          timer = setTimeout(tick, POLL_INTERVAL_MS)
        }
      }
    }

    tick()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [])

  if (status !== "pending") return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full bg-primary/10 border-b border-primary/20 px-4 py-2 text-xs text-foreground/80"
    >
      Setting up your workspace…
    </div>
  )
}
