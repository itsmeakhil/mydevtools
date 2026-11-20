export const STANDARD_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"] as const

/** Uppercased method when `raw` is a valid HTTP token (RFC 9110 §5.6.2), else null. */
export function normalizeMethod(raw: unknown): string | null {
    if (typeof raw !== "string") return null
    const m = raw.trim().toUpperCase()
    return /^[!#$%&'*+.^_`|~0-9A-Z-]+$/.test(m) ? m : null
}
