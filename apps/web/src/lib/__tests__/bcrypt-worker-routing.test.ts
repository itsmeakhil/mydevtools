import { BCRYPT_WORKER_MIN_ROUNDS, shouldUseBcryptWorker } from '@/lib/hash-digest';

describe('shouldUseBcryptWorker', () => {
  it('stays synchronous below 12 rounds', () => {
    expect(shouldUseBcryptWorker(4, true)).toBe(false);
    expect(shouldUseBcryptWorker(10, true)).toBe(false);
    expect(shouldUseBcryptWorker(BCRYPT_WORKER_MIN_ROUNDS - 1, true)).toBe(false);
  });

  it('routes to the worker at 12 rounds and above', () => {
    expect(shouldUseBcryptWorker(BCRYPT_WORKER_MIN_ROUNDS, true)).toBe(true);
    expect(shouldUseBcryptWorker(14, true)).toBe(true);
    expect(shouldUseBcryptWorker(15, true)).toBe(true);
  });

  it('never routes when Worker is unavailable (SSR / old browser)', () => {
    expect(shouldUseBcryptWorker(15, false)).toBe(false);
  });
});
