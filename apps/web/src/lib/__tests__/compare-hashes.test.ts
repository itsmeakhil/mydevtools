import { compareHashes } from '@/lib/compare-hashes';

const SHA256_ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

describe('compareHashes', () => {
  it('matches identical hex digests', () => {
    expect(compareHashes(SHA256_ABC, SHA256_ABC)).toBe(true);
  });

  it('is case-insensitive for hex digests', () => {
    expect(compareHashes(SHA256_ABC.toUpperCase(), SHA256_ABC)).toBe(true);
  });

  it('trims surrounding whitespace on both sides', () => {
    expect(compareHashes(`  ${SHA256_ABC}\n`, SHA256_ABC)).toBe(true);
  });

  it('rejects a mismatching digest', () => {
    expect(compareHashes(SHA256_ABC.replace('b', 'c'), SHA256_ABC)).toBe(false);
  });

  it('returns false when either side is empty after trimming', () => {
    expect(compareHashes('', SHA256_ABC)).toBe(false);
    expect(compareHashes('   ', SHA256_ABC)).toBe(false);
    expect(compareHashes(SHA256_ABC, '')).toBe(false);
  });

  it('compares non-hex values (e.g. Base64 MACs) case-sensitively', () => {
    expect(compareHashes('fri74GHkgmQ+ZbTd6bgKfg==', 'fri74GHkgmQ+ZbTd6bgKfg==')).toBe(true);
    expect(compareHashes('FRI74GHKGMQ+ZBTD6BGKFG==', 'fri74GHkgmQ+ZbTd6bgKfg==')).toBe(false);
  });

  it('compares bcrypt strings exactly (the $ prefix keeps them off the hex path)', () => {
    const h = '$2b$10$N9qo8uLOickgx2ZMRZoMye';
    expect(compareHashes(h, h)).toBe(true);
    expect(compareHashes(h.toUpperCase(), h)).toBe(false);
  });
});
