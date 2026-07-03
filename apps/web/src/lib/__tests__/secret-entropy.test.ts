import { entropyBits, strengthBucket } from '../secret-entropy';

describe('entropyBits', () => {
  it('is length * log2(alphabetSize)', () => {
    expect(entropyBits(2, 8)).toBe(8);
    expect(entropyBits(16, 32)).toBe(128); // 32 hex chars = 128 bits
    expect(entropyBits(64, 32)).toBe(192); // base64url
  });

  it('handles non-power-of-two alphabets', () => {
    // 62-char alphanumeric, 32 chars ≈ 190.53 bits
    expect(entropyBits(62, 32)).toBeCloseTo(32 * Math.log2(62), 10);
  });

  it('returns 0 for degenerate inputs', () => {
    expect(entropyBits(0, 32)).toBe(0);
    expect(entropyBits(1, 32)).toBe(0); // 1-symbol alphabet carries no entropy
    expect(entropyBits(62, 0)).toBe(0);
    expect(entropyBits(62, -5)).toBe(0);
    expect(entropyBits(62, NaN)).toBe(0); // Number('') from the length input
    expect(entropyBits(NaN, 32)).toBe(0);
  });
});

describe('strengthBucket', () => {
  it('buckets at the 64 / 128 boundaries', () => {
    expect(strengthBucket(0)).toBe('weak');
    expect(strengthBucket(63.999)).toBe('weak');
    expect(strengthBucket(64)).toBe('fair');
    expect(strengthBucket(127.999)).toBe('fair');
    expect(strengthBucket(128)).toBe('strong');
    expect(strengthBucket(512)).toBe('strong');
  });
});
