export const MAX_TEST_TEXT_LENGTH = 200_000;
export const MAX_MATCHES = 10_000;

export type MatchRange = { start: number; end: number };

export type RegexTestResult =
  | { ok: true; ranges: MatchRange[]; matchCount: number }
  | { ok: false; error: string };

/** Merge overlapping / adjacent ranges for a single highlight layer. */
export function mergeRanges(ranges: MatchRange[]): MatchRange[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const out: MatchRange[] = [{ ...sorted[0]! }];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i]!;
    const last = out[out.length - 1]!;
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      out.push({ ...cur });
    }
  }
  return out;
}

export function buildFlagString(flags: {
  global: boolean;
  ignoreCase: boolean;
  multiline: boolean;
  dotAll: boolean;
  unicode: boolean;
}): string {
  let s = '';
  if (flags.global) s += 'g';
  if (flags.ignoreCase) s += 'i';
  if (flags.multiline) s += 'm';
  if (flags.dotAll) s += 's';
  if (flags.unicode) s += 'u';
  return s;
}

export function findMatchRanges(
  text: string,
  pattern: string,
  flagString: string
): RegexTestResult {
  if (text.length > MAX_TEST_TEXT_LENGTH) {
    return {
      ok: false,
      error: `Text is limited to ${MAX_TEST_TEXT_LENGTH.toLocaleString()} characters.`,
    };
  }

  const trimmed = pattern;
  if (trimmed === '') {
    return { ok: true, ranges: [], matchCount: 0 };
  }

  let re: RegExp;
  try {
    re = new RegExp(trimmed, flagString);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid regular expression.';
    return { ok: false, error: msg };
  }

  const ranges: MatchRange[] = [];

  if (!re.global) {
    const m = re.exec(text);
    if (m && m[0].length >= 0 && m.index !== undefined) {
      ranges.push({ start: m.index, end: m.index + m[0].length });
    }
    return { ok: true, ranges, matchCount: ranges.length };
  }

  const copy = new RegExp(re.source, re.flags);
  let m: RegExpExecArray | null;
  let guard = 0;

  while ((m = copy.exec(text)) !== null && guard < MAX_MATCHES) {
    guard += 1;
    ranges.push({ start: m.index, end: m.index + m[0].length });
    if (m[0].length === 0) {
      copy.lastIndex += 1;
    }
  }

  if (guard >= MAX_MATCHES) {
    return {
      ok: false,
      error: `Stopped after ${MAX_MATCHES.toLocaleString()} matches (possible runaway pattern).`,
    };
  }

  return { ok: true, ranges, matchCount: ranges.length };
}
