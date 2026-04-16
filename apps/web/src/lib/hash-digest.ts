import bcrypt from 'bcryptjs';
import md5 from 'js-md5';

/** Digest algorithms (byte input, hex output). */
export type DigestAlgorithmId = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

export type HashAlgorithmId = DigestAlgorithmId | 'BCRYPT';

export const DIGEST_ALGORITHMS: readonly DigestAlgorithmId[] = [
  'MD5',
  'SHA-1',
  'SHA-256',
  'SHA-384',
  'SHA-512',
] as const;

export const HASH_ALGORITHMS: readonly HashAlgorithmId[] = [...DIGEST_ALGORITHMS, 'BCRYPT'] as const;

function bufferToHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

/**
 * Hash raw bytes. MD5 uses js-md5; SHA-* uses Web Crypto.
 */
export async function computeHash(algorithm: DigestAlgorithmId, data: Uint8Array): Promise<string> {
  if (algorithm === 'MD5') {
    return md5(data);
  }

  const subtleAlg = algorithm;
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  const hash = await crypto.subtle.digest(subtleAlg, copy);
  return bufferToHex(hash);
}

/**
 * Bcrypt password hash (string in, bcrypt string out). Uses a random salt each time.
 */
export async function computeBcrypt(password: string, rounds: number): Promise<string> {
  return bcrypt.hash(password, rounds);
}
