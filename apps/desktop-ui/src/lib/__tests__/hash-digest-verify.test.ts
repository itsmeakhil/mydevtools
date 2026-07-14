import { computeBcrypt, verifyBcrypt } from '@/lib/hash-digest';
import { compareHashes } from '@/lib/compare-hashes';

describe('verifyBcrypt', () => {
  it('matches the original password against its hash', async () => {
    const hash = await computeBcrypt('correct horse battery staple', 4);
    await expect(verifyBcrypt('correct horse battery staple', hash)).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await computeBcrypt('correct horse battery staple', 4);
    await expect(verifyBcrypt('Tr0ub4dor&3', hash)).resolves.toBe(false);
  });

  it('resolves false (never throws) for a malformed hash', async () => {
    await expect(verifyBcrypt('anything', 'not-a-bcrypt-hash')).resolves.toBe(false);
  });

  it('documents why string equality is the wrong tool for bcrypt', async () => {
    const a = await computeBcrypt('same password', 4);
    const b = await computeBcrypt('same password', 4);
    expect(a).not.toBe(b); // random salt per hash
    expect(compareHashes(a, b)).toBe(false); // so verify mode must use bcrypt.compare
  });
});
