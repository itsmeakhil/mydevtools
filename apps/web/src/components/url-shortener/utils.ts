export function formatDate(ms: number): string {
    return new Date(ms).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })
}

export function formatClicks(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
    return String(n)
}

export type SortOption = 'newest' | 'oldest' | 'most-clicks' | 'least-clicks' | 'alpha'
export type StatusFilter = 'all' | 'active' | 'inactive'
