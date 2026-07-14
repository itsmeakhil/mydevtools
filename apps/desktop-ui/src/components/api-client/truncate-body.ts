/**
 * Pure helper for truncating large response bodies before passing them to Monaco.
 * Extracted so tests can import it without pulling in React/next-intl.
 */

export interface TruncateResult {
    inline: string
    truncated: boolean
}

/**
 * Slice up to `max` UTF-16 code units, but never bisect a surrogate pair.
 * JS strings are UTF-16; emoji and astral codepoints occupy two code units.
 * The old `slice(0, max)` could leave a dangling high surrogate, which Monaco
 * renders as the replacement character.
 */
export function truncateBody(body: string, max: number): TruncateResult {
    if (body.length <= max) return { inline: body, truncated: false }
    let end = max
    const last = body.charCodeAt(end - 1)
    const isHighSurrogate = last >= 0xd800 && last <= 0xdbff
    if (isHighSurrogate) end -= 1
    return { inline: body.slice(0, end), truncated: true }
}
