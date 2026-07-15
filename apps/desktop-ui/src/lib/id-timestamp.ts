import type { IdKind } from './generate-ids';

/** Crockford base32 alphabet used by ULID. */
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
/** Milliseconds between the Gregorian epoch (1582-10-15) and the Unix epoch. */
const GREGORIAN_OFFSET_MS = 12_219_292_800_000;

/** True for id kinds that embed a creation timestamp. */
export function idHasTimestamp(kind: IdKind): boolean {
  return kind === 'ulid' || kind === 'uuid1' || kind === 'uuid6' || kind === 'uuid7';
}

/** Extract the embedded creation time from a time-based id, or null if not decodable. */
export function decodeIdTimestamp(id: string, kind: IdKind): Date | null {
  try {
    switch (kind) {
      case 'ulid':
        return ulidTime(id);
      case 'uuid7':
        return uuidV7Time(id);
      case 'uuid1':
        return uuidV1Time(id);
      case 'uuid6':
        return uuidV6Time(id);
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function ulidTime(id: string): Date | null {
  const time = id.slice(0, 10).toUpperCase();
  if (time.length !== 10) return null;
  let ms = 0;
  for (const ch of time) {
    const v = CROCKFORD.indexOf(ch);
    if (v < 0) return null;
    ms = ms * 32 + v;
  }
  return new Date(ms);
}

function hex(id: string): string {
  return id.replace(/-/g, '').toLowerCase();
}

function uuidV7Time(id: string): Date | null {
  const h = hex(id);
  if (h.length !== 32) return null;
  const ms = Number.parseInt(h.slice(0, 12), 16); // first 48 bits = Unix ms
  return Number.isFinite(ms) ? new Date(ms) : null;
}

// ponytail: 60-bit Gregorian ticks read through a double loses ~sub-ms precision — fine for a display timestamp, use BigInt if exactness ever matters.
function gregorianToDate(ticks: number): Date {
  return new Date(Math.floor(ticks / 10_000) - GREGORIAN_OFFSET_MS);
}

function uuidV1Time(id: string): Date | null {
  const h = hex(id);
  if (h.length !== 32) return null;
  const timeLow = h.slice(0, 8);
  const timeMid = h.slice(8, 12);
  const timeHi = h.slice(13, 16); // nibble 12 is the version, skip it
  const ticks = Number.parseInt(timeHi + timeMid + timeLow, 16);
  return Number.isFinite(ticks) ? gregorianToDate(ticks) : null;
}

function uuidV6Time(id: string): Date | null {
  const h = hex(id);
  if (h.length !== 32) return null;
  // v6 stores the 60-bit timestamp most-significant-first, split by the version nibble at 12.
  const ticks = Number.parseInt(h.slice(0, 12) + h.slice(13, 16), 16);
  return Number.isFinite(ticks) ? gregorianToDate(ticks) : null;
}
