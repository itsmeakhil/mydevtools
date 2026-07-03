const HEX_RE = /^[0-9a-fA-F]+$/;

/**
 * Compare an expected hash/MAC string against a computed one.
 *
 * Trims both sides. If both look like hex digests, comparison is
 * case-insensitive; anything else (Base64 MACs, bcrypt strings — Base64
 * padding "=" and bcrypt "$" keep them off the hex path) compares exactly.
 *
 * NOT constant-time, deliberately: this is a UI convenience for eyeballing a
 * pasted value against one already rendered in the same browser tab — there
 * is no secret to protect from a timing side channel here.
 */
export function compareHashes(expected: string, actual: string): boolean {
  const a = expected.trim();
  const b = actual.trim();
  if (!a || !b) return false;
  if (HEX_RE.test(a) && HEX_RE.test(b)) {
    return a.toLowerCase() === b.toLowerCase();
  }
  return a === b;
}
