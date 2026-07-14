/**
 * ULID (26-char Crockford base32) — client-side, cryptographically random suffix.
 * @see https://github.com/ulid/spec
 */

const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function encodeTime(now: number, len: number): string {
  let str = '';
  let t = now;
  for (let l = len; l > 0; l--) {
    const mod = t % 32;
    str = ENCODING[mod]! + str;
    t = (t - mod) / 32;
  }
  return str;
}

function encodeRandom(len: number): string {
  const buffer = new Uint8Array(Math.ceil((len * 5) / 8));
  crypto.getRandomValues(buffer);
  let str = '';
  let pos = 0;
  let bits = 0;
  let value = 0;
  while (str.length < len) {
    if (bits < 5) {
      value = (value << 8) | buffer[pos]!;
      pos += 1;
      bits += 8;
    }
    bits -= 5;
    str += ENCODING[(value >>> bits) & 31]!;
  }
  return str.slice(0, len);
}

export function createUlid(ms: number = Date.now()): string {
  return encodeTime(ms, 10) + encodeRandom(16);
}
