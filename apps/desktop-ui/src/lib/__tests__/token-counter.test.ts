import {
  approxClaudeTokens,
  calcCost,
  chunkTokens,
  countTokensWith,
  countWords,
  MODEL_PRICES,
} from '@/lib/token-counter'

// Fake encoder: one token per whitespace-separated word (ids are indices).
const fakeEncode = (text: string): number[] => (text.match(/\S+/g) ?? []).map((_, i) => i)
// Fake decoder: token id n decodes to "t<n>".
const fakeDecode = (tokens: number[]): string => tokens.map((t) => `t${t}`).join('')

describe('countTokensWith', () => {
  it('returns 0 for empty text without calling the encoder', () => {
    const spy = jest.fn(fakeEncode)
    expect(countTokensWith(spy, '')).toBe(0)
    expect(spy).not.toHaveBeenCalled()
  })

  it('counts tokens using the injected encoder', () => {
    expect(countTokensWith(fakeEncode, 'hello world foo')).toBe(3)
  })
})

describe('approxClaudeTokens', () => {
  it('returns 0 for empty text', () => {
    expect(approxClaudeTokens('')).toBe(0)
  })

  it('uses ~3.6 chars per token, rounding up', () => {
    expect(approxClaudeTokens('a'.repeat(36))).toBe(10)
    expect(approxClaudeTokens('a')).toBe(1) // ceil(1/3.6)
    expect(approxClaudeTokens('a'.repeat(37))).toBe(11) // ceil(10.27...)
  })
})

describe('countWords', () => {
  it('counts whitespace-separated words and handles empty/whitespace input', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('   \n\t ')).toBe(0)
    expect(countWords('one two\nthree\tfour')).toBe(4)
  })
})

describe('calcCost', () => {
  it('computes input, output, total, and per-1000-calls costs', () => {
    const r = calcCost(1000, 500, { input: 3, output: 15 })
    expect(r.inputCost).toBeCloseTo(0.003, 10)
    expect(r.outputCost).toBeCloseTo(0.0075, 10)
    expect(r.total).toBeCloseTo(0.0105, 10)
    expect(r.per1000Calls).toBeCloseTo(10.5, 10)
  })

  it('handles zero tokens', () => {
    const r = calcCost(0, 0, { input: 10, output: 50 })
    expect(r).toEqual({ inputCost: 0, outputCost: 0, total: 0, per1000Calls: 0 })
  })

  it('clamps negative token counts to zero', () => {
    const r = calcCost(-100, -50, { input: 5, output: 25 })
    expect(r.total).toBe(0)
  })

  it('scales for a full million tokens', () => {
    const r = calcCost(1_000_000, 1_000_000, { input: 10, output: 50 })
    expect(r.inputCost).toBe(10)
    expect(r.outputCost).toBe(50)
    expect(r.total).toBe(60)
  })
})

describe('MODEL_PRICES', () => {
  it('contains unique ids and a custom entry', () => {
    const ids = MODEL_PRICES.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain('custom')
    for (const m of MODEL_PRICES) {
      expect(m.input).toBeGreaterThanOrEqual(0)
      expect(m.output).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('chunkTokens', () => {
  it('decodes each token individually and preserves order', () => {
    const r = chunkTokens(fakeDecode, [5, 1, 9])
    expect(r.chunks).toEqual(['t5', 't1', 't9'])
    expect(r.truncated).toBe(false)
    expect(r.totalTokens).toBe(3)
  })

  it('caps at the limit and flags truncation', () => {
    const tokens = Array.from({ length: 10 }, (_, i) => i)
    const r = chunkTokens(fakeDecode, tokens, 4)
    expect(r.chunks).toEqual(['t0', 't1', 't2', 't3'])
    expect(r.truncated).toBe(true)
    expect(r.totalTokens).toBe(10)
  })

  it('does not flag truncation when exactly at the limit', () => {
    const r = chunkTokens(fakeDecode, [1, 2, 3], 3)
    expect(r.truncated).toBe(false)
    expect(r.chunks).toHaveLength(3)
  })

  it('handles empty token list', () => {
    const r = chunkTokens(fakeDecode, [])
    expect(r).toEqual({ chunks: [], truncated: false, totalTokens: 0 })
  })
})
