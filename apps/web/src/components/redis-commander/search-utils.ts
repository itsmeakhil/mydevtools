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
 */
export function regexMatch(
  keys: string[],
  pattern: string
): RegexMatchResult {
  try {
    const regex = new RegExp(pattern);
    const matchedKeys = keys.filter((key) => regex.test(key));
    return { keys: matchedKeys };
  } catch (error) {
    return {
      keys: [],
      error: error instanceof Error ? error.message : 'Invalid regex pattern',
    };
  }
}

/**
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
  });
}

/**
 * Gets match indices for highlighting
 * For glob/regex: returns the span of the matched portion
 * For fuzzy: returns the character indices of matched characters
 */
export function getMatchIndices(
  key: string,
  pattern: string,
  mode: SearchMode
): number[] {
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

  return [];
}
