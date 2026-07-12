import { jsonToCode, JSON_TO_CODE_TARGETS } from '@/lib/json-to-code';

const SAMPLE = JSON.stringify({
  id: 7,
  name: 'Ada',
  score: 9.5,
  active: true,
  profile: { bio: 'hi', links: ['a', 'b'] },
  tags: [{ label: 'x', weight: 1 }, { label: 'y' }],
});

describe('jsonToCode', () => {
  it('returns empty code with no error for blank input', () => {
    expect(jsonToCode('', 'typescript')).toEqual({ code: '', error: null });
    expect(jsonToCode('   ', 'typescript')).toEqual({ code: '', error: null });
  });

  it('reports a parse error for invalid JSON', () => {
    const result = jsonToCode('{"a":}', 'typescript');
    expect(result.code).toBe('');
    expect(result.error).not.toBeNull();
  });

  it('generates non-empty code for every target', () => {
    for (const { value } of JSON_TO_CODE_TARGETS) {
      const { code, error } = jsonToCode(SAMPLE, value, 'User');
      expect(error).toBeNull();
      expect(code.length).toBeGreaterThan(0);
    }
  });

  it('emits TypeScript interfaces with optionality and nested types', () => {
    const { code } = jsonToCode(SAMPLE, 'typescript', 'User');
    expect(code).toContain('export interface User {');
    expect(code).toContain('export interface Profile {');
    expect(code).toContain('id: number;');
    expect(code).toContain('tags: Tag[];');
    // "weight" is missing from one tag sample → optional
    expect(code).toContain('weight?: number;');
  });

  it('emits Go structs with json tags and omitempty for optionals', () => {
    const { code } = jsonToCode(SAMPLE, 'go', 'User');
    expect(code).toContain('type User struct {');
    expect(code).toContain('`json:"name"`');
    expect(code).toContain('`json:"weight,omitempty"`');
  });

  it('emits Rust structs with serde renames for non-snake keys', () => {
    const { code } = jsonToCode('{"userName":"a"}', 'rust', 'User');
    expect(code).toContain('#[serde(rename = "userName")]');
    expect(code).toContain('pub user_name: String,');
  });

  it('emits Python dataclasses with Optional fields', () => {
    const { code } = jsonToCode(SAMPLE, 'python-dataclass', 'User');
    expect(code).toContain('@dataclass');
    expect(code).toContain('class User:');
    expect(code).toContain('weight: Optional[int]');
  });

  it('emits a valid JSON Schema with $defs for nested objects', () => {
    const { code } = jsonToCode(SAMPLE, 'json-schema', 'User');
    const schema = JSON.parse(code);
    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(schema.title).toBe('User');
    expect(schema.type).toBe('object');
    expect(schema.$defs).toHaveProperty('Profile');
    expect(schema.$defs).toHaveProperty('Tag');
    expect(schema.required).toContain('id');
  });

  it('distinguishes integers from floats where the language does', () => {
    const { code } = jsonToCode('{"count":3,"ratio":0.5}', 'go', 'Stats');
    expect(code).toContain('Count int');
    expect(code).toContain('Ratio float64');
  });

  it('handles an array root via a type alias', () => {
    const { code } = jsonToCode('[{"a":1}]', 'typescript', 'Items');
    expect(code).toContain('export type Items = ');
    expect(code).toMatch(/\[\];/);
  });

  it('respects a custom root name and falls back to Root', () => {
    expect(jsonToCode('{"a":1}', 'typescript', 'MyThing').code).toContain('interface MyThing');
    expect(jsonToCode('{"a":1}', 'typescript', '').code).toContain('interface Root');
  });

  it('quotes keys that are not valid identifiers in TypeScript', () => {
    const { code } = jsonToCode('{"weird-key":1}', 'typescript', 'X');
    expect(code).toContain('"weird-key": number;');
  });
});
