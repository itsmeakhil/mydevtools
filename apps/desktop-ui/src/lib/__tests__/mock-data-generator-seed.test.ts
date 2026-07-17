import { ALL_FIELD_TYPES, generateMockData, type FieldSchema } from '../mock-data-generator'

// Explicit date ranges so output is byte-identical across days (see JSDoc on seed).
const SCHEMA: FieldSchema[] = [
  { name: 'id', type: 'uuid' },
  { name: 'name', type: 'full_name' },
  { name: 'email', type: 'email' },
  { name: 'score', type: 'float', options: { min: 0, max: 100, decimals: 3 } },
  { name: 'joined', type: 'datetime', options: { dateFrom: '2023-01-01', dateTo: '2024-01-01' } },
  { name: 'active', type: 'boolean' },
  { name: 'site', type: 'domain' },
  { name: 'notes', type: 'sentence', options: { blankPercent: 30 } },
]

describe('generateMockData seeding', () => {
  it('same numeric seed + same schema produces identical output twice', () => {
    const opts = { schema: SCHEMA, rows: 50, format: 'json' as const, seed: 42 }
    expect(generateMockData(opts)).toBe(generateMockData(opts))
  })

  it('same string seed produces identical output (fnv1a hashing)', () => {
    const a = generateMockData({ schema: SCHEMA, rows: 50, format: 'csv', seed: 'demo-fixtures' })
    const b = generateMockData({ schema: SCHEMA, rows: 50, format: 'csv', seed: 'demo-fixtures' })
    expect(a).toBe(b)
  })

  it('different seeds produce different output', () => {
    const a = generateMockData({ schema: SCHEMA, rows: 50, format: 'json', seed: 1 })
    const b = generateMockData({ schema: SCHEMA, rows: 50, format: 'json', seed: 2 })
    expect(a).not.toBe(b)
  })

  it('seeded uuids are valid v4, deterministic, and bypass crypto.randomUUID', () => {
    const run = () =>
      JSON.parse(
        generateMockData({ schema: [{ name: 'id', type: 'uuid' }], rows: 5, format: 'json', seed: 7 })
      ) as { id: string }[]
    const out = run()
    for (const row of out) {
      expect(row.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      )
    }
    expect(run()).toEqual(out)
  })

  it('unseeded runs remain random', () => {
    const opts = { schema: SCHEMA, rows: 50, format: 'json' as const }
    expect(generateMockData(opts)).not.toBe(generateMockData(opts))
  })

  it('rng resets after a seeded run (no leakage into unseeded runs)', () => {
    generateMockData({ schema: SCHEMA, rows: 5, format: 'json', seed: 42 })
    const a = generateMockData({ schema: SCHEMA, rows: 50, format: 'json' })
    const b = generateMockData({ schema: SCHEMA, rows: 50, format: 'json' })
    expect(a).not.toBe(b)
  })

  it('empty-string seed is treated as unseeded', () => {
    const opts = { schema: SCHEMA, rows: 50, format: 'json' as const, seed: '' }
    expect(generateMockData(opts)).not.toBe(generateMockData(opts))
  })
})

describe('field type coverage', () => {
  it('every field type produces a non-empty value (except custom_list without values)', () => {
    const schema: FieldSchema[] = ALL_FIELD_TYPES
      .filter((t) => t !== 'custom_list')
      .map((t) => ({ name: t, type: t }))
    const rows = JSON.parse(
      generateMockData({ schema, rows: 3, format: 'json', seed: 42 })
    ) as Record<string, unknown>[]
    for (const row of rows) {
      for (const t of Object.keys(row)) {
        expect(row[t]).not.toBeNull()
        expect(String(row[t]).length).toBeGreaterThan(0)
      }
    }
  })

  it('hash/id/format types match expected shapes', () => {
    const schema: FieldSchema[] = [
      { name: 'md5', type: 'md5' },
      { name: 'sha256', type: 'sha256' },
      { name: 'nanoid', type: 'nanoid' },
      { name: 'isbn', type: 'isbn' },
      { name: 'time', type: 'time' },
      { name: 'port', type: 'port' },
    ]
    const rows = JSON.parse(
      generateMockData({ schema, rows: 20, format: 'json', seed: 7 })
    ) as { md5: string; sha256: string; nanoid: string; isbn: string; time: string; port: number }[]
    for (const row of rows) {
      expect(row.md5).toMatch(/^[0-9a-f]{32}$/)
      expect(row.sha256).toMatch(/^[0-9a-f]{64}$/)
      expect(row.nanoid).toMatch(/^[A-Za-z0-9_-]{21}$/)
      expect(row.time).toMatch(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/)
      expect(row.port).toBeGreaterThanOrEqual(1024)
      expect(row.port).toBeLessThanOrEqual(65535)
      // ISBN-13: 978 prefix + valid check digit
      const digits = row.isbn.replace(/-/g, '').split('').map(Number)
      expect(digits).toHaveLength(13)
      expect(row.isbn.startsWith('978')).toBe(true)
      const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0)
      expect(sum % 10).toBe(0)
    }
  })
})
