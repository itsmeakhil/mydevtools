"use client"

import { useEffect } from "react"
import { useMasterKeyStore } from "@/store/master-key-store"

export const IDLE_TIMEOUT_KEY = "vaultIdleTimeoutMin"
export const DEFAULT_IDLE_MINUTES = 15

// Reads the configured idle timeout in minutes. `0` (or invalid) = disabled.
export function getIdleTimeoutMinutes(): number {
    if (typeof window === "undefined") return DEFAULT_IDLE_MINUTES
    const raw = window.localStorage.getItem(IDLE_TIMEOUT_KEY)
    if (raw == null) return DEFAULT_IDLE_MINUTES
    const n = Number(raw)
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_IDLE_MINUTES
}

// Auto-locks the vault after a period of inactivity by clearing the in-memory
// master key. No-op while the vault isn't unlocked, or when the timeout is 0.
export function useIdleLock() {
    const vaultStatus = useMasterKeyStore((s) => s.vaultStatus)
    const lock = useMasterKeyStore((s) => s.lock)

    useEffect(() => {
        if (vaultStatus !== "unlocked") return

        let timer: number | undefined

        const arm = () => {
            if (timer !== undefined) window.clearTimeout(timer)
            const minutes = getIdleTimeoutMinutes()
            if (minutes <= 0) return // disabled
            timer = window.setTimeout(() => lock(), minutes * 60_000)
        }

        const onActivity = () => arm()
        const onVisibility = () => {
            if (document.visibilityState === "visible") arm()
        }

        arm()
        window.addEventListener("pointerdown", onActivity, { passive: true })
        window.addEventListener("keydown", onActivity)
        document.addEventListener("visibilitychange", onVisibility)

        return () => {
            if (timer !== undefined) window.clearTimeout(timer)
            window.removeEventListener("pointerdown", onActivity)
            window.removeEventListener("keydown", onActivity)
            document.removeEventListener("visibilitychange", onVisibility)
        }
    }, [vaultStatus, lock])
}
