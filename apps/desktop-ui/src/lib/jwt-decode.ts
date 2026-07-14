/**
 * Client-safe JWT segment decoding (no signature verification).
 */

export type ClaimTimeInfo = {
  unix: number;
  date: Date;
  labelKey: 'issuedAt' | 'notBefore';
};

export type RelativeUnit = 'second' | 'minute' | 'hour' | 'day';

export type RelativeTime = {
  direction: 'future' | 'past';
  value: number;
  unit: RelativeUnit;
};

export type JwtExpiryInfo =
  | { kind: 'absent' }
  | {
      kind: 'present';
      unix: number;
      date: Date;
      expired: boolean;
      relative: RelativeTime;
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
  errorKey: 'empty' | 'segments' | 'base64';
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

function relativeFromNow(target: Date, now: Date): RelativeTime {
  const diffMs = target.getTime() - now.getTime();
  const future = diffMs > 0;
  const abs = Math.abs(diffMs);
  const sec = Math.round(abs / 1000);
  const direction: RelativeTime['direction'] = future ? 'future' : 'past';

  if (sec < 60) return { direction, value: sec, unit: 'second' };
  const min = Math.round(sec / 60);
  if (min < 60) return { direction, value: min, unit: 'minute' };
  const hr = Math.round(min / 60);
  if (hr < 48) return { direction, value: hr, unit: 'hour' };
  const day = Math.round(hr / 24);
  return { direction, value: day, unit: 'day' };
}

function claimInfo(
  obj: Record<string, unknown>,
  key: string,
  labelKey: ClaimTimeInfo['labelKey']
): ClaimTimeInfo | null {
  const unix = readUnixClaim(obj, key);
  if (unix === null) return null;
  const date = new Date(unix * 1000);
  if (Number.isNaN(date.getTime())) return null;
  return { unix, date, labelKey };
}

export function decodeJwt(token: string): JwtDecodeResult {
  const trimmed = token.trim().replace(/^Bearer\s+/i, '');
  if (!trimmed) {
    return { ok: false, errorKey: 'empty' };
  }

  const parts = trimmed.split('.');
  if (parts.length < 2) {
    return { ok: false, errorKey: 'segments' };
  }

  let headerRaw: string;
  let payloadRaw: string;
  try {
    headerRaw = base64UrlDecode(parts[0]!);
    payloadRaw = base64UrlDecode(parts[1]!);
  } catch {
    return { ok: false, errorKey: 'base64' };
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
    issuedAt = claimInfo(po, 'iat', 'issuedAt');
    notBefore = claimInfo(po, 'nbf', 'notBefore');
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
