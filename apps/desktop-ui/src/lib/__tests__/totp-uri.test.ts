import { buildOtpauthUri, parseOtpauthUri } from '@/lib/totp-uri';

describe('parseOtpauthUri', () => {
  it('parses a fully-specified URI', () => {
    expect(
      parseOtpauthUri(
        'otpauth://totp/Example%3Aalice%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example&algorithm=SHA256&digits=8&period=60'
      )
    ).toEqual({
      secret: 'JBSWY3DPEHPK3PXP',
      digits: 8,
      period: 60,
      algorithm: 'SHA-256',
      label: 'alice@example.com',
      issuer: 'Example',
    });
  });

  it('splits an unencoded Issuer:account label and falls back to RFC defaults', () => {
    expect(parseOtpauthUri('otpauth://totp/GitHub:octocat?secret=JBSWY3DPEHPK3PXP')).toEqual({
      secret: 'JBSWY3DPEHPK3PXP',
      digits: 6,
      period: 30,
      algorithm: 'SHA-1',
      label: 'octocat',
      issuer: 'GitHub',
    });
  });

  it('prefers the issuer query param over the label prefix', () => {
    const parsed = parseOtpauthUri(
      'otpauth://totp/Legacy:alice?secret=JBSWY3DPEHPK3PXP&issuer=Modern'
    );
    expect(parsed?.issuer).toBe('Modern');
    expect(parsed?.label).toBe('alice');
  });

  it('normalizes secret case, whitespace, and trailing padding', () => {
    expect(parseOtpauthUri('otpauth://totp/x?secret=jbswy3dp ehpk3pxp=')?.secret).toBe(
      'JBSWY3DPEHPK3PXP'
    );
  });

  it('accepts a case-insensitive totp type', () => {
    expect(parseOtpauthUri('otpauth://TOTP/x?secret=JBSWY3DPEHPK3PXP')).not.toBeNull();
  });

  it('accepts SHA-1 spelled with a dash', () => {
    expect(parseOtpauthUri('otpauth://totp/x?secret=JBSWY3DPEHPK3PXP&algorithm=SHA-1')?.algorithm).toBe('SHA-1');
  });

  it.each([
    ['plain text', 'not a uri'],
    ['wrong scheme', 'https://example.com/?secret=JBSWY3DPEHPK3PXP'],
    ['hotp type', 'otpauth://hotp/x?secret=JBSWY3DPEHPK3PXP&counter=0'],
    ['missing secret', 'otpauth://totp/x'],
    ['non-base32 secret (contains 1)', 'otpauth://totp/x?secret=ABC1'],
    ['unknown algorithm', 'otpauth://totp/x?secret=ABCD&algorithm=MD5'],
    ['zero period', 'otpauth://totp/x?secret=ABCD&period=0'],
    ['non-numeric digits', 'otpauth://totp/x?secret=ABCD&digits=abc'],
    ['empty string', ''],
  ])('returns null for %s (never throws)', (_name, uri) => {
    expect(parseOtpauthUri(uri)).toBeNull();
  });
});

describe('buildOtpauthUri', () => {
  it('builds a fully-specified URI', () => {
    expect(
      buildOtpauthUri({
        secret: 'JBSWY3DPEHPK3PXP',
        digits: 8,
        period: 60,
        algorithm: 'SHA-256',
        label: 'alice@example.com',
        issuer: 'Example',
      })
    ).toBe(
      'otpauth://totp/Example%3Aalice%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example&algorithm=SHA256&digits=8&period=60'
    );
  });

  it('applies defaults and normalizes the secret', () => {
    expect(buildOtpauthUri({ secret: 'jbswy3dp ehpk3pxp' })).toBe(
      'otpauth://totp/Account?secret=JBSWY3DPEHPK3PXP&algorithm=SHA1&digits=6&period=30'
    );
  });

  it('round-trips through parseOtpauthUri (with issuer containing a space)', () => {
    const opts = {
      secret: 'JBSWY3DPEHPK3PXP',
      digits: 8,
      period: 15,
      algorithm: 'SHA-512' as const,
      label: 'bob@example.com',
      issuer: 'My Devtools',
    };
    expect(parseOtpauthUri(buildOtpauthUri(opts))).toEqual({ ...opts });
  });

  it('round-trips without an issuer', () => {
    expect(parseOtpauthUri(buildOtpauthUri({ secret: 'JBSWY3DPEHPK3PXP', label: 'alice' }))).toEqual({
      secret: 'JBSWY3DPEHPK3PXP',
      digits: 6,
      period: 30,
      algorithm: 'SHA-1',
      label: 'alice',
      issuer: null,
    });
  });
});
