'use client'

import { ArrowDownAZ, ArrowUpDown, Filter, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import type { SortOption, StatusFilter } from './utils'

interface SearchFilterBarProps {
    search: string
    onSearchChange: (value: string) => void
    statusFilter: StatusFilter
    onStatusFilterChange: (value: StatusFilter) => void
    sortBy: SortOption
    onSortChange: (value: SortOption) => void
    totalCount: number
    filteredCount: number
}

export function SearchFilterBar({
    search,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    sortBy,
    onSortChange,
    totalCount,
    filteredCount,
}: SearchFilterBarProps) {
    if (totalCount === 0) return null

    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
            {/* Search */}
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search links..."
                    className="h-9 pl-9 bg-card/60 border-border/50 text-sm"
                />
            </div>

            <div className="flex items-center gap-2">
                {/* Status filter */}
                <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}>
                    <SelectTrigger className="h-9 w-[120px] bg-card/60 border-border/50 text-xs">
                        <Filter className="h-3 w-3 mr-1.5 text-muted-foreground" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                </Select>

                {/* Sort */}
                <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
                    <SelectTrigger className="h-9 w-[140px] bg-card/60 border-border/50 text-xs">
                        <ArrowUpDown className="h-3 w-3 mr-1.5 text-muted-foreground" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="newest">Newest first</SelectItem>
                        <SelectItem value="oldest">Oldest first</SelectItem>
                        <SelectItem value="most-clicks">Most clicks</SelectItem>
                        <SelectItem value="least-clicks">Least clicks</SelectItem>
                        <SelectItem value="alpha">Alphabetical</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Result count */}
            {search || statusFilter !== 'all' ? (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {filteredCount} of {totalCount}
                </span>
            ) : null}
        </div>
    )
}
