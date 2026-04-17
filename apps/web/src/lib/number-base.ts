export type NumberBase = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36;

export const NUMBER_BASES: readonly NumberBase[] = Array.from({ length: 35 }, (_, i) => (i + 2) as NumberBase);

function stripCommonPrefix(input: string, base: NumberBase): string {
  const s = input.toLowerCase();
  if (base === 16 && s.startsWith('0x')) return input.slice(2);
  if (base === 2 && s.startsWith('0b')) return input.slice(2);
  if (base === 8 && s.startsWith('0o')) return input.slice(2);
  return input;
}

function digitValue(ch: string): number {
  const c = ch.charCodeAt(0);
  if (c >= 48 && c <= 57) return c - 48; // 0-9
  if (c >= 65 && c <= 90) return c - 65 + 10; // A-Z
  if (c >= 97 && c <= 122) return c - 97 + 10; // a-z
  return -1;
}

/**
 * Parse an integer string in base 2..36 into BigInt.
 * - Accepts optional leading +/-
 * - Ignores spaces and underscores
 * - Allows 0x/0b/0o prefixes when base matches
 */
export function parseIntegerInBase(raw: string, base: NumberBase): bigint {
  let s = raw.trim();
  if (!s) throw new Error('empty');

  let sign = BigInt(1);
  if (s.startsWith('+')) s = s.slice(1);
  else if (s.startsWith('-')) {
    sign = BigInt(-1);
    s = s.slice(1);
  }

  s = stripCommonPrefix(s.trim(), base);
  s = s.replace(/[\s_]+/g, '');
  if (!s) throw new Error('empty');

  const b = BigInt(base);
  let out = BigInt(0);
  for (let i = 0; i < s.length; i++) {
    const v = digitValue(s[i]!);
    if (v < 0 || v >= base) throw new Error('invalid_digit');
    out = out * b + BigInt(v);
  }
  return out * sign;
}

export function formatIntegerInBase(value: bigint, base: NumberBase): string {
  // BigInt#toString supports radix 2..36
  return value.toString(base);
}

