/**
 * Favicon utilities for fetching and caching bookmark icons
 */

// Favicon service URLs
const GOOGLE_FAVICON_URL = 'https://www.google.com/s2/favicons?sz=64&domain='
const DUCKDUCKGO_FAVICON_URL = 'https://icons.duckduckgo.com/ip3/'

/**
 * Get favicon URL for a website
 * Uses Google's favicon service as primary, with DuckDuckGo as fallback
 */
export function getFaviconUrl(url: string, size: number = 32): string {
    try {
        const domain = new URL(url).hostname
        return `${GOOGLE_FAVICON_URL}${domain}`
    } catch {
        return '/placeholder-favicon.svg'
    }
}

/**
 * Get DuckDuckGo favicon URL (alternative service)
 */
export function getDuckDuckGoFavicon(url: string): string {
    try {
        const domain = new URL(url).hostname
        return `${DUCKDUCKGO_FAVICON_URL}${domain}.ico`
    } catch {
        return '/placeholder-favicon.svg'
    }
}

/**
 * Try to extract domain from URL for display
 */
export function getDomainFromUrl(url: string): string {
    try {
        const urlObj = new URL(url)
        return urlObj.hostname.replace(/^www\./, '')
    } catch {
        return url
    }
}

/**
 * Format URL for display (truncate if too long)
 */
export function formatUrlForDisplay(url: string, maxLength: number = 50): string {
    try {
        const urlObj = new URL(url)
        const displayUrl = urlObj.hostname + urlObj.pathname
        if (displayUrl.length > maxLength) {
            return displayUrl.substring(0, maxLength - 3) + '...'
        }
        return displayUrl
    } catch {
        return url.length > maxLength ? url.substring(0, maxLength - 3) + '...' : url
    }
}

/**
 * Get a color based on the domain (for consistent folder/tag colors)
 */
export function getColorFromString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }

    const hue = Math.abs(hash) % 360
    return `hsl(${hue}, 70%, 50%)`
}

/**
 * Predefined colors for tags and folders
 */
export const PRESET_COLORS = [
    '#ef4444', // red
    '#f97316', // orange
    '#f59e0b', // amber
    '#eab308', // yellow
    '#84cc16', // lime
    '#22c55e', // green
    '#10b981', // emerald
    '#14b8a6', // teal
    '#06b6d4', // cyan
    '#0ea5e9', // sky
    '#3b82f6', // blue
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#a855f7', // purple
    '#d946ef', // fuchsia
    '#ec4899', // pink
    '#f43f5e', // rose
]

/**
 * Validate if a string is a valid URL
 */
export function isValidUrl(url: string): boolean {
    try {
        const urlObj = new URL(url)
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
    } catch {
        return false
    }
}

/**
 * Normalize URL (add https:// if missing)
 */
export function normalizeUrl(url: string): string {
    if (!url) return url

    // Already has protocol
    if (url.match(/^https?:\/\//i)) {
        return url
    }

    // Add https://
    return `https://${url}`
}
