const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Decode a Google Authenticator–style Base32 secret (RFC 4648, no padding required).
 */
export function decodeBase32Secret(secret: string): Uint8Array {
  const cleaned = secret.replace(/[\s-]/g, '').toUpperCase();
  if (!cleaned) {
    throw new Error('empty');
  }
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const c of cleaned) {
    const idx = BASE32.indexOf(c);
    if (idx === -1) {
      throw new Error('invalid');
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

export function getTotpSecondsRemaining(epochMs: number, periodSec: number): number {
  return periodSec - (Math.floor(epochMs / 1000) % periodSec);
}

/**
 * RFC 6238 TOTP with SHA-1 (default used by Google Authenticator and most services).
 */
export async function computeTotp(
  secretBytes: Uint8Array,
  epochMs: number,
  periodSec: number,
  digits: number
): Promise<string> {
  const step = Math.floor(epochMs / 1000 / periodSec);
  const counter = new ArrayBuffer(8);
  const view = new DataView(counter);
  const high = Math.floor(step / 0x1_0000_0000);
  const low = step >>> 0;
  view.setUint32(0, high);
  view.setUint32(4, low);

  const keyMaterial = new Uint8Array(secretBytes).buffer as ArrayBuffer;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, counter));
  const offset = sig[sig.length - 1] & 0xf;
  const bin =
    ((sig[offset] & 0x7f) << 24) |
    ((sig[offset + 1] & 0xff) << 16) |
    ((sig[offset + 2] & 0xff) << 8) |
    (sig[offset + 3] & 0xff);
  const mod = 10 ** digits;
  const code = bin % mod;
  return code.toString().padStart(digits, '0');
}
