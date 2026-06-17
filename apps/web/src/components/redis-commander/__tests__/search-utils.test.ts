import {
  detectSearchMode,
  globMatch,
  regexMatch,
  fuzzyMatch,
  getFuzzyMatchIndices,
  getGlobMatchIndices,
  getRegexMatchIndices,
  getMatchIndices,
} from '../search-utils';

describe('detectSearchMode', () => {
  describe('glob patterns', () => {
    it('should detect glob with * wildcard', () => {
      expect(detectSearchMode('user:*')).toBe('glob');
    });

    it('should detect glob with ? wildcard', () => {
      expect(detectSearchMode('user:?')).toBe('glob');
    });

    it('should detect glob with multiple wildcards', () => {
      expect(detectSearchMode('user:*:?')).toBe('glob');
    });

    it('should detect regex for user:*[0-9] (regex chars take priority)', () => {
      // The implementation checks regex patterns with [, ], etc. first
      expect(detectSearchMode('user:*[0-9]')).toBe('regex');
    });
  });

  describe('regex patterns', () => {
    it('should detect regex with [a-z] character class', () => {
      expect(detectSearchMode('[a-z]')).toBe('regex');
    });

    it('should detect regex with ^ anchor', () => {
      expect(detectSearchMode('^session:')).toBe('regex');
    });

    it('should detect regex with $ anchor', () => {
      expect(detectSearchMode('session:$')).toBe('regex');
    });

    it('should detect regex with () groups', () => {
      expect(detectSearchMode('(user|session)')).toBe('regex');
    });

    it('should detect regex with . dot', () => {
      expect(detectSearchMode('user.name')).toBe('regex');
    });

    it('should detect regex with + quantifier', () => {
      expect(detectSearchMode('[0-9]+')).toBe('regex');
    });

    it('should detect regex with | alternation', () => {
      expect(detectSearchMode('user|session')).toBe('regex');
    });

    it('should detect regex with {n,m} quantifier', () => {
      expect(detectSearchMode('[0-9]{2,4}')).toBe('regex');
    });

    it('should detect regex with escaped characters', () => {
      expect(detectSearchMode('user\\.name')).toBe('regex');
    });
  });

  describe('fuzzy patterns', () => {
    it('should detect simple string as fuzzy', () => {
      expect(detectSearchMode('user')).toBe('fuzzy');
    });

    it('should detect string with colons as fuzzy', () => {
      expect(detectSearchMode('user:name')).toBe('fuzzy');
    });

    it('should detect string with dashes as fuzzy', () => {
      expect(detectSearchMode('user-profile')).toBe('fuzzy');
    });

    it('should detect string with underscores as fuzzy', () => {
      expect(detectSearchMode('user_profile')).toBe('fuzzy');
    });

    it('should detect string with numbers as fuzzy', () => {
      expect(detectSearchMode('user123')).toBe('fuzzy');
    });
  });
});

describe('globMatch', () => {
  const keys = ['user:123', 'user:456', 'session:123', 'session:001', 'session:002'];

  it('should match user:* pattern', () => {
    const result = globMatch(keys, 'user:*');
    expect(result).toEqual(['user:123', 'user:456']);
  });

  it('should not match session:* pattern against user keys', () => {
    const result = globMatch(keys, 'user:*');
    expect(result).not.toContain('session:123');
  });

  it('should match session:* pattern', () => {
    const result = globMatch(keys, 'session:*');
    expect(result).toEqual(['session:123', 'session:001', 'session:002']);
  });

  it('should match user:? pattern for single character', () => {
    const result = globMatch(['user:1', 'user:12', 'user:123'], 'user:?');
    expect(result).toEqual(['user:1']);
  });

  it('should not match user:? pattern for multiple characters', () => {
    const result = globMatch(['user:1', 'user:12', 'user:123'], 'user:?');
    expect(result).not.toContain('user:12');
  });

  it('should be case-insensitive', () => {
    const result = globMatch(['User:123', 'USER:456'], 'user:*');
    expect(result).toEqual(['User:123', 'USER:456']);
  });

  it('should handle empty pattern (matches only empty key)', () => {
    const result = globMatch(['', 'user:123'], '');
    expect(result).toContain('');
  });

  it('should escape dots correctly', () => {
    const result = globMatch(['user.name', 'username'], 'user.name');
    expect(result).toEqual(['user.name']);
  });

  it('should handle multiple wildcards', () => {
    const result = globMatch(['user:session:data', 'user:profile:info'], 'user:*:*');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return empty array when no matches', () => {
    const result = globMatch(keys, 'nonexistent:*');
    expect(result).toEqual([]);
  });
});

