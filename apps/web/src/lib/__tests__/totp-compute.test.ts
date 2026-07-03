import { computeTotp } from '@/lib/totp-compute';

const ascii = (s: string) => new TextEncoder().encode(s);

// RFC 6238 Appendix B reference seeds (ASCII).
const SEED_SHA1 = ascii('12345678901234567890'); // 20 bytes
const SEED_SHA256 = ascii('12345678901234567890123456789012'); // 32 bytes
const SEED_SHA512 = ascii(
  '1234567890123456789012345678901234567890123456789012345678901234'
); // 64 bytes

// RFC 6238 Appendix B test vectors: [timeSec, sha1, sha256, sha512] — 8 digits, 30 s period.
const VECTORS: [number, string, string, string][] = [
  [59, '94287082', '46119246', '90693936'],
  [1111111109, '07081804', '68084774', '25091201'],
  [1111111111, '14050471', '67062674', '99943326'],
  [1234567890, '89005924', '91819424', '93441116'],
  [2000000000, '69279037', '90698825', '38618901'],
  [20000000000, '65353130', '77737706', '47863826'],
];

describe('computeTotp', () => {
  it.each(VECTORS)('RFC 6238 SHA-1 vector at t=%ss', async (t, sha1) => {
    await expect(computeTotp(SEED_SHA1, t * 1000, 30, 8, 'SHA-1')).resolves.toBe(sha1);
  });

  it.each(VECTORS)('RFC 6238 SHA-256 vector at t=%ss', async (t, _sha1, sha256) => {
    await expect(computeTotp(SEED_SHA256, t * 1000, 30, 8, 'SHA-256')).resolves.toBe(sha256);
  });

  it.each(VECTORS)('RFC 6238 SHA-512 vector at t=%ss', async (t, _sha1, _sha256, sha512) => {
    await expect(computeTotp(SEED_SHA512, t * 1000, 30, 8, 'SHA-512')).resolves.toBe(sha512);
  });

  it('defaults to SHA-1 when no algorithm is given (regression guard)', async () => {
    // 6-digit truncation of the t=59 SHA-1 vector — the exact behavior every
    // existing caller (totp-generator, password-manager) relies on today.
    await expect(computeTotp(SEED_SHA1, 59_000, 30, 6)).resolves.toBe('287082');
    expect(await computeTotp(SEED_SHA1, 59_000, 30, 6)).toBe(
      await computeTotp(SEED_SHA1, 59_000, 30, 6, 'SHA-1')
    );
  });

  it('supports 15 s and 60 s periods', async () => {
    const at = 1234567890 * 1000; // a 15 s window boundary
    await expect(computeTotp(SEED_SHA1, at, 15, 6)).resolves.toBe('646852');
    await expect(computeTotp(SEED_SHA1, at + 14_000, 15, 6)).resolves.toBe('646852'); // same window
    await expect(computeTotp(SEED_SHA1, at + 15_000, 15, 6)).resolves.toBe('182526'); // next window
    await expect(computeTotp(SEED_SHA1, at, 60, 6)).resolves.toBe('713351');
  });
});
