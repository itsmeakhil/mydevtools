import { proxyJsonAuthed } from '@/lib/backend-auth'

const BACKEND_BASE_URL: string =
    process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
    'http://localhost:8000'

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

function backendErrorMessage(data: unknown): string {
    if (typeof data === 'string' && data.trim()) return data
    if (data && typeof data === 'object' && 'detail' in data) {
        const d = (data as { detail: unknown }).detail
        if (typeof d === 'string') return d
        try { return JSON.stringify(d) } catch { return 'Request failed' }
    }
    return 'Request failed'
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const { status, data } = await proxyJsonAuthed<T>(BACKEND_BASE_URL, method, path, body)
    if (status < 200 || status >= 300) throw new Error(backendErrorMessage(data))
    return data as T
}

export async function createShortLink(body: ShortLinkCreate): Promise<ShortLink> {
    return request<ShortLink>('POST', BASE, body)
}

export async function listShortLinks(skip = 0, limit = 100): Promise<ShortLink[]> {
    return request<ShortLink[]>('GET', `${BASE}?skip=${skip}&limit=${limit}`)
}

export async function updateShortLink(code: string, body: ShortLinkUpdate): Promise<ShortLink> {
    return request<ShortLink>('PATCH', `${BASE}/${encodeURIComponent(code)}`, body)
}

export async function deleteShortLink(code: string): Promise<void> {
    await request<void>('DELETE', `${BASE}/${encodeURIComponent(code)}`)
}
