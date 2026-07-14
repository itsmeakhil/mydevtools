export type HmacDigestId = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

export type HmacKeyEncoding = 'utf8' | 'hex' | 'base64';

export const HMAC_DIGESTS: readonly HmacDigestId[] = [
  'SHA-256',
  'SHA-384',
  'SHA-512',
  'SHA-1',
] as const;

const HEX_KEY_RE = /^[0-9a-fA-F]*$/;
const BASE64_KEY_RE = /^[A-Za-z0-9+/]*={0,2}$/;

function bufferToHexLower(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decode a signing key from its textual representation to raw bytes.
 * Throws Error('invalid-hex') / Error('invalid-base64') so the UI can map
 * failures to a translated message.
 */
export function decodeKey(key: string, encoding: HmacKeyEncoding): Uint8Array {
  if (encoding === 'utf8') {
    return new TextEncoder().encode(key);
  }
  const clean = key.trim();
  if (encoding === 'hex') {
    if (clean.length % 2 !== 0 || !HEX_KEY_RE.test(clean)) {
      throw new Error('invalid-hex');
    }
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < out.length; i++) {
      out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
  }
  if (clean.length % 4 !== 0 || !BASE64_KEY_RE.test(clean)) {
    throw new Error('invalid-base64');
  }
  const binary = atob(clean);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

// Avoid TS/libdom incompatibilities around ArrayBufferLike vs ArrayBuffer by
// passing an exact ArrayBuffer into Web Crypto (matches the pattern used in
// jwt-jws.ts / workspace-crypto.ts elsewhere in this repo).
function toExactArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/**
 * HMAC over the message (UTF-8). The secret is decoded per `keyEncoding`
 * (default UTF-8, matching the original behavior). Output hex (lowercase)
 * or standard Base64.
 */
export async function computeHmac(
  digest: HmacDigestId,
  secret: string,
  message: string,
  output: 'hex' | 'base64',
  keyEncoding: HmacKeyEncoding = 'utf8'
): Promise<string> {
  const keyData = decodeKey(secret, keyEncoding);
  const msgData = new TextEncoder().encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    toExactArrayBuffer(keyData),
    { name: 'HMAC', hash: digest },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  return output === 'hex' ? bufferToHexLower(sig) : bufferToBase64(sig);
}
