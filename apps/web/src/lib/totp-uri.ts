import type { TotpAlgorithm } from '@/lib/totp-compute';

export interface ParsedOtpauth {
  secret: string;
  digits: number;
  period: number;
  algorithm: TotpAlgorithm;
  label: string;
  issuer: string | null;
}

const ALGORITHM_MAP: Record<string, TotpAlgorithm> = {
  SHA1: 'SHA-1',
  SHA256: 'SHA-256',
  SHA512: 'SHA-512',
};

/**
 * Parse an otpauth:// provisioning URI (Google Authenticator Key URI format).
 * Returns null for anything that is not a well-formed otpauth://totp URI —
 * never throws. Missing optional params fall back to the RFC defaults
 * (6 digits, 30 s period, SHA-1). The `issuer` query param wins over an
 * "Issuer:account" label prefix; `label` is the account part only.
 */
export function parseOtpauthUri(uri: string): ParsedOtpauth | null {
  let url: URL;
  try {
    url = new URL(uri.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'otpauth:' || url.host.toLowerCase() !== 'totp') {
    return null;
  }

  const rawSecret = url.searchParams.get('secret');
  if (!rawSecret) return null;
  const secret = rawSecret.replace(/[\s-]/g, '').replace(/=+$/, '').toUpperCase();
  if (!/^[A-Z2-7]+$/.test(secret)) return null;

  const rawDigits = url.searchParams.get('digits');
  const digits = rawDigits === null ? 6 : Number(rawDigits);
  if (!Number.isInteger(digits) || digits < 4 || digits > 10) return null;

  const rawPeriod = url.searchParams.get('period');
  const period = rawPeriod === null ? 30 : Number(rawPeriod);
  if (!Number.isInteger(period) || period <= 0) return null;

  const rawAlgorithm = url.searchParams.get('algorithm');
  const algorithm =
    rawAlgorithm === null
      ? 'SHA-1'
      : ALGORITHM_MAP[rawAlgorithm.toUpperCase().replace(/-/g, '')];
  if (!algorithm) return null;

  let label: string;
  try {
    label = decodeURIComponent(url.pathname.replace(/^\//, '')).trim();
  } catch {
    return null;
  }
  let issuer = url.searchParams.get('issuer');
  const colon = label.indexOf(':');
  if (colon !== -1) {
    issuer = issuer ?? label.slice(0, colon).trim();
    label = label.slice(colon + 1).trim();
  }

  return { secret, digits, period, algorithm, label, issuer };
}
