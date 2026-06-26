/**
 * Minimal cron matcher (5-field POSIX-ish): `min hr dom mon dow`.
 * Supports `*`, exact values, ranges (`1-5`), step (`*\/15` / `1-30/2`),
 * and comma-lists (`1,5,10`).
 *
 * Used for the request scheduler that polls every minute and fires on tick
 * when the field set matches the current wall clock.
 */

export interface ParsedCron {
    minutes: Set<number>
    hours: Set<number>
    daysOfMonth: Set<number>
    months: Set<number>
    daysOfWeek: Set<number>
}

function rangeSet(field: string, min: number, max: number): Set<number> {
    const result = new Set<number>()
    for (const part of field.split(",")) {
        const [body, stepStr] = part.split("/")
        const step = stepStr ? Number(stepStr) : 1
        let lo = min, hi = max
        if (body !== "*") {
            if (body.includes("-")) {
                const [a, b] = body.split("-").map(Number)
                lo = a; hi = b
            } else {
                lo = Number(body); hi = Number(body)
            }
        }
        if (!Number.isFinite(lo) || !Number.isFinite(hi) || !Number.isFinite(step) || step < 1) {
            throw new Error(`Bad cron field: "${field}"`)
        }
        for (let i = lo; i <= hi; i += step) {
            if (i >= min && i <= max) result.add(i)
        }
    }
    return result
}

export function parseCron(expression: string): ParsedCron {
    const fields = expression.trim().split(/\s+/)
    if (fields.length !== 5) {
        throw new Error("Expected 5 cron fields: 'min hr dom mon dow'")
    }
    const [m, h, dom, mon, dow] = fields
    return {
        minutes: rangeSet(m, 0, 59),
        hours: rangeSet(h, 0, 23),
        daysOfMonth: rangeSet(dom, 1, 31),
        months: rangeSet(mon, 1, 12),
        daysOfWeek: rangeSet(dow, 0, 6),
    }
}

export function cronMatches(parsed: ParsedCron, date: Date): boolean {
    return (
        parsed.minutes.has(date.getMinutes()) &&
        parsed.hours.has(date.getHours()) &&
        parsed.daysOfMonth.has(date.getDate()) &&
        parsed.months.has(date.getMonth() + 1) &&
        parsed.daysOfWeek.has(date.getDay())
    )
}
