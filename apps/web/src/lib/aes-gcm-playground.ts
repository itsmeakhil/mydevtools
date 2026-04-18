export type AesBits = 128 | 192 | 256;

export type RawKeyEncoding = 'auto' | 'hex' | 'base64';

/** Wire format for copy/paste between sessions (all base64 is standard, not URL-safe). */
export interface EncryptedBundle {
  v: 1;
  alg: 'AES-GCM';
  keyDerivation: 'none' | 'PBKDF2-SHA256';
  aesBits: AesBits;
  saltB64?: string;
  iter?: number;
  ivB64: string;
  cipherB64: string;
}

const IV_LEN = 12;
const SALT_LEN = 16;
export const PBKDF2_ITER_DEFAULT = 100_000;

const AES_BYTE_LEN: Record<AesBits, number> = {
  128: 16,
  192: 24,
  256: 32,
};

function bytesToB64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

function b64ToBytes(b64: string): Uint8Array {
  const normalized = b64.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const bin = atob(normalized + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function cleanHex(s: string): Uint8Array {
  const t = s.trim().replace(/^0x/i, '').replace(/\s+/g, '');
  if (t.length % 2 !== 0) throw new Error('oddHex');
  if (!/^[0-9a-fA-F]*$/.test(t)) throw new Error('invalidHex');
  const out = new Uint8Array(t.length / 2);
  for (let i = 0; i < t.length; i += 2) {
    out[i / 2] = parseInt(t.slice(i, i + 2), 16);
  }
  return out;
}

export function parseRawKeyMaterial(
  input: string,
  encoding: RawKeyEncoding,
  aesBits: AesBits
): Uint8Array {
  const need = AES_BYTE_LEN[aesBits];
  const trimmed = input.trim();
  if (!trimmed) throw new Error('emptyKey');

  let bytes: Uint8Array;
  if (encoding === 'hex') {
    bytes = cleanHex(trimmed);
  } else if (encoding === 'base64') {
    bytes = b64ToBytes(trimmed);
  } else {
    const hexLike = /^[0-9a-fA-F\s]+$/;
    const noSpaces = trimmed.replace(/\s+/g, '');
    const looksHex =
      noSpaces.length % 2 === 0 && hexLike.test(noSpaces) && /^[0-9a-fA-F]+$/.test(noSpaces);
    try {
      bytes = looksHex ? cleanHex(trimmed) : b64ToBytes(trimmed);
    } catch {
      throw new Error('badKeyMaterial');
    }
  }

  if (bytes.length !== need) {
    throw new Error('wrongKeyLength');
  }
  return bytes;
}

function u8Copy(u: Uint8Array): BufferSource {
  return new Uint8Array(u) as BufferSource;
}

async function importAesKey(raw: Uint8Array, aesBits: AesBits): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', u8Copy(raw), { name: 'AES-GCM', length: aesBits }, false, [
    'encrypt',
    'decrypt',
  ]);
}

async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
  aesBits: AesBits
): Promise<CryptoKey> {
  const enc = new TextEncoder().encode(passphrase);
  const base = await crypto.subtle.importKey('raw', enc, 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: u8Copy(salt), iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: aesBits },
    false,
    ['encrypt', 'decrypt']
  );
}

export function parseEncryptedBundle(jsonText: string): EncryptedBundle {
  let o: unknown;
  try {
    o = JSON.parse(jsonText);
  } catch {
    throw new Error('invalidJson');
  }
  if (!o || typeof o !== 'object') throw new Error('invalidBundle');
  const b = o as Record<string, unknown>;
  if (b.v !== 1 || b.alg !== 'AES-GCM') throw new Error('unsupportedVersion');
  const aesBits = b.aesBits;
  if (aesBits !== 128 && aesBits !== 192 && aesBits !== 256) throw new Error('badBits');
  const kd = b.keyDerivation;
  if (kd !== 'none' && kd !== 'PBKDF2-SHA256') throw new Error('badKdf');
  if (typeof b.ivB64 !== 'string' || typeof b.cipherB64 !== 'string') throw new Error('missingFields');
  if (kd === 'PBKDF2-SHA256') {
    if (typeof b.saltB64 !== 'string' || typeof b.iter !== 'number' || b.iter < 1) {
      throw new Error('badPbkdf2');
    }
  }
  return b as unknown as EncryptedBundle;
}

export async function encryptAesGcmPlayground(opts: {
  plaintext: string;
  mode: 'raw' | 'passphrase';
  rawKeyInput: string;
  rawKeyEncoding: RawKeyEncoding;
  passphrase: string;
  aesBits: AesBits;
  pbkdf2Iter: number;
}): Promise<EncryptedBundle> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  let key: CryptoKey;
  let bundle: EncryptedBundle;

  if (opts.mode === 'raw') {
    const raw = parseRawKeyMaterial(opts.rawKeyInput, opts.rawKeyEncoding, opts.aesBits);
    key = await importAesKey(raw, opts.aesBits);
    bundle = {
      v: 1,
      alg: 'AES-GCM',
      keyDerivation: 'none',
      aesBits: opts.aesBits,
      ivB64: bytesToB64(iv),
      cipherB64: '',
    };
  } else {
    if (!opts.passphrase) throw new Error('emptyPassphrase');
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
    const iter = Math.max(10_000, Math.min(2_000_000, Math.floor(opts.pbkdf2Iter) || PBKDF2_ITER_DEFAULT));
    key = await deriveKeyFromPassphrase(opts.passphrase, salt, iter, opts.aesBits);
    bundle = {
      v: 1,
      alg: 'AES-GCM',
      keyDerivation: 'PBKDF2-SHA256',
      aesBits: opts.aesBits,
      saltB64: bytesToB64(salt),
      iter,
      ivB64: bytesToB64(iv),
      cipherB64: '',
    };
  }

  const pt = new TextEncoder().encode(opts.plaintext);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: u8Copy(iv) }, key, pt));
  bundle.cipherB64 = bytesToB64(ct);
  return bundle;
}

export async function decryptAesGcmPlayground(
  bundle: EncryptedBundle,
  opts: {
    rawKeyInput: string;
    rawKeyEncoding: RawKeyEncoding;
    passphrase: string;
  }
): Promise<string> {
  const iv = u8Copy(b64ToBytes(bundle.ivB64));
  const ct = u8Copy(b64ToBytes(bundle.cipherB64));
  let key: CryptoKey;

  if (bundle.keyDerivation === 'none') {
    const raw = parseRawKeyMaterial(opts.rawKeyInput, opts.rawKeyEncoding, bundle.aesBits);
    key = await importAesKey(raw, bundle.aesBits);
  } else {
    if (!opts.passphrase) throw new Error('emptyPassphrase');
    const salt = b64ToBytes(bundle.saltB64!);
    const iter = bundle.iter ?? PBKDF2_ITER_DEFAULT;
    key = await deriveKeyFromPassphrase(opts.passphrase, salt, iter, bundle.aesBits);
  }

  try {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return new TextDecoder().decode(pt);
  } catch {
    throw new Error('decryptFailed');
  }
}

export function bundleToPrettyJson(bundle: EncryptedBundle): string {
  return JSON.stringify(bundle, null, 2);
}
