"use client"

import { useEffect, useState } from "react"
import { initPasswordStrength } from "@/lib/password-utils"

/**
 * Loads the strength dictionaries and re-renders once they are in.
 *
 * Scoring is synchronous by necessity (it runs inside render and inside
 * `useMemo`), so before the dictionaries land every score comes from the
 * pessimistic fallback. Thread the returned flag into the dependency array of
 * anything that memoises a score, or the list keeps showing fallback numbers
 * for the rest of the session.
 */
export function usePasswordStrengthReady(): boolean {
    const [ready, setReady] = useState(false)

    useEffect(() => {
        let cancelled = false
        void initPasswordStrength().then(() => {
            if (!cancelled) setReady(true)
        })
        return () => {
            cancelled = true
        }
    }, [])

    return ready
}
