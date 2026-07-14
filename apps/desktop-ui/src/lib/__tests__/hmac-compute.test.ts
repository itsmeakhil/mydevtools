import { computeHmac, decodeKey } from '@/lib/hmac-compute';

describe('decodeKey', () => {
  it('encodes UTF-8 text', () => {
    expect(Array.from(decodeKey('key', 'utf8'))).toEqual([0x6b, 0x65, 0x79]);
  });

  it('decodes hex, case-insensitively, with surrounding whitespace trimmed', () => {
    expect(Array.from(decodeKey(' 0BfF ', 'hex'))).toEqual([0x0b, 0xff]);
  });

  it('throws invalid-hex on odd-length input', () => {
    expect(() => decodeKey('abc', 'hex')).toThrow('invalid-hex');
  });

  it('throws invalid-hex on non-hex characters', () => {
    expect(() => decodeKey('zz', 'hex')).toThrow('invalid-hex');
  });

  it('decodes Base64', () => {
    expect(Array.from(decodeKey('a2V5', 'base64'))).toEqual([0x6b, 0x65, 0x79]);
  });

  it('throws invalid-base64 on bad characters or bad length', () => {
    expect(() => decodeKey('!!!', 'base64')).toThrow('invalid-base64');
    expect(() => decodeKey('abcde', 'base64')).toThrow('invalid-base64');
  });

  it('returns an empty key for empty input in every encoding', () => {
    expect(decodeKey('', 'utf8')).toHaveLength(0);
    expect(decodeKey('', 'hex')).toHaveLength(0);
    expect(decodeKey('', 'base64')).toHaveLength(0);
  });
});

describe('computeHmac key encodings', () => {
  it('default utf8 path is unchanged (regression vector)', async () => {
    await expect(
      computeHmac('SHA-256', 'key', 'The quick brown fox jumps over the lazy dog', 'hex')
    ).resolves.toBe('f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8');
  });

  it('hex key matches RFC 4231 test case 1', async () => {
    await expect(
      computeHmac('SHA-256', '0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b', 'Hi There', 'hex', 'hex')
    ).resolves.toBe('b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7');
  });

  it('a Base64 key equals the equivalent UTF-8 key', async () => {
    const viaUtf8 = await computeHmac('SHA-256', 'key', 'msg', 'hex');
    const viaB64 = await computeHmac('SHA-256', 'a2V5', 'msg', 'hex', 'base64');
    expect(viaB64).toBe(viaUtf8);
  });
});
