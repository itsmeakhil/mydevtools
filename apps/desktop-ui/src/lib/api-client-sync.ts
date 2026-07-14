"use client"

import * as React from "react"

/**
 * Cross-tab sync for API-client data (collections / environments / history).
 * Backed by BroadcastChannel; falls back to a no-op when unavailable (SSR, old browsers).
 * Producers `broadcast` after a successful mutation; consumers `useApiClientSyncListener`
 * to react (typically by refetching).
 */

export type ApiClientSyncKind = "collections" | "environments" | "history"

const CHANNEL_NAME = "api-client-sync"

let channel: BroadcastChannel | null = null
function getChannel(): BroadcastChannel | null {
    if (typeof window === "undefined") return null
    if (typeof BroadcastChannel === "undefined") return null
    if (!channel) channel = new BroadcastChannel(CHANNEL_NAME)
    return channel
}

interface SyncMessage {
    kind: ApiClientSyncKind
    /** Random tag identifying the sender, so the originating tab can ignore its own echo. */
    senderId: string
}

const SENDER_ID =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2)

export function broadcastApiClientUpdate(kind: ApiClientSyncKind): void {
    const ch = getChannel()
    if (!ch) return
    const msg: SyncMessage = { kind, senderId: SENDER_ID }
    try {
        ch.postMessage(msg)
    } catch {
        // BroadcastChannel can throw if the channel is closed mid-flight; non-fatal.
    }
}

/**
 * Subscribe to updates of a given `kind` from OTHER tabs.
 * The listener is debounced lightly: rapid bursts collapse to a single onUpdate call.
 */
export function useApiClientSyncListener(
    kind: ApiClientSyncKind,
    onUpdate: () => void,
): void {
    const onUpdateRef = React.useRef(onUpdate)
    React.useEffect(() => { onUpdateRef.current = onUpdate }, [onUpdate])

    React.useEffect(() => {
        const ch = getChannel()
        if (!ch) return

        let pending: ReturnType<typeof setTimeout> | null = null
        const handler = (e: MessageEvent<SyncMessage>) => {
            const data = e.data
            if (!data || data.kind !== kind) return
            if (data.senderId === SENDER_ID) return
            if (pending) clearTimeout(pending)
            pending = setTimeout(() => {
                pending = null
                onUpdateRef.current()
            }, 50)
        }

        ch.addEventListener("message", handler)
        return () => {
            if (pending) clearTimeout(pending)
            ch.removeEventListener("message", handler)
        }
    }, [kind])
}
