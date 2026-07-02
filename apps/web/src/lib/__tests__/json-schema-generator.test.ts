import { detectFormat, inferSchema, mergeNodes, toJsonSchemaDocument } from '../json-schema-generator';

describe('detectFormat', () => {
  it('detects each format', () => {
    expect(detectFormat('550e8400-e29b-41d4-a716-446655440000')).toBe('uuid');
    expect(detectFormat('2026-07-02T10:30:00Z')).toBe('date-time');
    expect(detectFormat('2026-07-02T10:30:00.5+05:30')).toBe('date-time');
    expect(detectFormat('2026-07-02')).toBe('date');
    expect(detectFormat('10:30:00')).toBe('time');
    expect(detectFormat('user@example.com')).toBe('email');
    expect(detectFormat('192.168.0.1')).toBe('ipv4');
    expect(detectFormat('https://example.com/x')).toBe('uri');
  });
  it('returns undefined for plain strings and near-misses', () => {
    expect(detectFormat('hello world')).toBeUndefined();
    expect(detectFormat('2026-13-99')).toBeUndefined();
    expect(detectFormat('999.999.999.999')).toBeUndefined();
    expect(detectFormat('not-a-uuid-1234')).toBeUndefined();
  });
});

describe('inferSchema format tagging', () => {
  it('tags detected string formats', () => {
    const node = inferSchema({ created: '2026-07-02T10:30:00Z', name: 'x' });
    expect(node).toMatchObject({
      kind: 'object',
      fields: {
        created: { node: { kind: 'scalar', t: 'string', format: 'date-time' } },
        name: { node: { kind: 'scalar', t: 'string' } },
      },
    });
  });
});

describe('mergeNodes format handling', () => {
  const strEmail = { kind: 'scalar', t: 'string', format: 'email' } as const;
  const strDate = { kind: 'scalar', t: 'string', format: 'date' } as const;
  const plainStr = { kind: 'scalar', t: 'string' } as const;

  it('keeps a shared format', () => {
    expect(mergeNodes(strEmail, { ...strEmail })).toEqual(strEmail);
  });
  it('drops format when two strings disagree', () => {
    expect(mergeNodes(strEmail, strDate)).toEqual(plainStr);
  });
  it('drops format when only one side has one', () => {
    expect(mergeNodes(strEmail, plainStr)).toEqual(plainStr);
  });
  it('array of mixed-format strings infers plain string item', () => {
    const node = inferSchema(['a@b.com', '2026-07-02']);
    expect(node).toEqual({ kind: 'array', item: plainStr });
  });
});

describe('JSON Schema format output', () => {
  it('emits format for detected strings', () => {
    const doc = toJsonSchemaDocument(
      inferSchema({ email: 'a@b.com', note: 'hi' })
    ) as any;
    expect(doc.properties.email).toEqual({ type: 'string', format: 'email' });
    expect(doc.properties.note).toEqual({ type: 'string' });
  });
});
