<<<<<<< HEAD
/**
 * Search utilities for Redis Commander key search feature
 * Supports glob, regex, and fuzzy pattern matching with automatic mode detection
 */

/**
 * Search mode type definition
 */
export type SearchMode = 'glob' | 'regex' | 'fuzzy';

/**
 * Result type for regex matching with optional error
 */
export interface RegexMatchResult {
  keys: string[];
  error?: string;
}

/**
 * Match indices type for highlighting search results
 */
export interface MatchIndices {
  [key: string]: number[];
}

/**
 * Detects which search mode to use based on the pattern
 * Priority: glob > regex > fuzzy
 *
 * Glob patterns: contain * or ?
 * Regex patterns: contain regex metacharacters like [], ^, $, {}, (), |
 * Fuzzy patterns: simple strings without special characters
 */
export function detectSearchMode(pattern: string): SearchMode {
  // Check for glob patterns first (highest priority)
  if (pattern.includes('*') || pattern.includes('?')) {
    return 'glob';
  }

  // Check for regex patterns
  // Regex metacharacters: ^, $, [], (), {}, |, ., +, \
  const regexMetaChars = /[\[\](){}^$|+\\]/;
  if (regexMetaChars.test(pattern)) {
    return 'regex';
  }

  // Default to fuzzy
  return 'fuzzy';
}

/**
 * Converts glob pattern to regex
 * * matches any number of characters
 * ? matches exactly one character
 * All other regex special chars are escaped
 */
function globToRegex(pattern: string): RegExp {
  // Escape all regex special characters except * and ?
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');

  // Replace glob patterns with regex equivalents
  // ? matches exactly one character
  const withQuestionMark = escaped.replace(/\?/g, '.');
  // * matches any characters
  const withStar = withQuestionMark.replace(/\*/g, '.*');

  // Create regex with ^ and $ anchors for exact matching
  return new RegExp(`^${withStar}$`);
}

/**
 * Glob pattern matching
 * Supports * (any characters) and ? (single character) wildcards
 */
export function globMatch(keys: string[], pattern: string): string[] {
  const regex = globToRegex(pattern);
  return keys.filter((key) => regex.test(key));
}

/**
 * Regex pattern matching with error handling
=======
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
>>>>>>> 225d711942b1e1bfa9de978da2b96b412a61198a
 */
export function regexMatch(
  keys: string[],
  pattern: string
<<<<<<< HEAD
): RegexMatchResult {
  try {
    const regex = new RegExp(pattern);
    const matchedKeys = keys.filter((key) => regex.test(key));
    return { keys: matchedKeys };
  } catch (error) {
    return {
      keys: [],
      error: error instanceof Error ? error.message : 'Invalid regex pattern',
=======
): { matches: string[]; error: string | null } {
  try {
    const re = new RegExp(pattern, "i");
    return { matches: keys.filter((k) => re.test(k)), error: null };
  } catch (e) {
    return {
      matches: [],
      error: e instanceof Error ? e.message : "Invalid regex",
>>>>>>> 225d711942b1e1bfa9de978da2b96b412a61198a
    };
  }
}

/**
<<<<<<< HEAD
 * Fuzzy pattern matching
 * All characters in the pattern must appear in the key in order (case-insensitive)
 */
export function fuzzyMatch(keys: string[], pattern: string): string[] {
  const patternLower = pattern.toLowerCase();

  return keys.filter((key) => {
    const keyLower = key.toLowerCase();
    let patternIndex = 0;

    for (let keyIndex = 0; keyIndex < keyLower.length; keyIndex++) {
      if (keyLower[keyIndex] === patternLower[patternIndex]) {
        patternIndex++;
        if (patternIndex === patternLower.length) {
          return true;
        }
      }
    }

    return false;
=======
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
>>>>>>> 225d711942b1e1bfa9de978da2b96b412a61198a
  });
}

/**
<<<<<<< HEAD
 * Gets match indices for highlighting
 * For glob/regex: returns the span of the matched portion
 * For fuzzy: returns the character indices of matched characters
=======
 * Get the indices within a key string that match the fuzzy pattern.
 * Returns an array of individual character positions.
 */
export function getFuzzyMatchIndices(key: string, pattern: string): number[] {
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

/**
 * Get the indices within a key string that match the glob pattern.
 * Returns [start, end] if matched, otherwise empty array.
 */
export function getGlobMatchIndices(key: string, pattern: string): number[] {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  const re = new RegExp(`^${escaped}$`, "i");

  if (!re.test(key)) return [];

  // Find the matching portion by converting glob pattern to actual matched segments
  // For simplicity, we'll find the first wildcard expansion match
  const keyLower = key.toLowerCase();

  // Try to find where the glob pattern matches
  // Build a simpler version: find the literal parts and their positions
  const parts = pattern.split(/[\*\?]+/);
  if (parts.length === 0) return [];

  // Find start: position of first literal part
  let start = 0;
  let end = keyLower.length;

  // Find the first non-empty part
  const firstPart = parts.find(p => p.length > 0);
  if (firstPart) {
    const idx = keyLower.indexOf(firstPart.toLowerCase());
    if (idx >= 0) {
      start = idx;
      end = idx + firstPart.length;
    }
  }

  return [start, end];
}

/**
 * Get the indices within a key string that match the regex pattern.
 * Returns [start, end] if matched, otherwise empty array.
 */
export function getRegexMatchIndices(key: string, pattern: string): number[] {
  try {
    const re = new RegExp(pattern, "i");
    const match = key.match(re);
    if (!match || match.index === undefined) return [];
    return [match.index, match.index + match[0].length];
  } catch {
    return [];
  }
}

/**
 * Get the indices within a key string that match based on the search mode.
 * - For fuzzy: returns individual character positions
 * - For glob/regex: returns [start, end] segment boundaries
>>>>>>> 225d711942b1e1bfa9de978da2b96b412a61198a
 */
export function getMatchIndices(
  key: string,
  pattern: string,
  mode: SearchMode
): number[] {
<<<<<<< HEAD
  if (mode === 'fuzzy') {
    const patternLower = pattern.toLowerCase();
    const keyLower = key.toLowerCase();
    const indices: number[] = [];
    let patternIndex = 0;

    for (let keyIndex = 0; keyIndex < keyLower.length; keyIndex++) {
      if (keyLower[keyIndex] === patternLower[patternIndex]) {
        indices.push(keyIndex);
        patternIndex++;
        if (patternIndex === patternLower.length) {
          break;
        }
      }
    }

    return indices;
  }

  if (mode === 'glob') {
    // For glob patterns, return the full match span
    const regex = globToRegex(pattern);
    const match = key.match(regex);
    return match
      ? Array.from({ length: key.length }, (_, i) => i)
      : [];
  }

  if (mode === 'regex') {
    // For regex patterns, return the full match span
    try {
      const regex = new RegExp(pattern);
      const match = key.match(regex);
      return match
        ? Array.from({ length: key.length }, (_, i) => i)
        : [];
    } catch {
      return [];
    }
  }

=======
  if (mode === "fuzzy") {
    return getFuzzyMatchIndices(key, pattern);
  } else if (mode === "glob") {
    return getGlobMatchIndices(key, pattern);
  } else if (mode === "regex") {
    return getRegexMatchIndices(key, pattern);
  }
>>>>>>> 225d711942b1e1bfa9de978da2b96b412a61198a
  return [];
}
