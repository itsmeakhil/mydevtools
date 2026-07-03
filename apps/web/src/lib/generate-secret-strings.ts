/** Max secrets per generate action (matches UUID bulk cap). */
export const MAX_SECRET_BULK = 10_000;

/** Max characters per generated secret. */
export const MAX_SECRET_LENGTH = 512;

/** Max unique characters in the alphabet after deduplication. */
export const MAX_ALPHABET_UNIQUE = 1024;

export const MIN_SECRET_LENGTH = 1;

export type GenerateSecretStringsErrorKey =
  | 'emptyAlphabet'
  | 'alphabetTooLong'
  | 'lengthOutOfRange'
  | 'countOutOfRange';

export type GenerateSecretStringsResult =
  | { ok: true; lines: string[] }
  | { ok: false; errorKey: GenerateSecretStringsErrorKey };

/** First occurrence wins; later duplicates dropped. */
export function dedupeAlphabet(raw: string): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const ch of raw) {
    if (!seen.has(ch)) {
      seen.add(ch);
      out.push(ch);
    }
  }
  return out.join('');
}

/**
 * Characters commonly misread for one another in monospace/printed text, or
 * hostile to shell copy-paste:
 * - `0`/`O` (zero vs capital o) and `1`/`l`/`I` (one, lowercase L, capital i)
 * - `|` — confusable with l/I/1, and a shell metacharacter
 * - `` ` ``, `'`, `"` — quoting characters that break naive shell/env-file interpolation
 * Not stripped: S/5, B/8, Z/2 (distinguishable in common monospace fonts;
 * removing them shrinks the alphabet for marginal legibility gain).
 */
export const AMBIGUOUS_CHARACTERS = '0O1lI|`\'"';

/** Returns `alphabet` with every AMBIGUOUS_CHARACTERS entry removed (order preserved). */
export function stripAmbiguous(alphabet: string): string {
  const ambiguous = new Set(AMBIGUOUS_CHARACTERS);
  return Array.from(alphabet)
    .filter((ch) => !ambiguous.has(ch))
    .join('');
}

/**
 * Uniform random strings over `alphabet` using crypto.getRandomValues and rejection sampling
 * (no modulo bias).
 */
export function generateSecretStrings(options: {
  alphabet: string;
  length: number;
  count: number;
}): GenerateSecretStringsResult {
  const alphabet = dedupeAlphabet(options.alphabet);
  if (alphabet.length === 0) {
    return { ok: false, errorKey: 'emptyAlphabet' };
  }
  if (alphabet.length > MAX_ALPHABET_UNIQUE) {
    return { ok: false, errorKey: 'alphabetTooLong' };
  }

  const length = Math.floor(Number(options.length));
  if (!Number.isFinite(length) || length < MIN_SECRET_LENGTH || length > MAX_SECRET_LENGTH) {
    return { ok: false, errorKey: 'lengthOutOfRange' };
  }

  const count = Math.floor(Number(options.count));
  if (!Number.isFinite(count) || count < 1 || count > MAX_SECRET_BULK) {
    return { ok: false, errorKey: 'countOutOfRange' };
  }

  const n = alphabet.length;
  const limit = Math.floor(256 / n) * n;
  const buf = new Uint8Array(4096);
  let pos = buf.length;

  const nextByte = (): number => {
    if (pos >= buf.length) {
      crypto.getRandomValues(buf);
      pos = 0;
    }
    return buf[pos++]!;
  };

  const nextIndex = (): number => {
    for (;;) {
      const x = nextByte();
      if (x < limit) return x % n;
    }
  };

  const lines: string[] = [];
  for (let c = 0; c < count; c++) {
    let line = '';
    for (let j = 0; j < length; j++) {
      line += alphabet[nextIndex()]!;
    }
    lines.push(line);
  }

  return { ok: true, lines };
}
