export type HmacDigestId = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

export const HMAC_DIGESTS: readonly HmacDigestId[] = [
  'SHA-256',
  'SHA-384',
  'SHA-512',
  'SHA-1',
] as const;

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
 * HMAC over UTF-8 secret and message. Output hex (lowercase) or standard Base64.
 */
export async function computeHmac(
  digest: HmacDigestId,
  secret: string,
  message: string,
  output: 'hex' | 'base64'
): Promise<string> {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret);
  const msgData = enc.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: digest },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  return output === 'hex' ? bufferToHexLower(sig) : bufferToBase64(sig);
}
