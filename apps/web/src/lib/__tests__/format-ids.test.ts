import { formatUuid, idsAsJsonArray, NIL_UUID } from '@/lib/format-ids';

const UUID = '019778f3-2ee0-7cd2-9138-b76ba8a373f7';
const ULID = '01J2X3Y4Z5A6B7C8D9E0F1G2H3';

describe('formatUuid', () => {
  it('returns the id unchanged by default', () => {
    expect(formatUuid(UUID)).toBe(UUID);
  });

  it('uppercases when requested', () => {
    expect(formatUuid(UUID, { uppercase: true })).toBe(UUID.toUpperCase());
  });

  it('strips hyphens when hyphens is false', () => {
    expect(formatUuid(UUID, { hyphens: false })).toBe(UUID.replaceAll('-', ''));
    expect(formatUuid(UUID, { hyphens: false })).toHaveLength(32);
  });

  it('combines both options', () => {
    expect(formatUuid(UUID, { uppercase: true, hyphens: false })).toBe(
      UUID.replaceAll('-', '').toUpperCase()
    );
  });

  it('leaves ULIDs unchanged by the hyphen toggle (ULIDs have no hyphens)', () => {
    expect(formatUuid(ULID, { hyphens: false })).toBe(ULID);
    expect(formatUuid(ULID, { hyphens: true })).toBe(ULID);
  });

  it('uppercase still applies to ULIDs', () => {
    expect(formatUuid('01j2x3y4z5a6b7c8d9e0f1g2h3', { uppercase: true })).toBe(ULID);
  });
});

describe('idsAsJsonArray', () => {
  it('produces a pretty-printed JSON array that round-trips', () => {
    const out = idsAsJsonArray([UUID, ULID]);
    expect(JSON.parse(out)).toEqual([UUID, ULID]);
    expect(out).toContain('\n  "');
  });

  it('renders an empty list as []', () => {
    expect(idsAsJsonArray([])).toBe('[]');
  });
});

describe('NIL_UUID', () => {
  it('is the all-zero RFC 9562 nil UUID', () => {
    expect(NIL_UUID).toBe('00000000-0000-0000-0000-000000000000');
  });

  it('formats like any other UUID', () => {
    expect(formatUuid(NIL_UUID, { hyphens: false })).toBe('0'.repeat(32));
  });
});
