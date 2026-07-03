import { shouldUseMockDataWorker, WORKER_ROW_THRESHOLD } from '@/lib/mock-data-generator'

describe('shouldUseMockDataWorker', () => {
  it('stays synchronous at or below the threshold', () => {
    expect(shouldUseMockDataWorker(1, true)).toBe(false)
    expect(shouldUseMockDataWorker(WORKER_ROW_THRESHOLD, true)).toBe(false)
  })

  it('routes to the worker above the threshold', () => {
    expect(shouldUseMockDataWorker(WORKER_ROW_THRESHOLD + 1, true)).toBe(true)
    expect(shouldUseMockDataWorker(5000, true)).toBe(true)
  })

  it('never routes when Worker is unavailable (SSR / old browser)', () => {
    expect(shouldUseMockDataWorker(5000, false)).toBe(false)
  })
})
