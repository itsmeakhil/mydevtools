export type JwtAlg = 'none' | 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';

export type JwtSignInput = {
  header: unknown;
  payload: unknown;
  alg: JwtAlg;
  /**
   * For HS*: UTF-8 secret
   * For RS*: PKCS8 private key PEM
   */
  signingKey?: string;
};

export type JwtVerifyInput = {
  token: string;
  /**
   * For HS*: UTF-8 secret
   * For RS*: SPKI public key PEM (or certificate PEM with a public key)
   */
  verificationKey?: string;
};

export type JwtSignResult =
  | { ok: true; token: string }
  | { ok: false; errorKey: 'invalidJson' | 'unsupportedAlg' | 'missingKey' | 'cryptoFailed' };

export type JwtVerifyResult =
  | { ok: true; valid: boolean }
  | { ok: false; errorKey: 'empty' | 'segments' | 'unsupportedAlg' | 'missingKey' | 'base64' | 'cryptoFailed' };

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  // btoa expects binary string (latin1)
  const b64 = btoa(binary);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlEncodeStringUtf8(text: string): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(text));
}

function base64UrlDecodeToBytes(segment: string): Uint8Array {
  let b64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  if (pad === 2) b64 += '==';
  else if (pad === 3) b64 += '=';
  else if (pad === 1) throw new Error('Invalid segment length');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function normalizePem(pem: string): string {
  return pem.trim().replace(/\r\n/g, '\n');
}

function pemToDerBytes(pem: string): Uint8Array {
  const text = normalizePem(pem);
  const body = text
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  if (!body) throw new Error('Empty PEM');
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function ensureRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function hmacHashForAlg(alg: JwtAlg): 'SHA-256' | 'SHA-384' | 'SHA-512' | null {
  if (alg === 'HS256') return 'SHA-256';
  if (alg === 'HS384') return 'SHA-384';
  if (alg === 'HS512') return 'SHA-512';
  return null;
}

function rsaHashForAlg(alg: JwtAlg): 'SHA-256' | 'SHA-384' | 'SHA-512' | null {
  if (alg === 'RS256') return 'SHA-256';
  if (alg === 'RS384') return 'SHA-384';
  if (alg === 'RS512') return 'SHA-512';
  return null;
}

function toExactArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  // Avoid TS/libdom incompatibilities around ArrayBufferLike vs ArrayBuffer by
  // passing an exact ArrayBuffer into Web Crypto.
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function signHmac(alg: JwtAlg, secret: string, data: Uint8Array): Promise<Uint8Array> {
  const hash = hmacHashForAlg(alg);
  if (!hash) throw new Error('Not HMAC alg');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: { name: hash } },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, toExactArrayBuffer(data));
  return new Uint8Array(sig);
}

async function verifyHmac(alg: JwtAlg, secret: string, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
  const hash = hmacHashForAlg(alg);
  if (!hash) throw new Error('Not HMAC alg');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: { name: hash } },
    false,
    ['verify']
  );
  return await crypto.subtle.verify('HMAC', key, toExactArrayBuffer(signature), toExactArrayBuffer(data));
}

async function signRsaPkcs1(alg: JwtAlg, pkcs8Pem: string, data: Uint8Array): Promise<Uint8Array> {
  const hash = rsaHashForAlg(alg);
  if (!hash) throw new Error('Not RSA alg');
  const der = pemToDerBytes(pkcs8Pem);
  const key = await crypto.subtle.importKey(
    'pkcs8',
    toExactArrayBuffer(der),
    { name: 'RSASSA-PKCS1-v1_5', hash: { name: hash } },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, toExactArrayBuffer(data));
  return new Uint8Array(sig);
}

async function verifyRsaPkcs1(alg: JwtAlg, spkiPem: string, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
  const hash = rsaHashForAlg(alg);
  if (!hash) throw new Error('Not RSA alg');
  const der = pemToDerBytes(spkiPem);
  const key = await crypto.subtle.importKey(
    'spki',
    toExactArrayBuffer(der),
    { name: 'RSASSA-PKCS1-v1_5', hash: { name: hash } },
    false,
    ['verify']
  );
  return await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    toExactArrayBuffer(signature),
    toExactArrayBuffer(data)
  );
}

export async function signJwt(input: JwtSignInput): Promise<JwtSignResult> {
  const headerObj = ensureRecord(input.header);
  if (!headerObj) return { ok: false, errorKey: 'invalidJson' };

  const payloadObj = input.payload;
  if (payloadObj === undefined) return { ok: false, errorKey: 'invalidJson' };

  const alg = input.alg;
  if (alg !== 'none' && !hmacHashForAlg(alg) && !rsaHashForAlg(alg)) {
    return { ok: false, errorKey: 'unsupportedAlg' };
  }

  // Force/align header.alg to selected alg so the output is honest.
  const finalHeader = { ...headerObj, alg };
  const headerSegment = base64UrlEncodeStringUtf8(JSON.stringify(finalHeader));
  const payloadSegment = base64UrlEncodeStringUtf8(JSON.stringify(payloadObj));
  const signingInput = `${headerSegment}.${payloadSegment}`;

  if (alg === 'none') {
    return { ok: true, token: `${signingInput}.` };
  }

  const key = input.signingKey ?? '';
  if (!key.trim()) return { ok: false, errorKey: 'missingKey' };

  try {
    const data = new TextEncoder().encode(signingInput);
    const sig =
      hmacHashForAlg(alg) ? await signHmac(alg, key, data) : await signRsaPkcs1(alg, key, data);
    const sigSegment = base64UrlEncodeBytes(sig);
    return { ok: true, token: `${signingInput}.${sigSegment}` };
  } catch {
    return { ok: false, errorKey: 'cryptoFailed' };
  }
}

export async function verifyJwt(input: JwtVerifyInput): Promise<JwtVerifyResult> {
  const trimmed = input.token.trim().replace(/^Bearer\s+/i, '');
  if (!trimmed) return { ok: false, errorKey: 'empty' };

  const parts = trimmed.split('.');
  if (parts.length !== 3) return { ok: false, errorKey: 'segments' };
  const [h, p, s] = parts;
  if (!h || !p) return { ok: false, errorKey: 'segments' };

  let header: unknown;
  try {
    const headerBytes = base64UrlDecodeToBytes(h);
    header = JSON.parse(new TextDecoder().decode(headerBytes));
  } catch {
    return { ok: false, errorKey: 'base64' };
  }

  const headerObj = ensureRecord(header);
  const alg = (headerObj?.alg ?? '') as JwtAlg;
  if (!alg || typeof alg !== 'string') return { ok: false, errorKey: 'unsupportedAlg' };

  if (alg === 'none') {
    // "none" is considered valid only if the signature segment is empty.
    return { ok: true, valid: s.length === 0 };
  }

  if (!hmacHashForAlg(alg) && !rsaHashForAlg(alg)) {
    return { ok: false, errorKey: 'unsupportedAlg' };
  }

  const key = input.verificationKey ?? '';
  if (!key.trim()) return { ok: false, errorKey: 'missingKey' };

  try {
    const data = new TextEncoder().encode(`${h}.${p}`);
    const sigBytes = s ? base64UrlDecodeToBytes(s) : new Uint8Array();
    const valid =
      hmacHashForAlg(alg) ? await verifyHmac(alg, key, data, sigBytes) : await verifyRsaPkcs1(alg, key, data, sigBytes);
    return { ok: true, valid };
  } catch {
    return { ok: false, errorKey: 'cryptoFailed' };
  }
}

