import {
  AMBIGUOUS_CHARACTERS,
  applyKeyPrefix,
  generateSecretStrings,
  MAX_KEY_PREFIX_LENGTH,
  stripAmbiguous,
} from '../generate-secret-strings';

describe('stripAmbiguous', () => {
  it('documents exactly the intended set', () => {
    expect(AMBIGUOUS_CHARACTERS).toBe('0O1lI|`\'"');
  });

  it('removes every documented ambiguous character', () => {
    expect(stripAmbiguous(AMBIGUOUS_CHARACTERS)).toBe('');
  });

  it('strips ambiguous chars from the alphanumeric preset', () => {
    const alnum =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const out = stripAmbiguous(alnum);
    expect(out).toHaveLength(alnum.length - 5); // O, I, l, 0, 1
    for (const ch of '0O1lI') expect(out).not.toContain(ch);
    expect(out).toContain('o'); // lowercase o stays
    expect(out).toContain('L'); // capital L stays
  });

  it('preserves character order and leaves clean alphabets untouched', () => {
    expect(stripAmbiguous('abcdef')).toBe('abcdef');
    expect(stripAmbiguous('a0b1c')).toBe('abc');
    expect(stripAmbiguous('')).toBe('');
  });

  it('can empty an alphabet; generateSecretStrings then reports emptyAlphabet', () => {
    expect(stripAmbiguous('0O1lI')).toBe('');
    expect(
      generateSecretStrings({ alphabet: stripAmbiguous('0O1lI'), length: 8, count: 1 })
    ).toEqual({ ok: false, errorKey: 'emptyAlphabet' });
  });
});

describe('applyKeyPrefix', () => {
  it('prepends the prefix to every line', () => {
    expect(applyKeyPrefix(['abc', 'def'], 'sk_')).toEqual(['sk_abc', 'sk_def']);
  });

  it('returns the input array untouched for an empty prefix', () => {
    const lines = ['abc'];
    expect(applyKeyPrefix(lines, '')).toBe(lines);
  });

  it('does not mutate its input', () => {
    const lines = ['abc', 'def'];
    applyKeyPrefix(lines, 'sk_');
    expect(lines).toEqual(['abc', 'def']);
  });

  it('exposes a sane max length for the UI input', () => {
    expect(MAX_KEY_PREFIX_LENGTH).toBe(32);
  });
});
