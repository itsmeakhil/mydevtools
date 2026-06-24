import { apiRequest } from '@/lib/backend-api'

const BASE = '/api/v1/url-shortener'

export interface ShortLink {
    code: string
    original_url: string
    title: string
    created_by: string
    created_at: number
    clicks: number
    active: boolean
}

export interface ShortLinkCreate {
    original_url: string
    title?: string
    custom_code?: string
}

export interface ShortLinkUpdate {
    title?: string
    active?: boolean
}

export async function createShortLink(body: ShortLinkCreate): Promise<ShortLink> {
    return apiRequest<ShortLink>('POST', BASE, body)
}

export async function listShortLinks(skip = 0, limit = 500): Promise<ShortLink[]> {
    return apiRequest<ShortLink[]>('GET', `${BASE}?skip=${skip}&limit=${limit}`)
}

export async function updateShortLink(code: string, body: ShortLinkUpdate): Promise<ShortLink> {
    return apiRequest<ShortLink>('PATCH', `${BASE}/${encodeURIComponent(code)}`, body)
}

export async function deleteShortLink(code: string): Promise<void> {
    await apiRequest<void>('DELETE', `${BASE}/${encodeURIComponent(code)}`)
}

export interface StatEntry {
    label: string
    clicks: number
}

export interface DailyClicks {
    date: string
    clicks: number
}

export interface LinkAnalytics {
    total_clicks: number
    daily: DailyClicks[]
    referrers: StatEntry[]
    devices: StatEntry[]
    os: StatEntry[]
    browsers: StatEntry[]
}

export async function getLinkAnalytics(code: string, days = 30): Promise<LinkAnalytics> {
    return apiRequest<LinkAnalytics>('GET', `${BASE}/${encodeURIComponent(code)}/analytics?days=${days}`)
}
