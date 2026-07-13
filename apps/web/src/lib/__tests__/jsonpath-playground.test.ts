import {
  runJsonQuery,
  parseJsonText,
  formatJsonText,
  SAMPLE_JSON,
  CHEATSHEET,
} from '@/lib/jsonpath-playground';

const DOC = JSON.stringify({
  store: {
    books: [
      { title: 'A', price: 10, inStock: true },
      { title: 'B', price: 25, inStock: false },
      { title: 'C', price: 40, inStock: true },
    ],
  },
});

describe('parseJsonText', () => {
  it('parses valid JSON', () => {
    expect(parseJsonText('{"a":1}')).toEqual({ value: { a: 1 }, error: null });
  });

  it('reports empty input', () => {
    expect(parseJsonText('   ').error).toBe('Empty input');
  });

  it('reports syntax errors without throwing', () => {
    const res = parseJsonText('{oops}');
    expect(res.error).toBeTruthy();
    expect(res.value).toBeUndefined();
  });
});

describe('formatJsonText', () => {
  it('pretty-prints with two spaces', () => {
    expect(formatJsonText('{"a":[1,2]}').output).toBe('{\n  "a": [\n    1,\n    2\n  ]\n}');
  });

  it('returns an error for invalid JSON', () => {
    const res = formatJsonText('nope{');
    expect(res.output).toBe('');
    expect(res.error).toBeTruthy();
  });
});

describe('runJsonQuery — jsonpath', () => {
  it('selects nested values with wildcards', () => {
    const res = runJsonQuery(DOC, '$.store.books[*].title', 'jsonpath');
    expect(res.error).toBeNull();
    expect(res.count).toBe(3);
    expect(JSON.parse(res.output)).toEqual(['A', 'B', 'C']);
  });

  it('supports recursive descent', () => {
    const res = runJsonQuery(DOC, '$..price', 'jsonpath');
    expect(JSON.parse(res.output)).toEqual([10, 25, 40]);
    expect(res.count).toBe(3);
  });

  it('supports filter expressions with safe eval', () => {
    const res = runJsonQuery(DOC, '$.store.books[?(@.price < 30)].title', 'jsonpath');
    expect(res.error).toBeNull();
    expect(JSON.parse(res.output)).toEqual(['A', 'B']);
  });

  it('returns an empty wrapped array when nothing matches', () => {
    const res = runJsonQuery(DOC, '$.missing', 'jsonpath');
    expect(res.error).toBeNull();
    expect(res.count).toBe(0);
    expect(JSON.parse(res.output)).toEqual([]);
  });

  it('reports invalid JSON input', () => {
    const res = runJsonQuery('{bad', '$.a', 'jsonpath');
    expect(res.error).toMatch(/^Invalid JSON:/);
    expect(res.count).toBe(0);
  });

  it('reports a bad query as an error instead of throwing', () => {
    const res = runJsonQuery(DOC, '$..[?(', 'jsonpath');
    expect(res.error).toBeTruthy();
    expect(res.output).toBe('');
  });
});

describe('runJsonQuery — jmespath', () => {
  it('projects values', () => {
    const res = runJsonQuery(DOC, 'store.books[*].title', 'jmespath');
    expect(res.error).toBeNull();
    expect(res.count).toBe(3);
    expect(JSON.parse(res.output)).toEqual(['A', 'B', 'C']);
  });

  it('filters with backtick literals', () => {
    const res = runJsonQuery(DOC, 'store.books[?price > `20`].title', 'jmespath');
    expect(JSON.parse(res.output)).toEqual(['B', 'C']);
  });

  it('counts scalar results as one', () => {
    const res = runJsonQuery(DOC, 'store.books[0].title', 'jmespath');
    expect(res.count).toBe(1);
    expect(JSON.parse(res.output)).toBe('A');
  });

  it('renders no match as null with count 0', () => {
    const res = runJsonQuery(DOC, 'store.missing', 'jmespath');
    expect(res.error).toBeNull();
    expect(res.count).toBe(0);
    expect(res.output).toBe('null');
  });

  it('reports invalid queries as errors', () => {
    const res = runJsonQuery(DOC, 'store.[', 'jmespath');
    expect(res.error).toBeTruthy();
  });
});

describe('runJsonQuery — blank input handling', () => {
  it('is silent for empty JSON or empty query', () => {
    expect(runJsonQuery('', '$.a', 'jsonpath')).toEqual({ output: '', count: 0, error: null });
    expect(runJsonQuery(DOC, '   ', 'jsonpath')).toEqual({ output: '', count: 0, error: null });
  });
});

describe('sample and cheatsheet integrity', () => {
  it('sample JSON parses', () => {
    expect(parseJsonText(SAMPLE_JSON).error).toBeNull();
  });

  it('every cheatsheet expression runs against the sample without error', () => {
    for (const engine of ['jsonpath', 'jmespath'] as const) {
      for (const entry of CHEATSHEET[engine]) {
        const res = runJsonQuery(SAMPLE_JSON, entry.expression, engine);
        expect(res.error).toBeNull();
      }
    }
  });
});
