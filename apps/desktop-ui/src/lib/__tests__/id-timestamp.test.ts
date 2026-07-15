import { createUlid } from '@/lib/ulid';
import type { IdKind } from '@/lib/generate-ids';
import { decodeIdTimestamp, idHasTimestamp } from '@/lib/id-timestamp';

// Fixtures generated with the `uuid` package at MS (see scripts note); pasted as
// literals because jest doesn't transform that ESM-only dependency.
const MS = 1784118896789; // 2026-07-15T12:34:56.789Z
const V7 = '019f65c5-e895-73d2-9ca7-ac96899eaa7c';
const V1 = '964e7c50-8049-11f1-9e9a-b3c1ddc7a4ae';
const V6 = '1f180499-64e7-6c50-ad42-e69635f386e0';

describe('decodeIdTimestamp', () => {
  it('round-trips a ULID timestamp exactly', () => {
    expect(decodeIdTimestamp(createUlid(MS), 'ulid')?.getTime()).toBe(MS);
  });

  it('round-trips a UUID v7 timestamp exactly', () => {
    expect(decodeIdTimestamp(V7, 'uuid7')?.getTime()).toBe(MS);
  });

  it('recovers a UUID v1 timestamp to within a millisecond', () => {
    const ms = decodeIdTimestamp(V1, 'uuid1')?.getTime() ?? NaN;
    expect(Math.abs(ms - MS)).toBeLessThanOrEqual(1);
  });

  it('recovers a UUID v6 timestamp to within a millisecond', () => {
    const ms = decodeIdTimestamp(V6, 'uuid6')?.getTime() ?? NaN;
    expect(Math.abs(ms - MS)).toBeLessThanOrEqual(1);
  });

  it('returns null for kinds without an embedded timestamp', () => {
    expect(decodeIdTimestamp('00000000-0000-0000-0000-000000000000', 'nil')).toBeNull();
    expect(decodeIdTimestamp('anything', 'uuid4')).toBeNull();
  });

  it('returns null for a malformed id rather than throwing', () => {
    expect(decodeIdTimestamp('not-a-uuid', 'uuid7')).toBeNull();
    expect(decodeIdTimestamp('!!!', 'ulid')).toBeNull();
  });
});

describe('idHasTimestamp', () => {
  it('flags only the time-based kinds', () => {
    const timed: IdKind[] = ['ulid', 'uuid1', 'uuid6', 'uuid7'];
    const untimed: IdKind[] = ['uuid3', 'uuid4', 'uuid5', 'nil'];
    expect(timed.every(idHasTimestamp)).toBe(true);
    expect(untimed.some(idHasTimestamp)).toBe(false);
  });
});
