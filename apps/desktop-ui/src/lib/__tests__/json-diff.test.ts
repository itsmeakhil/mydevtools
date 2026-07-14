import {
  diffJson,
  deepEqual,
  formatJsonText,
  previewValue,
  SAMPLE_A,
  SAMPLE_B,
} from '@/lib/json-diff';

describe('deepEqual', () => {
  it('compares scalars, objects, and arrays structurally', () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual('a', 'b')).toBe(false);
    expect(deepEqual({ a: 1, b: [2, 3] }, { b: [2, 3], a: 1 })).toBe(true);
    expect(deepEqual([1, 2], [2, 1])).toBe(false);
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(null, {})).toBe(false);
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });
});

describe('diffJson', () => {
  it('reports identical documents regardless of key order and formatting', () => {
    const res = diffJson('{"a":1,"b":{"c":2}}', '{\n  "b": {"c": 2},\n  "a": 1\n}');
    expect(res.error).toBeNull();
    expect(res.changes).toEqual([]);
  });

  it('detects added, removed, and changed keys', () => {
    const res = diffJson('{"a":1,"b":2}', '{"a":9,"c":3}');
    expect(res.error).toBeNull();
    expect(res.changes).toContainEqual({ path: 'a', type: 'changed', before: 1, after: 9 });
    expect(res.changes).toContainEqual({ path: 'b', type: 'removed', before: 2 });
    expect(res.changes).toContainEqual({ path: 'c', type: 'added', after: 3 });
    expect(res.changes).toHaveLength(3);
  });

  it('builds dot/bracket paths for nested structures', () => {
    const a = '{"users":[{"name":"Ada"},{"name":"Linus"},{"name":"Grace"}]}';
    const b = '{"users":[{"name":"Ada"},{"name":"Linus"},{"name":"Hopper"}]}';
    const res = diffJson(a, b);
    expect(res.changes).toEqual([
      { path: 'users[2].name', type: 'changed', before: 'Grace', after: 'Hopper' },
    ]);
  });

  it('quotes keys that are not identifiers', () => {
    const res = diffJson('{"a-b":{"x":1}}', '{"a-b":{"x":2}}');
    expect(res.changes[0].path).toBe('["a-b"].x');
  });

  it('diffs arrays by index by default', () => {
    const res = diffJson('{"t":[1,2,3]}', '{"t":[1,3]}');
    expect(res.changes).toContainEqual({ path: 't[1]', type: 'changed', before: 2, after: 3 });
    expect(res.changes).toContainEqual({ path: 't[2]', type: 'removed', before: 3 });
    expect(res.changes).toHaveLength(2);
  });

  it('reports extra trailing elements on the right as added', () => {
    const res = diffJson('[1]', '[1,2,3]');
    expect(res.changes).toEqual([
      { path: '$[1]', type: 'added', after: 2 },
      { path: '$[2]', type: 'added', after: 3 },
    ]);
  });

  it('treats reordered arrays as equal with ignoreArrayOrder', () => {
    const a = '{"tags":["x","y","z"]}';
    const b = '{"tags":["z","x","y"]}';
    expect(diffJson(a, b).changes.length).toBeGreaterThan(0);
    expect(diffJson(a, b, { ignoreArrayOrder: true }).changes).toEqual([]);
  });

  it('compares arrays as multisets with ignoreArrayOrder', () => {
    const a = '{"t":[1,1,2]}';
    const b = '{"t":[2,1,3]}';
    const res = diffJson(a, b, { ignoreArrayOrder: true });
    expect(res.changes).toContainEqual({ path: 't[1]', type: 'removed', before: 1 });
    expect(res.changes).toContainEqual({ path: 't[2]', type: 'added', after: 3 });
    expect(res.changes).toHaveLength(2);
  });

  it('matches deep-equal objects inside unordered arrays', () => {
    const a = '[{"id":1},{"id":2}]';
    const b = '[{"id":2},{"id":1}]';
    expect(diffJson(a, b, { ignoreArrayOrder: true }).changes).toEqual([]);
  });

  it('handles type changes (object vs scalar) as changed', () => {
    const res = diffJson('{"a":{"b":1}}', '{"a":5}');
    expect(res.changes).toEqual([
      { path: 'a', type: 'changed', before: { b: 1 }, after: 5 },
    ]);
  });

  it('handles root-level scalar changes with $ path', () => {
    const res = diffJson('1', '2');
    expect(res.changes).toEqual([{ path: '$', type: 'changed', before: 1, after: 2 }]);
  });

  it('distinguishes null from missing', () => {
    const res = diffJson('{"a":null}', '{}');
    expect(res.changes).toEqual([{ path: 'a', type: 'removed', before: null }]);
  });

  it('reports which side failed to parse', () => {
    expect(diffJson('{bad', '{}').error).toMatch(/^Left document:/);
    expect(diffJson('{}', '{bad').error).toMatch(/^Right document:/);
    expect(diffJson('{bad', '{}').changes).toEqual([]);
  });

  it('diffs the bundled samples with all three change types', () => {
    const res = diffJson(SAMPLE_A, SAMPLE_B);
    expect(res.error).toBeNull();
    const types = new Set(res.changes.map((c) => c.type));
    expect(types).toEqual(new Set(['added', 'removed', 'changed']));
  });
});

describe('formatJsonText', () => {
  it('pretty-prints valid JSON and reports errors', () => {
    expect(formatJsonText('{"a":1}').output).toBe('{\n  "a": 1\n}');
    expect(formatJsonText('{').error).toBeTruthy();
  });
});

describe('previewValue', () => {
  it('renders compact JSON and truncates long values', () => {
    expect(previewValue({ a: 1 })).toBe('{"a":1}');
    expect(previewValue(undefined)).toBe('undefined');
    const long = previewValue('x'.repeat(200), 20);
    expect(long.length).toBe(20);
    expect(long.endsWith('…')).toBe(true);
  });
});
