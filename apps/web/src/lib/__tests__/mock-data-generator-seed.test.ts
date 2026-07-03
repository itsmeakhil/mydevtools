import { generateMockData, type FieldSchema } from '../mock-data-generator'

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
