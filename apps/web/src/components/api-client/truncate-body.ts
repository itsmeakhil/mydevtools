/**
 * Pure helper for truncating large response bodies before passing them to Monaco.
 * Extracted so tests can import it without pulling in React/next-intl.
 */

export interface TruncateResult {
    inline: string
    truncated: boolean
}

export function truncateBody(body: string, max: number): TruncateResult {
    if (body.length <= max) return { inline: body, truncated: false }
    return { inline: body.slice(0, max), truncated: true }
}
