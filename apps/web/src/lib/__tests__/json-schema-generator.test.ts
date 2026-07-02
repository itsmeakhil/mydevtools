import { collectFormats, detectFormat, generateFromSchema, inferSchema, mergeNodes, toJsonSchemaDocument } from '../json-schema-generator';

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

describe('collectFormats', () => {
  it('counts formats across nested and array shapes', () => {
    const node = inferSchema({
      id: '550e8400-e29b-41d4-a716-446655440000',
      owner: { email: 'a@b.com' },
      contacts: [{ email: 'c@d.com' }, { email: 'e@f.com' }],
      created: '2026-07-02T00:00:00Z',
    });
    const m = collectFormats(node);
    expect(m.get('uuid')).toBe(1);
    expect(m.get('email')).toBe(2);
    expect(m.get('date-time')).toBe(1);
    expect(m.has('date')).toBe(false);
  });
});

describe('Python format mapping', () => {
  const node = inferSchema({
    created: '2026-07-02T00:00:00Z',
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'a@b.com',
  });
  const py = generateFromSchema(node, 'python');

  it('maps date-time and uuid to stdlib types', () => {
    expect(py).toContain('created: datetime');
    expect(py).toContain('id: UUID');
  });
  it('leaves email as str', () => {
    expect(py).toContain('email: str');
  });
  it('adds the needed imports', () => {
    expect(py).toContain('from datetime import datetime');
    expect(py).toContain('from uuid import UUID');
  });
});
