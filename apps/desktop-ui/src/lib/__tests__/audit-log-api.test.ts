jest.mock('@/lib/tools-registry', () => ({
  getAllToolsMetadata: () => [
    { title: 'JSON Formatter', url: '/app/json-formatter', category: 'Formatters' },
    { title: 'Password Manager', url: '/app/passwords', category: 'Security > Password Manager' },
  ],
}))

import { fetchAuditLog, auditModules } from '@/lib/audit-log-api'

// Minimal localStorage + window shim (test env is node, no jsdom).
const store = new Map<string, string>()
const g = globalThis as unknown as { window?: unknown; localStorage?: unknown }
g.window = {}
g.localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
}

const KEY = 'tool-usage-history'

function seed(events: { toolId: string; url: string; timestamp: number }[]) {
  localStorage.setItem(KEY, JSON.stringify(events))
}

describe('fetchAuditLog (local)', () => {
  beforeEach(() => localStorage.clear())

  it('maps tool launches to audit events, newest first', async () => {
    seed([
      { toolId: 'json-formatter', url: '/app/json-formatter', timestamp: 1000 },
      { toolId: 'passwords', url: '/app/passwords', timestamp: 2000 },
    ])
    const res = await fetchAuditLog()
    expect(res.total).toBe(2)
    expect(res.items[0].ts).toBe(2000)
    expect(res.items[0].summary).toBe('Opened Password Manager')
    expect(res.items[0].module).toBe('Security')
    expect(res.items[1].summary).toBe('Opened JSON Formatter')
  })

  it('filters by module, time range, search and paginates', async () => {
    seed([
      { toolId: 'a', url: '/app/json-formatter', timestamp: 1000 },
      { toolId: 'b', url: '/app/passwords', timestamp: 3000 },
    ])
    expect((await fetchAuditLog({ module: 'Security' })).total).toBe(1)
    expect((await fetchAuditLog({ from: 2000 })).items).toHaveLength(1)
    expect((await fetchAuditLog({ search: 'json' })).total).toBe(1)
    const page = await fetchAuditLog({ limit: 1 })
    expect(page.items).toHaveLength(1)
    expect(page.total).toBe(2)
  })

  it('resolves locale-prefixed paths and returns empty when no log', async () => {
    seed([{ toolId: 'x', url: '/en/app/json-formatter', timestamp: 1000 }])
    expect((await fetchAuditLog()).items[0].summary).toBe('Opened JSON Formatter')
    localStorage.clear()
    expect((await fetchAuditLog()).total).toBe(0)
  })

  it('exposes tool groups as modules', () => {
    expect(auditModules()).toEqual(['Formatters', 'Security'])
  })
})
