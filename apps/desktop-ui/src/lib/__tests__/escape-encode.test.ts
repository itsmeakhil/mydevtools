import { transform, ESCAPE_MODES } from '@/lib/escape-encode';

describe('transform', () => {
  it('returns empty output with no error for empty input', () => {
    for (const { value } of ESCAPE_MODES) {
      expect(transform('', value, 'encode')).toEqual({ output: '', error: null });
      expect(transform('', value, 'decode')).toEqual({ output: '', error: null });
    }
  });

  describe('html', () => {
    it('encodes special characters as entities', () => {
      const result = transform('<a href="x">&\'</a>', 'html', 'encode');
      expect(result).toEqual({
        output: '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;',
        error: null,
      });
    });

    it('encodes non-ASCII characters numerically', () => {
      expect(transform('é', 'html', 'encode').output).toBe('&#233;');
    });

    it('decodes named, decimal, and hex entities', () => {
      const result = transform('&lt;b&gt; &copy; &#65; &#x41;', 'html', 'decode');
      expect(result.output).toBe('<b> © A A');
    });

    it('round-trips arbitrary text', () => {
      const original = '<script>alert("x & y")</script> café';
      const encoded = transform(original, 'html', 'encode').output;
      expect(transform(encoded, 'html', 'decode').output).toBe(original);
    });

    it('leaves unknown entities untouched', () => {
      expect(transform('&nope;', 'html', 'decode').output).toBe('&nope;');
    });
  });

  describe('backslash', () => {
    it('escapes control characters and quotes', () => {
      const result = transform('line1\nline2\t"quoted"\\', 'backslash', 'encode');
      expect(result.output).toBe('line1\\nline2\\t\\"quoted\\"\\\\');
    });

    it('round-trips including \\xNN and \\uNNNN sequences', () => {
      const original = 'tab\there\nnew "q" \\ ';
      const encoded = transform(original, 'backslash', 'encode').output;
      expect(transform(encoded, 'backslash', 'decode').output).toBe(original);
    });

    it('decodes \\u{...} code points', () => {
      expect(transform('\\u{1F600}', 'backslash', 'decode').output).toBe('😀');
    });

    it('keeps malformed escapes as literals instead of failing', () => {
      expect(transform('\\xZZ \\u12', 'backslash', 'decode')).toEqual({
        output: 'xZZ u12',
        error: null,
      });
    });
  });

  describe('hex', () => {
    it('encodes text to space-separated hex bytes', () => {
      expect(transform('Hi', 'hex', 'encode').output).toBe('48 69');
    });

    it('round-trips UTF-8 text', () => {
      const original = 'héllo 😀';
      const encoded = transform(original, 'hex', 'encode').output;
      expect(transform(encoded, 'hex', 'decode').output).toBe(original);
    });

    it('accepts 0x prefixes and separators when decoding', () => {
      expect(transform('0x48,0x69', 'hex', 'decode').output).toBe('Hi');
    });

    it('reports an error for an odd number of hex digits', () => {
      const result = transform('abc', 'hex', 'decode');
      expect(result.output).toBe('');
      expect(result.error).toBe('Hex input has an odd number of digits');
    });
  });

  describe('unicode', () => {
    it('escapes only non-ASCII characters', () => {
      expect(transform('aé', 'unicode', 'encode').output).toBe('a\\u00e9');
    });

    it('round-trips surrogate pairs', () => {
      const original = 'emoji 😀 done';
      const encoded = transform(original, 'unicode', 'encode').output;
      expect(encoded).toContain('\\ud83d');
      expect(transform(encoded, 'unicode', 'decode').output).toBe(original);
    });

    it('decodes \\u{...} code points', () => {
      expect(transform('\\u{1F600}', 'unicode', 'decode').output).toBe('😀');
    });
  });
});
