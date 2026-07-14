import {
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
    );    expect(result).toEqual(['user.name']);
  });

  it('should handle multiple wildcards', () => {
    const result = globMatch(
      ['user:123:admin', 'user:456:user', 'admin:123:admin'],
      'user:*:*'
    );
    expect(result).toEqual(['user:123:admin', 'user:456:user']);
  });

  it('should match empty pattern', () => {
    const result = globMatch(['test', 'test2'], '*');
    expect(result).toEqual(['test', 'test2']);  });
});

describe('regexMatch', () => {
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
    expect(result.keys).toEqual(['user:123', 'admin:456']);  });
});

describe('fuzzyMatch', () => {
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
    expect(detectSearchMode('user\\d+')).toBe('regex');  });
});

describe('getMatchIndices', () => {
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
    expect(fuzzyMatch(keys, 'usr1')).toContain('user:1:profile');  });
});
