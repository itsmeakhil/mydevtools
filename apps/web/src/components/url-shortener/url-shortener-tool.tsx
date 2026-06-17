'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Link2 } from 'lucide-react'
import {
    listShortLinks,
    type ShortLink,
} from '@/lib/url-shortener-api'
import useAuth from '@/utils/useAuth'
import type { SortOption, StatusFilter } from './utils'
import { ShortenForm } from './shorten-form'
import { StatsStrip } from './stats-strip'
import { SearchFilterBar } from './search-filter-bar'
import { LinkCard } from './link-card'
import { LinkListSkeleton } from './link-list-skeleton'

// ── Helpers ────────────────────────────────────────────────────────────────

function filterAndSort(
    links: ShortLink[],
    search: string,
    statusFilter: StatusFilter,
    sortBy: SortOption,
): ShortLink[] {
    let result = [...links]

    // Status filter
    if (statusFilter === 'active') result = result.filter((l) => l.active)
    if (statusFilter === 'inactive') result = result.filter((l) => !l.active)

    // Search (case-insensitive across title, url, code)
    if (search.trim()) {
        const q = search.toLowerCase()
        result = result.filter(
            (l) =>
                l.title.toLowerCase().includes(q) ||
                l.original_url.toLowerCase().includes(q) ||
                l.code.toLowerCase().includes(q),
        )
    }

    // Sort
    switch (sortBy) {
        case 'newest':
            result.sort((a, b) => b.created_at - a.created_at)
            break
        case 'oldest':
            result.sort((a, b) => a.created_at - b.created_at)
            break
        case 'most-clicks':
            result.sort((a, b) => b.clicks - a.clicks)
            break
        case 'least-clicks':
            result.sort((a, b) => a.clicks - b.clicks)
            break
        case 'alpha':
            result.sort((a, b) => a.title.localeCompare(b.title))
            break
    }

    return result
}

// ── Main ───────────────────────────────────────────────────────────────────

export function UrlShortenerTool() {
    const { user } = useAuth(false)
    const [links, setLinks] = useState<ShortLink[]>([])
    const [loading, setLoading] = useState(true)

    // Search / filter / sort state
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
    const [sortBy, setSortBy] = useState<SortOption>('newest')

    const shortBase = typeof window !== 'undefined' ? window.location.origin : ''

    const totalClicks = links.reduce((sum, l) => sum + l.clicks, 0)
    const activeCount = links.filter((l) => l.active).length

    const filteredLinks = useMemo(
        () => filterAndSort(links, search, statusFilter, sortBy),
        [links, search, statusFilter, sortBy],
    )

    useEffect(() => {
        if (!user) { setLoading(false); return }
        listShortLinks()
            .then(setLinks)
            .catch(() => toast.error('Failed to load links'))
            .finally(() => setLoading(false))
    }, [user])

    const handleCreated = (link: ShortLink) => {
        setLinks((prev) => [link, ...prev])
    }

    const handleDelete = (code: string) =>
        setLinks((prev) => prev.filter((l) => l.code !== code))

    const handleToggle = (code: string, active: boolean) =>
        setLinks((prev) => prev.map((l) => (l.code === code ? { ...l, active } : l)))

    const handleUpdateTitle = (code: string, title: string) =>
        setLinks((prev) => prev.map((l) => (l.code === code ? { ...l, title } : l)))

    return (
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-2 py-4 md:px-0">

            {/* Hero form + "just created" banner */}
            <ShortenForm
                isAuthenticated={!!user}
                onCreated={handleCreated}
                shortBase={shortBase}
            />

            {/* Stats strip — only shown when no filter/search is active */}
            {!search && statusFilter === 'all' && (
                <StatsStrip
                    totalLinks={links.length}
                    activeCount={activeCount}
                    totalClicks={totalClicks}
                />
            )}

            {/* Search / Filter / Sort toolbar */}
            <SearchFilterBar
                search={search}
                onSearchChange={setSearch}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                sortBy={sortBy}
                onSortChange={setSortBy}
                totalCount={links.length}
                filteredCount={filteredLinks.length}
            />

            {/* Link list */}
            <div className="space-y-2">
                {loading ? (
                    <LinkListSkeleton />
                ) : !user ? (
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/50 bg-muted/10 py-12 text-center">
                        <Link2 className="h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
                        <div>
                            <p className="text-sm font-medium text-foreground">Sign in to manage links</p>
                            <p className="text-xs text-muted-foreground">Your short links are saved to your account</p>
                        </div>
                    </div>
                ) : links.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/50 bg-muted/10 py-12 text-center">
                        <Link2 className="h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
                        <div>
                            <p className="text-sm font-medium text-foreground">No links yet</p>
                            <p className="text-xs text-muted-foreground">Paste a URL above to create your first short link</p>
                        </div>
                    </div>
                ) : filteredLinks.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/50 bg-muted/10 py-10 text-center">
                        <Link2 className="h-7 w-7 text-muted-foreground/40" strokeWidth={1.5} />
                        <div>
                            <p className="text-sm font-medium text-foreground">No matching links</p>
                            <p className="text-xs text-muted-foreground">Try adjusting your search or filters</p>
                        </div>
                    </div>
                ) : (
                    filteredLinks.map((link) => (
                        <LinkCard
                            key={link.code}
                            link={link}
                            shortBase={shortBase}
                            onDelete={handleDelete}
                            onToggle={handleToggle}
                            onUpdateTitle={handleUpdateTitle}
                        />
                    ))
                )}
            </div>
        </div>
    )
}
