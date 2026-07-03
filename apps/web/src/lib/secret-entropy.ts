/** Strength buckets for a generated secret, by total entropy bits. */
export type SecretStrength = 'weak' | 'fair' | 'strong';

/**
 * Total entropy in bits of a uniformly random string of `length` symbols
 * drawn from an alphabet of `alphabetSize` unique characters:
 * `length * log2(alphabetSize)`.
 *
 * Returns 0 for degenerate inputs (alphabet < 2 symbols, non-positive or
 * non-finite length) — a 1-symbol alphabet carries no entropy per character.
 */
export function entropyBits(alphabetSize: number, length: number): number {
  if (!Number.isFinite(alphabetSize) || alphabetSize < 2) return 0;
  if (!Number.isFinite(length) || length <= 0) return 0;
  return length * Math.log2(alphabetSize);
}

/**
 * Buckets entropy bits into a strength label:
 * < 64 weak · 64 to <128 fair · >= 128 strong.
 * 128 bits matches the AES-128 keyspace — the conventional "computationally
 * infeasible" bar; 64 bits is brute-forceable by a determined attacker.
 */
export function strengthBucket(bits: number): SecretStrength {
  if (bits >= 128) return 'strong';
  if (bits >= 64) return 'fair';
  return 'weak';
}
