/**
 * In-tab cron scheduler. Polls every 60s; for each enabled schedule whose
 * cron matches the current minute, fires the supplied handler. Only runs while
 * the tab is open — service-worker variant deferred.
 */

import { parseCron, cronMatches, type ParsedCron } from "./cron"

export interface ScheduleEntry {
    id: string
    label: string
    cron: string
    enabled: boolean
    onTick: () => Promise<void> | void
}

interface InternalEntry extends ScheduleEntry {
    parsed: ParsedCron
    lastFiredMinute: number | null
}

const entries = new Map<string, InternalEntry>()
let interval: ReturnType<typeof setInterval> | null = null

function tick(): void {
    const now = new Date()
    const minuteKey = Math.floor(now.getTime() / 60_000)
    for (const e of entries.values()) {
        if (!e.enabled) continue
        if (e.lastFiredMinute === minuteKey) continue
        if (!cronMatches(e.parsed, now)) continue
        e.lastFiredMinute = minuteKey
        try { void e.onTick() } catch { /* per-entry isolation */ }
    }
}

function ensureRunning(): void {
    if (interval || typeof window === "undefined") return
    interval = setInterval(tick, 60_000)
    // Also tick immediately so newly-added one-off entries fire promptly.
    setTimeout(tick, 0)
}

export function registerSchedule(entry: ScheduleEntry): void {
    const parsed = parseCron(entry.cron)
    entries.set(entry.id, { ...entry, parsed, lastFiredMinute: null })
    ensureRunning()
}

export function unregisterSchedule(id: string): void {
    entries.delete(id)
    if (entries.size === 0 && interval) {
        clearInterval(interval)
        interval = null
    }
}

export function listSchedules(): ScheduleEntry[] {
    return Array.from(entries.values()).map(({ parsed: _p, lastFiredMinute: _l, ...rest }) => {
        void _p; void _l
        return rest
    })
}
