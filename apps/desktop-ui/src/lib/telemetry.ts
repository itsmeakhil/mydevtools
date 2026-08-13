"use client"

/**
 * Anonymous, opt-in usage telemetry (Aptabase ingest).
 *
 * The app has no accounts, so there is no user to attribute anything to — and
 * we keep it that way. What leaves the device is a rotating session id, the app
 * version, the locale, and an event name. No device id, no IP-derived identity,
 * no cookies, nothing typed into a tool. Off until the user turns it on.
 *
 * Talks to Aptabase's `/api/v0/event` endpoint directly rather than through
 * `@aptabase/web`: the payload is a dozen lines, and a privacy-first app that
 * ships fewer third-party packages is easier to audit than one that ships more.
 */

const CONSENT_KEY = "telemetry-consent"
const SDK_VERSION = "mydevtools-inline@1"
/** Aptabase rotates the session after an hour of silence; match that. */
const SESSION_IDLE_MS = 60 * 60 * 1000

const APP_KEY = process.env.NEXT_PUBLIC_APTABASE_KEY ?? ""
/** Only needed for self-hosted (`A-SH-…`) keys. */
const SELF_HOST = process.env.NEXT_PUBLIC_APTABASE_HOST ?? ""

export type Consent = "granted" | "denied" | "unset"

export function getConsent(): Consent {
    if (typeof window === "undefined") return "unset"
    const raw = window.localStorage.getItem(CONSENT_KEY)
    return raw === "granted" || raw === "denied" ? raw : "unset"
}

export function setConsent(next: "granted" | "denied"): void {
    window.localStorage.setItem(CONSENT_KEY, next)
    window.dispatchEvent(new Event(CONSENT_KEY))
}

/**
 * Region lives in the app key (`A-EU-1234567890`). An unparseable key means no
 * endpoint, which means `track` stays a no-op — that is how the app behaves in
 * dev and in any build that ships without a key.
 */
export function ingestUrl(appKey: string, selfHost = ""): string | null {
    const parts = appKey.split("-")
    if (parts.length !== 3) return null
    const region = parts[1]
    if (region === "SH") return selfHost ? `${selfHost}/api/v0/event` : null
    const host = region === "EU" ? "https://eu.aptabase.com" : region === "US" ? "https://us.aptabase.com" : null
    return host ? `${host}/api/v0/event` : null
}

let sessionId = ""
let lastSeen = 0

export function sessionIdFor(now: number, random = Math.random()): string {
    if (!sessionId || now - lastSeen > SESSION_IDLE_MS) {
        const rand = Math.floor(random * 1e8).toString().padStart(8, "0")
        sessionId = `${Math.floor(now / 1000)}${rand}`
    }
    lastSeen = now
    return sessionId
}

let appVersion = ""

/** Called once at shell mount so events can carry the running version. */
export async function initTelemetry(): Promise<void> {
    const { isDesktop } = await import("@/lib/desktop/is-desktop")
    if (!isDesktop()) return
    try {
        const { currentAppVersion } = await import("@/lib/desktop/updater")
        appVersion = await currentAppVersion()
    } catch {
        // Version API unavailable — send events without it rather than not at all.
    }
    track("app_started")
}

export type EventProps = Record<string, string | number | boolean>

export function buildEvent(eventName: string, props: EventProps | undefined, now: number) {
    return {
        timestamp: new Date(now).toISOString(),
        sessionId: sessionIdFor(now),
        eventName,
        systemProps: {
            locale: typeof navigator === "undefined" ? "" : navigator.language,
            isDebug: process.env.NODE_ENV !== "production",
            appVersion,
            sdkVersion: SDK_VERSION,
        },
        props,
    }
}

/**
 * Fire-and-forget. Never throws, never blocks the caller, and drops the event
 * outright when offline — usage counts are directional, and a retry queue would
 * mean persisting user behaviour to disk to protect a metric.
 *
 * ponytail: no offline queue. Add one only if the offline gap distorts numbers.
 */
export function track(eventName: string, props?: EventProps): void {
    if (getConsent() !== "granted") return
    const url = ingestUrl(APP_KEY, SELF_HOST)
    if (!url) return

    void fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "App-Key": APP_KEY },
        credentials: "omit",
        body: JSON.stringify(buildEvent(eventName, props, Date.now())),
    }).catch(() => {
        // Offline or endpoint down. Telemetry must never surface to the user.
    })
}