describe('regexMatch', () => {
  const keys = ['session:001', 'session:123', 'user:001', 'session:abc'];

  it('should match valid regex pattern', () => {
    const result = regexMatch(keys, '^session:[0-9]+$');
    expect(result.matches).toEqual(['session:001', 'session:123']);
    expect(result.error).toBeNull();
  });

  it('should be case-insensitive', () => {
    const result = regexMatch(keys, '^SESSION:[0-9]+$');
    expect(result.matches).toContain('session:001');
    expect(result.error).toBeNull();
  });

  it('should not match when pattern is more restrictive', () => {
    const result = regexMatch(['user:123'], '^session:[0-9]+$');
    expect(result.matches).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('should return error for invalid regex', () => {
    const result = regexMatch(keys, '[invalid');
    expect(result.matches).toEqual([]);
    expect(result.error).not.toBeNull();
    expect(typeof result.error).toBe('string');
  });

  it('should handle regex with character classes', () => {
    const result = regexMatch(['a', 'b', 'c', '1'], '[a-z]');
    expect(result.matches).toContain('a');
    expect(result.matches).toContain('b');
    expect(result.matches).not.toContain('1');
    expect(result.error).toBeNull();
  });

  it('should handle regex with alternation', () => {
    const result = regexMatch(['user:123', 'session:123', 'key:123'], '(user|session):.*');
    expect(result.matches).toContain('user:123');
    expect(result.matches).toContain('session:123');
    expect(result.matches).not.toContain('key:123');
    expect(result.error).toBeNull();
  });
});

describe('fuzzyMatch', () => {
  const keys = ['user_profile', 'user_data', 'session_data', 'user_profile_extended'];

  it('should match user in user_profile', () => {
    const result = fuzzyMatch(keys, 'user');
    expect(result).toContain('user_profile');
    expect(result).toContain('user_data');
  });

  it('should not match user in session_data', () => {
    const result = fuzzyMatch(keys, 'user');
    expect(result).not.toContain('session_data');
  });

  it('should match subsequence usr_pro in user_profile', () => {
    const result = fuzzyMatch(keys, 'usr_pro');
    expect(result).toContain('user_profile');
  });

  it('should be case-insensitive', () => {
    const result = fuzzyMatch(keys, 'USER');
    expect(result).toContain('user_profile');
    expect(result).toContain('user_data');
  });

  it('should respect character order', () => {
    const result = fuzzyMatch(['user_profile'], 'pro_user');
    expect(result).toEqual([]);
  });

  it('should handle empty pattern (matches all keys)', () => {
    const result = fuzzyMatch(keys, '');
    expect(result).toEqual(keys);
  });

  it('should return empty array when no matches', () => {
    const result = fuzzyMatch(keys, 'xyz');
    expect(result).toEqual([]);
  });

  it('should match single character', () => {
    const result = fuzzyMatch(keys, 'u');
    expect(result).toContain('user_profile');
    expect(result).toContain('user_data');
  });

  it('should match profile in multiple user keys', () => {
    const result = fuzzyMatch(keys, 'profile');
    expect(result).toContain('user_profile');
    expect(result).toContain('user_profile_extended');
  });
});

describe('getFuzzyMatchIndices', () => {
  it('should return indices for fuzzy match usr in user_profile', () => {
    const indices = getFuzzyMatchIndices('user_profile', 'usr');
    // u at 0, s at 1, r at 3 (e is at 2)
    expect(indices).toEqual([0, 1, 3]);
  });

  it('should return indices for pro in user_profile', () => {
    const indices = getFuzzyMatchIndices('user_profile', 'pro');
    expect(indices).toContain(5); // p
    expect(indices.length).toBe(3); // p, r, o
  });

  it('should be case-insensitive', () => {
    const indices = getFuzzyMatchIndices('user_profile', 'USR');
    // u at 0, s at 1, r at 3 (e is at 2)
    expect(indices).toEqual([0, 1, 3]);
  });

  it('should return empty array for non-matching pattern', () => {
    const indices = getFuzzyMatchIndices('user_profile', 'xyz');
    expect(indices).toEqual([]);
  });

  it('should return empty array for pattern longer than key', () => {
    const indices = getFuzzyMatchIndices('user', 'userlongpattern');
    expect(indices).toEqual([]);
  });

  it('should find all characters for simple match', () => {
    const indices = getFuzzyMatchIndices('abc', 'abc');
    expect(indices).toEqual([0, 1, 2]);
  });

  it('should handle single character match', () => {
    const indices = getFuzzyMatchIndices('user_profile', 'u');
    expect(indices).toEqual([0]);
  });

  it('should work with numbers', () => {
    const indices = getFuzzyMatchIndices('user123profile', '123');
    expect(indices).toEqual([4, 5, 6]);
  });
});

describe('getGlobMatchIndices', () => {
  it('should return segment boundaries for user:* in user:123', () => {
    const indices = getGlobMatchIndices('user:123', 'user:*');
    expect(indices.length).toBeGreaterThanOrEqual(2);
    expect(indices[0]).toBeLessThanOrEqual(indices[1]);
  });

  it('should return empty array for non-matching pattern', () => {
    const indices = getGlobMatchIndices('session:123', 'user:*');
    expect(indices).toEqual([]);
  });

  it('should be case-insensitive', () => {
    const indices = getGlobMatchIndices('USER:123', 'user:*');
    expect(indices.length).toBeGreaterThanOrEqual(2);
  });

  it('should work with multiple wildcards', () => {
    const indices = getGlobMatchIndices('user:session:data', 'user:*:*');
    expect(indices.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle ? single char wildcard', () => {
    const indices = getGlobMatchIndices('user:1', 'user:?');
    expect(indices.length).toBeGreaterThanOrEqual(2);
  });
});

describe('getRegexMatchIndices', () => {
  it('should return segment boundaries for regex match', () => {
    const indices = getRegexMatchIndices('session:001', '^session:[0-9]+$');
    expect(indices.length).toBe(2);
    expect(indices[0]).toEqual(0);
    expect(indices[1]).toBeGreaterThan(indices[0]);
  });

  it('should return correct match position for partial regex', () => {
    const indices = getRegexMatchIndices('app:session:123', '[0-9]+');
    expect(indices.length).toBe(2);
    expect(indices[0]).toBeGreaterThanOrEqual(0);
    expect(indices[1]).toBeGreaterThan(indices[0]);
  });

  it('should return empty array for non-matching pattern', () => {
    const indices = getRegexMatchIndices('user:abc', '[0-9]+');
    expect(indices).toEqual([]);
  });

  it('should return empty array for invalid regex', () => {
    const indices = getRegexMatchIndices('user:123', '[invalid');
    expect(indices).toEqual([]);
  });

  it('should be case-insensitive', () => {
    const indices = getRegexMatchIndices('SESSION:001', 'session:[0-9]+');
    expect(indices.length).toBe(2);
  });
});

describe('getMatchIndices', () => {
  it('should return fuzzy indices for fuzzy mode', () => {
    const indices = getMatchIndices('user_profile', 'usr', 'fuzzy');
    // u at 0, s at 1, r at 3
    expect(indices).toEqual([0, 1, 3]);
  });

  it('should return glob indices for glob mode', () => {
    const indices = getMatchIndices('user:123', 'user:*', 'glob');
    expect(indices.length).toBeGreaterThanOrEqual(2);
  });

  it('should return regex indices for regex mode', () => {
    const indices = getMatchIndices('session:001', '^session:[0-9]+$', 'regex');
    expect(indices.length).toBeGreaterThanOrEqual(2);
  });

  it('should return empty array for invalid regex in regex mode', () => {
    const indices = getMatchIndices('user:123', '[invalid', 'regex');
    expect(indices).toEqual([]);
  });

  it('should return empty array for non-matching fuzzy', () => {
    const indices = getMatchIndices('session_data', 'user', 'fuzzy');
    expect(indices).toEqual([]);
  });

  it('should work with all three modes on different patterns', () => {
    const fuzzyIndices = getMatchIndices('user_profile', 'pro', 'fuzzy');
    const globIndices = getMatchIndices('user:profile', 'user:*', 'glob');
    const regexIndices = getMatchIndices('user:profile', 'user:.*', 'regex');

    expect(fuzzyIndices.length).toBeGreaterThan(0);
    expect(globIndices.length).toBeGreaterThan(0);
    expect(regexIndices.length).toBeGreaterThan(0);
  });
});
