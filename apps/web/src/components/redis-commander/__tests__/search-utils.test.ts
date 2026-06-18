import {
<<<<<<< HEAD
  globMatch,
  regexMatch,
  fuzzyMatch,
  detectSearchMode,
  getMatchIndices,
  type SearchMode,
} from '../search-utils';

describe('globMatch', () => {
  it('should match keys with * wildcard (any characters)', () => {
    const result = globMatch(['user:123', 'user:456', 'session:789'], 'user:*');
    expect(result).toEqual(['user:123', 'user:456']);
  });

  it('should match keys with ? wildcard (single character)', () => {
    const result = globMatch(['user:1', 'user:12', 'session:1'], 'user:?');
    expect(result).toEqual(['user:1']);
  });

  it('should return empty array when no matches', () => {
    const result = globMatch(['user:123', 'user:456'], 'session:*');
    expect(result).toEqual([]);
  });

  it('should escape regex special characters in literals', () => {
    const result = globMatch(
      ['user.name', 'username', 'user_name'],
      'user.name'
    );
=======
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
>>>>>>> 225d711942b1e1bfa9de978da2b96b412a61198a
    expect(result).toEqual(['user.name']);
  });

  it('should handle multiple wildcards', () => {
<<<<<<< HEAD
    const result = globMatch(
      ['user:123:admin', 'user:456:user', 'admin:123:admin'],
      'user:*:*'
    );
    expect(result).toEqual(['user:123:admin', 'user:456:user']);
  });

  it('should match empty pattern', () => {
    const result = globMatch(['test', 'test2'], '*');
    expect(result).toEqual(['test', 'test2']);
=======
    const result = globMatch(['user:session:data', 'user:profile:info'], 'user:*:*');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return empty array when no matches', () => {
    const result = globMatch(keys, 'nonexistent:*');
    expect(result).toEqual([]);
>>>>>>> 225d711942b1e1bfa9de978da2b96b412a61198a
  });
});

describe('regexMatch', () => {
<<<<<<< HEAD
  it('should match keys with valid regex pattern', () => {
    const result = regexMatch(
      ['session:123', 'session:456', 'user:123'],
      '^session:[0-9]+$'
    );
    expect(result.keys).toEqual(['session:123', 'session:456']);
    expect(result.error).toBeUndefined();
  });

  it('should return error for invalid regex pattern', () => {
    const result = regexMatch(['session:123'], '^session[');
    expect(result.keys).toEqual([]);
    expect(result.error).toBeDefined();
  });

  it('should be case-sensitive by default', () => {
    const result = regexMatch(
      ['Session:123', 'session:123'],
      '^session:'
    );
    expect(result.keys).toEqual(['session:123']);
    expect(result.error).toBeUndefined();
  });

  it('should support case-insensitive matching with flag', () => {
    const result = regexMatch(
      ['Session:123', 'session:123'],
      '^session:.*$'
    );
    expect(result.keys).toEqual(['session:123']);
  });

  it('should support character classes', () => {
    const result = regexMatch(
      ['user_1', 'user_a', 'admin_1'],
      '^user_[0-9]$'
    );
    expect(result.keys).toEqual(['user_1']);
  });

  it('should support alternation', () => {
    const result = regexMatch(
      ['user:123', 'admin:456', 'guest:789'],
      '^(user|admin):'
    );
    expect(result.keys).toEqual(['user:123', 'admin:456']);
=======
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
>>>>>>> 225d711942b1e1bfa9de978da2b96b412a61198a
  });
});

describe('fuzzyMatch', () => {
<<<<<<< HEAD
  it('should match keys where pattern chars appear in order', () => {
    const result = fuzzyMatch(
      ['user_profile', 'user_settings', 'user_data', 'session_data'],
      'user'
    );
    expect(result).toContain('user_profile');
    expect(result).toContain('user_settings');
    expect(result).not.toContain('session_data');
  });

  it('should match fuzzy pattern with multiple characters', () => {
    const result = fuzzyMatch(
      ['user_profile', 'profile_user'],
      'user_pro'
    );
    expect(result).toEqual(['user_profile']);
  });

  it('should be case-insensitive', () => {
    const result = fuzzyMatch(['User_Profile', 'user_profile'], 'user_pro');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should match single character', () => {
    const result = fuzzyMatch(['user_1', 'admin_1', 'guest_1'], 'u');
    expect(result).toContain('user_1');
    expect(result).not.toContain('admin_1');
  });

  it('should return empty array when pattern not found', () => {
    const result = fuzzyMatch(['user:123', 'session:456'], 'xyz');
    expect(result).toEqual([]);
  });

  it('should require characters in order', () => {
    const result = fuzzyMatch(['abc', 'bac', 'xyz'], 'ab');
    expect(result).toContain('abc');
    expect(result).not.toContain('bac');
    expect(result).not.toContain('xyz');
  });
});

