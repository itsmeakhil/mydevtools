import type { SearchMode } from "./types";

/**
 * Auto-detect the most appropriate search mode based on the input pattern.
 * - If it contains regex metacharacters (^, $, ., +, (, ), [, {, |, \) → regex
 * - If it contains glob wildcards (* or ?) → glob
 * - Otherwise → fuzzy
 */
export function detectSearchMode(input: string): SearchMode {
  // Regex-specific characters that go beyond glob
  const regexChars = /[^*?][.+()[\]{}|\\^$]|^[.+()[\]{}|\\^$]/;
  if (regexChars.test(input) || /\\./.test(input) || /\^|\$/.test(input)) {
    return "regex";
  }
  if (/[*?]/.test(input)) {
    return "glob";
  }
  return "fuzzy";
}

/**
 * Glob pattern matching. Supports * (any chars) and ? (single char).
 * Returns the keys that match the pattern.
 */
export function globMatch(keys: string[], pattern: string): string[] {
  // Convert glob pattern to regex
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // escape regex metacharacters
    .replace(/\*/g, ".*")                   // * → .*
    .replace(/\?/g, ".");                   // ? → .
  const re = new RegExp(`^${escaped}$`, "i");
  return keys.filter((k) => re.test(k));
}

/**
 * Regex pattern matching.
 * Returns { matches, error }.
 */
export function regexMatch(
  keys: string[],
  pattern: string
): { matches: string[]; error: string | null } {
  try {
    const re = new RegExp(pattern, "i");
    return { matches: keys.filter((k) => re.test(k)), error: null };
  } catch (e) {
    return {
      matches: [],
      error: e instanceof Error ? e.message : "Invalid regex",
    };
  }
}

/**
 * Fuzzy matching: all characters of the pattern must appear in order in the key.
 * Case-insensitive.
 */
export function fuzzyMatch(keys: string[], pattern: string): string[] {
  const lower = pattern.toLowerCase();
  return keys.filter((k) => {
    const key = k.toLowerCase();
    let pi = 0;
    for (let i = 0; i < key.length && pi < lower.length; i++) {
      if (key[i] === lower[pi]) pi++;
    }
    return pi === lower.length;
  });
}

/**
 * Get the indices within a key string that match the fuzzy pattern.
 * Useful for highlight rendering (future use).
 */
export function getMatchIndices(key: string, pattern: string): number[] {
  const indices: number[] = [];
  const lower = pattern.toLowerCase();
  const keyLower = key.toLowerCase();
  let pi = 0;
  for (let i = 0; i < keyLower.length && pi < lower.length; i++) {
    if (keyLower[i] === lower[pi]) {
      indices.push(i);
      pi++;
    }
  }
  return pi === lower.length ? indices : [];
}
