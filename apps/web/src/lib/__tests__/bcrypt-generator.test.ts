import {
  hashPassword,
  parseBcryptHash,
  verifyPassword,
} from '@/lib/bcrypt-generator';

// Cost 4 (the bcrypt minimum) keeps async hashing fast in CI.
const COST = 4;

describe('parseBcryptHash', () => {
  it('parses a known bcrypt hash into its segments', () => {
    const known = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
    expect(parseBcryptHash(known)).toEqual({
      version: '2a',
      cost: 10,
      salt: 'N9qo8uLOickgx2ZMRZoMye',
      digest: 'IjZAgcfl7p92ldGxad68LJZdL17lhWy',
    });
  });

  it('tolerates surrounding whitespace', () => {
    const known = '  $2b$12$C6UzMDM.H6dfI/f/IKcEeO6z9CzXq0V1t9QqLZxLqDgD0zKqXKPKS ';
    expect(parseBcryptHash(known)?.version).toBe('2b');
    expect(parseBcryptHash(known)?.cost).toBe(12);
  });

  it('returns null for malformed input', () => {
    expect(parseBcryptHash('')).toBeNull();
    expect(parseBcryptHash('not a hash')).toBeNull();
    expect(parseBcryptHash('$2a$10$tooShort')).toBeNull();
    // md5-crypt style prefix
    expect(parseBcryptHash('$1$abcdefgh$abcdefghijklmnopqrstu')).toBeNull();
    // invalid cost (out of 4..31 range)
    expect(
      parseBcryptHash('$2a$99$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
    ).toBeNull();
    // salt segment one char short
    expect(
      parseBcryptHash('$2a$10$N9qo8uLOickgx2ZMRZoMyIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
    ).toBeNull();
  });
});

describe('hashPassword / verifyPassword', () => {
  it('round-trips: a generated hash verifies the original password', async () => {
    const hash = await hashPassword('s3cret-Pa$$word', COST);
    const parsed = parseBcryptHash(hash);
    expect(parsed).not.toBeNull();
    expect(parsed!.cost).toBe(COST);
    await expect(verifyPassword('s3cret-Pa$$word', hash)).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('correct horse', COST);
    await expect(verifyPassword('wrong horse', hash)).resolves.toBe(false);
  });

  it('produces different hashes for the same password (random salt)', async () => {
    const [a, b] = await Promise.all([
      hashPassword('same input', COST),
      hashPassword('same input', COST),
    ]);
    expect(a).not.toBe(b);
    await expect(verifyPassword('same input', a)).resolves.toBe(true);
    await expect(verifyPassword('same input', b)).resolves.toBe(true);
  });

  it('handles empty and unicode passwords', async () => {
    const empty = await hashPassword('', COST);
    await expect(verifyPassword('', empty)).resolves.toBe(true);
    await expect(verifyPassword('x', empty)).resolves.toBe(false);

    const unicode = await hashPassword('pässwörd 😀', COST);
    await expect(verifyPassword('pässwörd 😀', unicode)).resolves.toBe(true);
  });

  it('throws for an out-of-range cost factor', async () => {
    await expect(hashPassword('pw', 3)).rejects.toThrow();
    await expect(hashPassword('pw', 32)).rejects.toThrow();
    await expect(hashPassword('pw', 10.5)).rejects.toThrow();
  });

  it('returns false (does not throw) when verifying against malformed hashes', async () => {
    await expect(verifyPassword('pw', '')).resolves.toBe(false);
    await expect(verifyPassword('pw', 'garbage')).resolves.toBe(false);
    await expect(verifyPassword('pw', '$2a$10$short')).resolves.toBe(false);
  });
});