describe('detectSearchMode', () => {
  it('should detect glob mode with * wildcard', () => {
    expect(detectSearchMode('user:*')).toBe('glob');
  });

  it('should detect glob mode with ? wildcard', () => {
    expect(detectSearchMode('user:?')).toBe('glob');
  });

  it('should detect regex mode with ^ anchor', () => {
    expect(detectSearchMode('^user:[0-9]+$')).toBe('regex');
  });

  it('should detect regex mode with $ anchor', () => {
    expect(detectSearchMode('user:$')).toBe('regex');
  });

  it('should detect regex mode with character class', () => {
    expect(detectSearchMode('user[0-9]')).toBe('regex');
  });

  it('should detect regex mode with alternation', () => {
    expect(detectSearchMode('(user|admin)')).toBe('regex');
  });

  it('should detect regex mode with quantifier', () => {
    expect(detectSearchMode('user{2,5}')).toBe('regex');
  });

  it('should detect regex mode with pipe alternation', () => {
    expect(detectSearchMode('user|admin')).toBe('regex');
  });

  it('should detect fuzzy mode for simple strings', () => {
    expect(detectSearchMode('userprofile')).toBe('fuzzy');
  });

  it('should prioritize glob over regex', () => {
    expect(detectSearchMode('user:*[0-9]')).toBe('glob');
  });

  it('should handle regex escape sequences', () => {
    expect(detectSearchMode('user\\d+')).toBe('regex');
=======
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
>>>>>>> 225d711942b1e1bfa9de978da2b96b412a61198a
  });
});

describe('getMatchIndices', () => {
<<<<<<< HEAD
  it('should return character indices for fuzzy match', () => {
    const result = getMatchIndices('user_profile', 'usr', 'fuzzy');
    expect(result).toContain(0); // u
    expect(result).toContain(1); // s
    expect(result).toContain(3); // r (in user at index 3)
    expect(result.length).toBe(3);
  });

  it('should return non-empty for glob match', () => {
    const result = getMatchIndices('user:123', 'user:*', 'glob');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return non-empty for regex match', () => {
    const result = getMatchIndices('session:123', '^session:[0-9]+$', 'regex');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return empty for non-matching fuzzy pattern', () => {
    const result = getMatchIndices('user', 'xyz', 'fuzzy');
    expect(result).toEqual([]);
  });

  it('should return empty for non-matching glob pattern', () => {
    const result = getMatchIndices('user:123', 'admin:*', 'glob');
    expect(result).toEqual([]);
  });

  it('should handle regex with error gracefully', () => {
    const result = getMatchIndices('test', '^[', 'regex');
    expect(result).toEqual([]);
  });

  it('should track correct indices for fuzzy match with duplicates', () => {
    const result = getMatchIndices('banana', 'ana', 'fuzzy');
    // 'a' at index 1, 'n' at index 2, 'a' at index 3
    expect(result).toEqual([1, 2, 3]);
  });
});

describe('integration tests', () => {
  it('should correctly identify and apply glob matching', () => {
    const pattern = 'user:*';
    const mode = detectSearchMode(pattern);
    expect(mode).toBe('glob');

    const result = globMatch(['user:1', 'user:2', 'admin:1'], pattern);
    expect(result).toEqual(['user:1', 'user:2']);
  });

  it('should correctly identify and apply regex matching', () => {
    const pattern = '^session:[0-9]+$';
    const mode = detectSearchMode(pattern);
    expect(mode).toBe('regex');

    const result = regexMatch(['session:123', 'session:abc'], pattern);
    expect(result.keys).toEqual(['session:123']);
  });

  it('should correctly identify and apply fuzzy matching', () => {
    const pattern = 'usrprf';
    const mode = detectSearchMode(pattern);
    expect(mode).toBe('fuzzy');

    const result = fuzzyMatch(
      ['user_profile', 'user_permission', 'admin_profile'],
      pattern
    );
    expect(result).toContain('user_profile');
  });

  it('should handle real-world Redis key patterns', () => {
    const keys = [
      'user:1:profile',
      'user:2:profile',
      'user:1:settings',
      'session:abc123',
      'cache:user:1',
    ];

    // Test glob
    expect(globMatch(keys, 'user:*:profile')).toEqual([
      'user:1:profile',
      'user:2:profile',
    ]);

    // Test regex
    const regexResult = regexMatch(keys, '^user:[0-9]:');
    expect(regexResult.keys).toEqual(['user:1:profile', 'user:2:profile', 'user:1:settings']);

    // Test fuzzy
    expect(fuzzyMatch(keys, 'usr1')).toContain('user:1:profile');
=======
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
>>>>>>> 225d711942b1e1bfa9de978da2b96b412a61198a
  });
});
