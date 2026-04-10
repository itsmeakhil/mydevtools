import { format, formatDistanceToNow, getUnixTime, isValid, parseISO } from 'date-fns';

export type ParsedTimestamp = { ok: true; date: Date };
export type ParseError = { ok: false; error: string };
export type ParseTimestampResult = ParsedTimestamp | ParseError;

/**
 * Parse Unix (seconds if ≤10 digits, else ms), ISO-8601, or `Date`-parsable strings.
 */
export function parseTimestampInput(raw: string): ParseTimestampResult {
  const s = raw.trim();
  if (!s) {
    return { ok: false, error: 'Enter a Unix timestamp, ISO string, or date text.' };
  }

  if (/^-?\d+$/.test(s)) {
    const n = Number(s);
    if (!Number.isFinite(n)) {
      return { ok: false, error: 'Invalid numeric timestamp.' };
    }
    const absDigits = s.replace(/^-/, '').length;
    const ms = absDigits <= 10 ? n * 1000 : n;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) {
      return { ok: false, error: 'Out of range for JavaScript Date.' };
    }
    return { ok: true, date: d };
  }

  const fromIso = parseISO(s);
  if (isValid(fromIso)) {
    return { ok: true, date: fromIso };
  }

  const fromNative = new Date(s);
  if (isValid(fromNative)) {
    return { ok: true, date: fromNative };
  }

  return {
    ok: false,
    error: 'Could not parse as Unix time, ISO-8601, or browser date string.',
  };
}

export type TimestampFormats = {
  unixSeconds: string;
  unixMs: string;
  isoUtc: string;
  isoLocal: string;
  utcDisplay: string;
  localDisplay: string;
  relative: string;
};

export function formatTimestampAll(d: Date): TimestampFormats {
  const unixSeconds = String(getUnixTime(d));
  const unixMs = String(d.getTime());

  return {
    unixSeconds,
    unixMs,
    isoUtc: d.toISOString(),
    isoLocal: format(d, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
    utcDisplay: d.toUTCString(),
    localDisplay: d.toString(),
    relative: formatDistanceToNow(d, { addSuffix: true }),
  };
}
