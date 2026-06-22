const backendFetch = jest.fn()
jest.mock('@/lib/backend-auth', () => ({ backendFetch: (...a: unknown[]) => backendFetch(...a) }))

import { fetchAuditLog } from '@/lib/audit-log-api'

describe('fetchAuditLog', () => {
  beforeEach(() => backendFetch.mockReset())

  it('builds the query string and returns parsed data', async () => {
    backendFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0, skip: 0, limit: 50 }),
    })
    const res = await fetchAuditLog({ module: 'bookmarks', limit: 50 })
    const url = backendFetch.mock.calls[0][0] as string
    expect(url).toContain('/api/backend/audit-log')
    expect(url).toContain('module=bookmarks')
    expect(url).toContain('limit=50')
    expect(res.total).toBe(0)
  })

  it('throws on non-ok response', async () => {
    backendFetch.mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' })
    await expect(fetchAuditLog()).rejects.toThrow()
  })
})
