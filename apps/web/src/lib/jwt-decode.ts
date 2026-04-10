/**
 * Client-safe JWT segment decoding (no signature verification).
 */

export type ClaimTimeInfo = {
  unix: number;
  date: Date;
  label: string;
};

export type JwtExpiryInfo =
  | { kind: 'absent' }
  | {
      kind: 'present';
      unix: number;
      date: Date;
      expired: boolean;
      relative: string;
    };

export type JwtDecodeSuccess = {
  ok: true;
  headerRaw: string;
  payloadRaw: string;
  headerFormatted: string;
  payloadFormatted: string;
  headerParsed: unknown;
  payloadParsed: unknown;
  expiry: JwtExpiryInfo;
  issuedAt: ClaimTimeInfo | null;
  notBefore: ClaimTimeInfo | null;
  hasSignature: boolean;
};

export type JwtDecodeFailure = {
  ok: false;
  error: string;
};

export type JwtDecodeResult = JwtDecodeSuccess | JwtDecodeFailure;

function base64UrlDecode(segment: string): string {
  let b64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  if (pad === 2) b64 += '==';
  else if (pad === 3) b64 += '=';
  else if (pad === 1) throw new Error('Invalid segment length');
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

function readUnixClaim(obj: Record<string, unknown>, key: string): number | null {
  const v = obj[key];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && /^\d+(\.\d+)?$/.test(v)) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function formatPrettyJson(text: string): { formatted: string; parsed: unknown } {
  const parsed = JSON.parse(text);
  return { formatted: JSON.stringify(parsed, null, 2), parsed };
}

function relativeFromNow(target: Date, now: Date): string {
  const diffMs = target.getTime() - now.getTime();
  const future = diffMs > 0;
  const abs = Math.abs(diffMs);
  const sec = Math.round(abs / 1000);

  const phrase = (n: number, one: string, many: string) => {
    const w = n === 1 ? one : many;
    return future ? `in ${n} ${w}` : `${n} ${w} ago`;
  };

  if (sec < 60) return phrase(sec, 'second', 'seconds');
  const min = Math.round(sec / 60);
  if (min < 60) return phrase(min, 'minute', 'minutes');
  const hr = Math.round(min / 60);
  if (hr < 48) return phrase(hr, 'hour', 'hours');
  const day = Math.round(hr / 24);
  return phrase(day, 'day', 'days');
}

function claimInfo(
  obj: Record<string, unknown>,
  key: string,
  label: string
): ClaimTimeInfo | null {
  const unix = readUnixClaim(obj, key);
  if (unix === null) return null;
  const date = new Date(unix * 1000);
  if (Number.isNaN(date.getTime())) return null;
  return { unix, date, label };
}

export function decodeJwt(token: string): JwtDecodeResult {
  const trimmed = token.trim().replace(/^Bearer\s+/i, '');
  if (!trimmed) {
    return { ok: false, error: 'Paste a JWT to decode.' };
  }

  const parts = trimmed.split('.');
  if (parts.length < 2) {
    return { ok: false, error: 'A JWT needs at least a header and payload (two segments).' };
  }

  let headerRaw: string;
  let payloadRaw: string;
  try {
    headerRaw = base64UrlDecode(parts[0]!);
    payloadRaw = base64UrlDecode(parts[1]!);
  } catch {
    return { ok: false, error: 'Could not base64url-decode header or payload.' };
  }

  let headerFormatted: string;
  let headerParsed: unknown;
  try {
    const p = formatPrettyJson(headerRaw);
    headerFormatted = p.formatted;
    headerParsed = p.parsed;
  } catch {
    headerFormatted = headerRaw;
    headerParsed = null;
  }

  let payloadFormatted: string;
  let payloadParsed: unknown;
  try {
    const p = formatPrettyJson(payloadRaw);
    payloadFormatted = p.formatted;
    payloadParsed = p.parsed;
  } catch {
    payloadFormatted = payloadRaw;
    payloadParsed = null;
  }

  const now = new Date();
  let expiry: JwtExpiryInfo = { kind: 'absent' };
  let issuedAt: ClaimTimeInfo | null = null;
  let notBefore: ClaimTimeInfo | null = null;

  if (payloadParsed && typeof payloadParsed === 'object' && payloadParsed !== null) {
    const po = payloadParsed as Record<string, unknown>;
    const expUnix = readUnixClaim(po, 'exp');
    if (expUnix !== null) {
      const date = new Date(expUnix * 1000);
      if (!Number.isNaN(date.getTime())) {
        expiry = {
          kind: 'present',
          unix: expUnix,
          date,
          expired: date.getTime() <= now.getTime(),
          relative: relativeFromNow(date, now),
        };
      }
    }
    issuedAt = claimInfo(po, 'iat', 'Issued at (iat)');
    notBefore = claimInfo(po, 'nbf', 'Not before (nbf)');
  }

  return {
    ok: true,
    headerRaw,
    payloadRaw,
    headerFormatted,
    payloadFormatted,
    headerParsed,
    payloadParsed,
    expiry,
    issuedAt,
    notBefore,
    hasSignature: parts.length >= 3 && parts[2]!.length > 0,
  };
}
