/**
 * json-to-code.ts
 *
 * Pure-TypeScript logic for the "JSON to Code" tool. Given a sample JSON value,
 * infer its shape and generate typed model definitions in several languages.
 *
 * No React, no npm deps, no i18n. Never throws.
 */

export type JsonToCodeTarget =
  | 'typescript'
  | 'python-dataclass'
  | 'python-typeddict'
  | 'python-pydantic'
  | 'go'
  | 'rust'
  | 'java'
  | 'kotlin'
  | 'swift'
  | 'json-schema';

export const JSON_TO_CODE_TARGETS: { value: JsonToCodeTarget; label: string }[] = [
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python-dataclass', label: 'Python (dataclass)' },
  { value: 'python-typeddict', label: 'Python (TypedDict)' },
  { value: 'python-pydantic', label: 'Python (Pydantic)' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'java', label: 'Java (record)' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'swift', label: 'Swift' },
  { value: 'json-schema', label: 'JSON Schema' },
];

export interface JsonToCodeResult {
  code: string;
  error: string | null;
}

/* -------------------------------------------------------------------------- */
/* Type inference model                                                        */
/* -------------------------------------------------------------------------- */

type PrimitiveKind = 'string' | 'integer' | 'float' | 'boolean' | 'null' | 'any';

interface PrimitiveType {
  kind: 'primitive';
  primitive: PrimitiveKind;
}

interface ArrayType {
  kind: 'array';
  element: InferredType;
}

interface ObjectRef {
  kind: 'object';
  /** Name of the generated type (as registered in the type registry). */
  name: string;
}

type InferredType = PrimitiveType | ArrayType | ObjectRef;

interface ObjectField {
  /** Original JSON key. */
  key: string;
  type: InferredType;
  /** True when the field is absent or null in at least one observed sample. */
  optional: boolean;
}

interface ObjectShape {
  name: string;
  fields: ObjectField[];
}

/**
 * A registry of named object shapes, emitted in dependency order (dependencies
 * added before dependents because children are registered during recursion of
 * the parent, and we push to the list only after children are processed).
 */
class Registry {
  private readonly shapes: ObjectShape[] = [];
  private readonly usedNames = new Set<string>();

  /** Reserve a unique PascalCase name derived from `base`. */
  reserveName(base: string): string {
    let name = pascalCase(base);
    if (!name) name = 'Type';
    if (!this.usedNames.has(name)) {
      this.usedNames.add(name);
      return name;
    }
    let i = 2;
    while (this.usedNames.has(`${name}${i}`)) i++;
    const finalName = `${name}${i}`;
    this.usedNames.add(finalName);
    return finalName;
  }

  add(shape: ObjectShape): void {
    this.shapes.push(shape);
  }

  all(): ObjectShape[] {
    return this.shapes;
  }
}

/* -------------------------------------------------------------------------- */
/* Inference                                                                   */
/* -------------------------------------------------------------------------- */

function classifyPrimitive(value: unknown): PrimitiveKind {
  if (value === null) return 'null';
  const t = typeof value;
  if (t === 'string') return 'string';
  if (t === 'boolean') return 'boolean';
  if (t === 'number') {
    return Number.isInteger(value as number) ? 'integer' : 'float';
  }
  return 'any';
}

/**
 * Infer the InferredType for a value. `nameHint` supplies a base name for any
 * object type that needs to be registered.
 */
function infer(value: unknown, nameHint: string, reg: Registry): InferredType {
  if (value === null || value === undefined) {
    return { kind: 'primitive', primitive: 'null' };
  }
  if (Array.isArray(value)) {
    return { kind: 'array', element: inferArrayElement(value, nameHint, reg) };
  }
  if (typeof value === 'object') {
    return inferObject(value as Record<string, unknown>, nameHint, reg);
  }
  return { kind: 'primitive', primitive: classifyPrimitive(value) };
}

function inferArrayElement(arr: unknown[], nameHint: string, reg: Registry): InferredType {
  if (arr.length === 0) {
    return { kind: 'primitive', primitive: 'any' };
  }
  const elementName = singularize(nameHint) || `${pascalCase(nameHint)}Item`;

  // If every non-null element is a plain object, merge their shapes.
  const objects = arr.filter(
    (v) => v !== null && typeof v === 'object' && !Array.isArray(v),
  ) as Record<string, unknown>[];

  if (objects.length > 0 && objects.length === arr.filter((v) => v !== null).length) {
    return inferMergedObject(objects, elementName, reg);
  }

  // Otherwise infer from the first non-null element (fall back to first).
  const sample = arr.find((v) => v !== null) ?? arr[0];
  return infer(sample, elementName, reg);
}

function inferObject(
  obj: Record<string, unknown>,
  nameHint: string,
  reg: Registry,
): ObjectRef {
  return inferMergedObject([obj], nameHint, reg);
}

/**
 * Merge one or more object samples into a single shape. A key missing from any
 * sample, or null in any sample, marks the field optional.
 */
function inferMergedObject(
  samples: Record<string, unknown>[],
  nameHint: string,
  reg: Registry,
): ObjectRef {
  const name = reg.reserveName(nameHint);

  // Preserve first-seen key order across all samples.
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const s of samples) {
    for (const k of Object.keys(s)) {
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
    }
  }

  const fields: ObjectField[] = keys.map((key) => {
    // Collect all values seen for this key.
    const values: unknown[] = [];
    let missing = false;
    let hadNull = false;
    for (const s of samples) {
      if (Object.prototype.hasOwnProperty.call(s, key)) {
        const v = s[key];
        if (v === null) hadNull = true;
        else values.push(v);
      } else {
        missing = true;
      }
    }

    let type: InferredType;
    if (values.length === 0) {
      // Only ever null/missing → nullable "any".
      type = { kind: 'primitive', primitive: 'null' };
    } else if (values.every((v) => v !== null && typeof v === 'object' && !Array.isArray(v))) {
      // Merge nested objects across samples.
      type = inferMergedObject(values as Record<string, unknown>[], key, reg);
    } else {
      type = infer(values[0], key, reg);
    }

    const optional = missing || hadNull;
    return { key, type, optional };
  });

  reg.add({ name, fields });
  return { kind: 'object', name };
}

/* -------------------------------------------------------------------------- */
/* Identifier helpers                                                          */
/* -------------------------------------------------------------------------- */

function splitWords(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
}

function pascalCase(input: string): string {
  const words = splitWords(input);
  const joined = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  // Ensure it does not start with a digit.
  return /^[0-9]/.test(joined) ? `_${joined}` : joined;
}

function camelCase(input: string): string {
  const p = pascalCase(input);
  if (!p) return p;
  return p.charAt(0).toLowerCase() + p.slice(1);
}

function snakeCase(input: string): string {
  const words = splitWords(input).map((w) => w.toLowerCase());
  let joined = words.join('_');
  if (/^[0-9]/.test(joined)) joined = `_${joined}`;
  return joined;
}

/** Very small singularizer — good enough for field-name heuristics. */
function singularize(word: string): string {
  const w = pascalCase(word);
  if (!w) return w;
  if (/ies$/.test(w)) return w.replace(/ies$/, 'y');
  if (/ses$/.test(w) || /xes$/.test(w) || /zes$/.test(w) || /ches$/.test(w) || /shes$/.test(w)) {
    return w.replace(/es$/, '');
  }
  if (/ss$/.test(w)) return w; // "address"
  if (/s$/.test(w)) return w.replace(/s$/, '');
  return w;
}

const VALID_IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

function isValidIdentifier(key: string): boolean {
  return VALID_IDENT.test(key);
}

function sanitizeIdentifier(key: string): string {
  let s = key.replace(/[^A-Za-z0-9_]/g, '_');
  if (!s || /^[0-9]/.test(s)) s = `_${s}`;
  return s;
}

/** Escape a string for embedding in a double-quoted code literal. */
function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/* -------------------------------------------------------------------------- */
/* Root handling                                                               */
/* -------------------------------------------------------------------------- */

interface RootModel {
  reg: Registry;
  root: InferredType;
  rootName: string;
}

function buildModel(value: unknown, rootName: string): RootModel {
  const reg = new Registry();
  const name = pascalCase(rootName) || 'Root';
  let root: InferredType;

  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    root = inferMergedObject([value as Record<string, unknown>], name, reg);
  } else if (Array.isArray(value)) {
    // Reserve the root alias name first so the element type can't claim it,
    // then derive a distinct element-name hint (e.g. Root -> RootItem).
    reg.reserveName(name);
    const singular = singularize(name);
    const elementHint = singular === name ? `${name}Item` : singular;
    root = { kind: 'array', element: inferArrayElement(value, elementHint, reg) };
  } else {
    root = { kind: 'primitive', primitive: classifyPrimitive(value) };
  }

  return { reg, root, rootName: name };
}

/* -------------------------------------------------------------------------- */
/* Emitters                                                                    */
/* -------------------------------------------------------------------------- */

/* ---- TypeScript ---------------------------------------------------------- */

function tsType(t: InferredType): string {
  switch (t.kind) {
    case 'object':
      return t.name;
    case 'array':
      return `${tsType(t.element)}[]`;
    case 'primitive':
      switch (t.primitive) {
        case 'string':
          return 'string';
        case 'integer':
        case 'float':
          return 'number';
        case 'boolean':
          return 'boolean';
        case 'null':
          return 'null';
        case 'any':
          return 'unknown';
      }
  }
}

function emitTypeScript(m: RootModel): string {
  const out: string[] = [];
  for (const shape of m.reg.all()) {
    out.push(`export interface ${shape.name} {`);
    for (const f of shape.fields) {
      const key = isValidIdentifier(f.key) ? f.key : `"${esc(f.key)}"`;
      const opt = f.optional ? '?' : '';
      out.push(`  ${key}${opt}: ${tsType(f.type)};`);
    }
    out.push('}');
    out.push('');
  }

  if (m.root.kind === 'array') {
    out.push(`export type ${m.rootName} = ${tsType(m.root)};`);
  } else if (m.root.kind === 'primitive') {
    out.push(`export type ${m.rootName} = ${tsType(m.root)};`);
  }
  return out.join('\n').trimEnd() + '\n';
}

/* ---- Python shared ------------------------------------------------------- */

function pyType(t: InferredType, imports: Set<string>): string {
  switch (t.kind) {
    case 'object':
      return t.name;
    case 'array':
      imports.add('List');
      return `List[${pyType(t.element, imports)}]`;
    case 'primitive':
      switch (t.primitive) {
        case 'string':
          return 'str';
        case 'integer':
          return 'int';
        case 'float':
          return 'float';
        case 'boolean':
          return 'bool';
        case 'null':
        case 'any':
          imports.add('Any');
          return 'Any';
      }
  }
}

function pyFieldType(f: ObjectField, imports: Set<string>): string {
  const base = pyType(f.type, imports);
  if (f.optional && base !== 'Any') {
    imports.add('Optional');
    return `Optional[${base}]`;
  }
  return base;
}

function pyTypingImportLine(imports: Set<string>): string | null {
  const names = ['Any', 'List', 'Optional'].filter((n) => imports.has(n));
  if (names.length === 0) return null;
  return `from typing import ${names.join(', ')}`;
}

function emitPythonDataclass(m: RootModel): string {
  const imports = new Set<string>();
  const body: string[] = [];
  for (const shape of m.reg.all()) {
    body.push('@dataclass');
    body.push(`class ${shape.name}:`);
    if (shape.fields.length === 0) {
      body.push('    pass');
    } else {
      for (const f of shape.fields) {
        const name = fieldNameForPython(f.key);
        body.push(`    ${name}: ${pyFieldType(f, imports)}`);
      }
    }
    body.push('');
    body.push('');
  }

  const header: string[] = ['from __future__ import annotations', '', 'from dataclasses import dataclass'];
  const typingLine = pyTypingImportLine(imports);
  if (typingLine) header.push(typingLine);
  header.push('');
  header.push('');

  return (header.join('\n') + body.join('\n')).trimEnd() + '\n' + rootAliasComment(m);
}

function emitPythonTypedDict(m: RootModel): string {
  const imports = new Set<string>();
  imports.add('TypedDict');
  const body: string[] = [];
  for (const shape of m.reg.all()) {
    body.push(`class ${shape.name}(TypedDict):`);
    if (shape.fields.length === 0) {
      body.push('    pass');
    } else {
      for (const f of shape.fields) {
        const name = fieldNameForPython(f.key);
        body.push(`    ${name}: ${pyFieldType(f, imports)}`);
      }
    }
    body.push('');
    body.push('');
  }

  const typingNames = ['Any', 'List', 'Optional', 'TypedDict'].filter((n) => imports.has(n));
  const header: string[] = [
    'from __future__ import annotations',
    '',
    `from typing import ${typingNames.join(', ')}`,
    '',
    '',
  ];

  return (header.join('\n') + body.join('\n')).trimEnd() + '\n' + rootAliasComment(m);
}

function emitPythonPydantic(m: RootModel): string {
  const imports = new Set<string>();
  const body: string[] = [];
  for (const shape of m.reg.all()) {
    body.push(`class ${shape.name}(BaseModel):`);
    if (shape.fields.length === 0) {
      body.push('    pass');
    } else {
      for (const f of shape.fields) {
        const name = fieldNameForPython(f.key);
        const type = pyFieldType(f, imports);
        if (name !== f.key) {
          body.push(`    ${name}: ${type} = Field(alias="${esc(f.key)}")`);
          imports.add('Field');
        } else if (f.optional) {
          body.push(`    ${name}: ${type} = None`);
        } else {
          body.push(`    ${name}: ${type}`);
        }
      }
    }
    body.push('');
    body.push('');
  }

  const pydanticNames = ['BaseModel'];
  if (imports.has('Field')) pydanticNames.push('Field');
  const header: string[] = ['from __future__ import annotations', ''];
  const typingLine = pyTypingImportLine(imports);
  if (typingLine) header.push(typingLine);
  header.push(`from pydantic import ${pydanticNames.join(', ')}`);
  header.push('');
  header.push('');

  return (header.join('\n') + body.join('\n')).trimEnd() + '\n' + rootAliasComment(m);
}

function fieldNameForPython(key: string): string {
  const s = snakeCase(key);
  return isValidIdentifier(s) ? s : sanitizeIdentifier(s);
}

function rootAliasComment(m: RootModel): string {
  if (m.root.kind === 'array' && m.root.element.kind === 'object') {
    return `\n# ${m.rootName} document is a JSON array of ${m.root.element.name}\n`;
  }
  return '';
}

/* ---- Go ------------------------------------------------------------------ */

function goType(t: InferredType, optional: boolean): string {
  const ptr = optional ? '*' : '';
  switch (t.kind) {
    case 'object':
      return `${ptr}${t.name}`;
    case 'array':
      return `[]${goType(t.element, false)}`;
    case 'primitive':
      switch (t.primitive) {
        case 'string':
          return `${ptr}string`;
        case 'integer':
          return `${ptr}int`;
        case 'float':
          return `${ptr}float64`;
        case 'boolean':
          return `${ptr}bool`;
        case 'null':
        case 'any':
          return 'interface{}';
      }
  }
}

function emitGo(m: RootModel): string {
  const out: string[] = ['package main', ''];
  for (const shape of m.reg.all()) {
    out.push(`type ${shape.name} struct {`);
    for (const f of shape.fields) {
      const fieldName = pascalCase(f.key) || sanitizeIdentifier(f.key);
      const tag = f.optional ? `\`json:"${esc(f.key)},omitempty"\`` : `\`json:"${esc(f.key)}"\``;
      out.push(`\t${fieldName} ${goType(f.type, f.optional)} ${tag}`);
    }
    out.push('}');
    out.push('');
  }

  if (m.root.kind === 'array') {
    out.push(`type ${m.rootName} ${goType(m.root, false)}`);
  } else if (m.root.kind === 'primitive') {
    out.push(`type ${m.rootName} ${goType(m.root, false)}`);
  }
  return out.join('\n').trimEnd() + '\n';
}

/* ---- Rust ---------------------------------------------------------------- */

function rustType(t: InferredType, optional: boolean): string {
  const wrap = (inner: string) => (optional ? `Option<${inner}>` : inner);
  switch (t.kind) {
    case 'object':
      return wrap(t.name);
    case 'array':
      return wrap(`Vec<${rustType(t.element, false)}>`);
    case 'primitive':
      switch (t.primitive) {
        case 'string':
          return wrap('String');
        case 'integer':
          return wrap('i64');
        case 'float':
          return wrap('f64');
        case 'boolean':
          return wrap('bool');
        case 'null':
        case 'any':
          return 'Option<serde_json::Value>';
      }
  }
}

function emitRust(m: RootModel): string {
  const out: string[] = ['use serde::{Deserialize, Serialize};', ''];
  for (const shape of m.reg.all()) {
    out.push('#[derive(Serialize, Deserialize)]');
    out.push(`pub struct ${shape.name} {`);
    for (const f of shape.fields) {
      const snake = snakeCase(f.key);
      const fieldName = isValidIdentifier(snake) ? snake : sanitizeIdentifier(snake);
      if (fieldName !== f.key) {
        out.push(`    #[serde(rename = "${esc(f.key)}")]`);
      }
      out.push(`    pub ${fieldName}: ${rustType(f.type, f.optional)},`);
    }
    out.push('}');
    out.push('');
  }

  if (m.root.kind === 'array') {
    out.push(`pub type ${m.rootName} = ${rustType(m.root, false)};`);
  } else if (m.root.kind === 'primitive') {
    out.push(`pub type ${m.rootName} = ${rustType(m.root, false)};`);
  }
  return out.join('\n').trimEnd() + '\n';
}

/* ---- Java (records) ------------------------------------------------------ */

function javaType(t: InferredType, optional: boolean): string {
  switch (t.kind) {
    case 'object':
      return t.name;
    case 'array':
      return `List<${javaBoxedType(t.element)}>`;
    case 'primitive':
      switch (t.primitive) {
        case 'string':
          return 'String';
        case 'integer':
          return optional ? 'Long' : 'long';
        case 'float':
          return optional ? 'Double' : 'double';
        case 'boolean':
          return optional ? 'Boolean' : 'boolean';
        case 'null':
        case 'any':
          return 'Object';
      }
  }
}

function javaBoxedType(t: InferredType): string {
  switch (t.kind) {
    case 'object':
      return t.name;
    case 'array':
      return `List<${javaBoxedType(t.element)}>`;
    case 'primitive':
      switch (t.primitive) {
        case 'string':
          return 'String';
        case 'integer':
          return 'Long';
        case 'float':
          return 'Double';
        case 'boolean':
          return 'Boolean';
        case 'null':
        case 'any':
          return 'Object';
      }
  }
}

function emitJava(m: RootModel): string {
  const usesList = m.reg
    .all()
    .some((s) => s.fields.some((f) => containsArray(f.type))) || containsArray(m.root);
  const out: string[] = [];
  if (usesList) {
    out.push('import java.util.List;');
    out.push('');
  }
  for (const shape of m.reg.all()) {
    const params = shape.fields.map((f) => {
      const name = camelCase(f.key) || sanitizeIdentifier(f.key);
      return `${javaType(f.type, f.optional)} ${name}`;
    });
    if (params.length === 0) {
      out.push(`public record ${shape.name}() {}`);
    } else {
      out.push(`public record ${shape.name}(`);
      out.push(params.map((p) => `    ${p}`).join(',\n'));
      out.push(') {}');
    }
    out.push('');
  }

  if (m.root.kind === 'array') {
    out.push(`// ${m.rootName} document is a ${javaType(m.root, false)}`);
  } else if (m.root.kind === 'primitive') {
    out.push(`// ${m.rootName} document is a ${javaType(m.root, false)}`);
  }
  return out.join('\n').trimEnd() + '\n';
}

function containsArray(t: InferredType): boolean {
  if (t.kind === 'array') return true;
  return false;
}

/* ---- Kotlin -------------------------------------------------------------- */

function kotlinType(t: InferredType, optional: boolean): string {
  const q = optional ? '?' : '';
  switch (t.kind) {
    case 'object':
      return `${t.name}${q}`;
    case 'array':
      return `List<${kotlinType(t.element, false)}>${q}`;
    case 'primitive':
      switch (t.primitive) {
        case 'string':
          return `String${q}`;
        case 'integer':
          return `Long${q}`;
        case 'float':
          return `Double${q}`;
        case 'boolean':
          return `Boolean${q}`;
        case 'null':
        case 'any':
          return 'Any?';
      }
  }
}

function emitKotlin(m: RootModel): string {
  const out: string[] = [];
  for (const shape of m.reg.all()) {
    const params = shape.fields.map((f) => {
      const name = camelCase(f.key) || sanitizeIdentifier(f.key);
      return `val ${name}: ${kotlinType(f.type, f.optional)}`;
    });
    if (params.length === 0) {
      out.push(`class ${shape.name}`);
    } else {
      out.push(`data class ${shape.name}(`);
      out.push(params.map((p) => `    ${p}`).join(',\n'));
      out.push(')');
    }
    out.push('');
  }

  if (m.root.kind === 'array') {
    out.push(`typealias ${m.rootName} = ${kotlinType(m.root, false)}`);
  } else if (m.root.kind === 'primitive') {
    out.push(`typealias ${m.rootName} = ${kotlinType(m.root, false)}`);
  }
  return out.join('\n').trimEnd() + '\n';
}

/* ---- Swift --------------------------------------------------------------- */

function swiftType(t: InferredType, optional: boolean): string {
  const q = optional ? '?' : '';
  switch (t.kind) {
    case 'object':
      return `${t.name}${q}`;
    case 'array':
      return `[${swiftType(t.element, false)}]${q}`;
    case 'primitive':
      switch (t.primitive) {
        case 'string':
          return `String${q}`;
        case 'integer':
          return `Int${q}`;
        case 'float':
          return `Double${q}`;
        case 'boolean':
          return `Bool${q}`;
        case 'null':
        case 'any':
          return 'AnyCodable?';
      }
  }
}

function emitSwift(m: RootModel): string {
  const out: string[] = [];
  for (const shape of m.reg.all()) {
    out.push(`struct ${shape.name}: Codable {`);
    const renames: string[] = [];
    for (const f of shape.fields) {
      const name = camelCase(f.key) || sanitizeIdentifier(f.key);
      out.push(`    let ${name}: ${swiftType(f.type, f.optional)}`);
      if (name !== f.key) renames.push(`        case ${name} = "${esc(f.key)}"`);
    }
    if (renames.length > 0) {
      out.push('');
      out.push('    enum CodingKeys: String, CodingKey {');
      out.push(...renames);
      out.push('    }');
    }
    out.push('}');
    out.push('');
  }

  if (m.root.kind === 'array') {
    out.push(`typealias ${m.rootName} = ${swiftType(m.root, false)}`);
  } else if (m.root.kind === 'primitive') {
    out.push(`typealias ${m.rootName} = ${swiftType(m.root, false)}`);
  }
  return out.join('\n').trimEnd() + '\n';
}

/* ---- JSON Schema --------------------------------------------------------- */

interface SchemaNode {
  [key: string]: unknown;
}

function schemaForType(t: InferredType, m: RootModel): SchemaNode {
  switch (t.kind) {
    case 'object':
      return { $ref: `#/$defs/${t.name}` };
    case 'array':
      return { type: 'array', items: schemaForType(t.element, m) };
    case 'primitive':
      switch (t.primitive) {
        case 'string':
          return { type: 'string' };
        case 'integer':
          return { type: 'integer' };
        case 'float':
          return { type: 'number' };
        case 'boolean':
          return { type: 'boolean' };
        case 'null':
          return { type: 'null' };
        case 'any':
          return {};
      }
  }
}

function schemaForShape(shape: ObjectShape, m: RootModel): SchemaNode {
  const properties: SchemaNode = {};
  const required: string[] = [];
  for (const f of shape.fields) {
    let node = schemaForType(f.type, m);
    if (f.optional && f.type.kind === 'primitive' && f.type.primitive !== 'null' && f.type.primitive !== 'any') {
      node = { type: [node.type as string, 'null'] };
    }
    properties[f.key] = node;
    if (!f.optional) required.push(f.key);
  }
  const result: SchemaNode = { type: 'object', properties };
  if (required.length > 0) result.required = required;
  result.additionalProperties = false;
  return result;
}

function emitJsonSchema(m: RootModel): string {
  const defs: SchemaNode = {};
  for (const shape of m.reg.all()) {
    defs[shape.name] = schemaForShape(shape, m);
  }

  const schema: SchemaNode = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: m.rootName,
  };

  if (m.root.kind === 'object') {
    const rootShape = m.reg.all().find((s) => s.name === (m.root as ObjectRef).name);
    if (rootShape) {
      const rootSchema = schemaForShape(rootShape, m);
      Object.assign(schema, rootSchema);
    }
    // Remove root from $defs (inlined at top level) but keep the rest.
    delete defs[(m.root as ObjectRef).name];
  } else {
    Object.assign(schema, schemaForType(m.root, m));
  }

  if (Object.keys(defs).length > 0) {
    schema.$defs = defs;
  }

  return JSON.stringify(schema, null, 2) + '\n';
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

export function jsonToCode(
  json: string,
  target: JsonToCodeTarget,
  rootName = 'Root',
): JsonToCodeResult {
  try {
    if (!json || json.trim() === '') {
      return { code: '', error: null };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Invalid JSON';
      return { code: '', error: message };
    }

    const model = buildModel(parsed, rootName || 'Root');

    let code: string;
    switch (target) {
      case 'typescript':
        code = emitTypeScript(model);
        break;
      case 'python-dataclass':
        code = emitPythonDataclass(model);
        break;
      case 'python-typeddict':
        code = emitPythonTypedDict(model);
        break;
      case 'python-pydantic':
        code = emitPythonPydantic(model);
        break;
      case 'go':
        code = emitGo(model);
        break;
      case 'rust':
        code = emitRust(model);
        break;
      case 'java':
        code = emitJava(model);
        break;
      case 'kotlin':
        code = emitKotlin(model);
        break;
      case 'swift':
        code = emitSwift(model);
        break;
      case 'json-schema':
        code = emitJsonSchema(model);
        break;
      default:
        return { code: '', error: `Unsupported target: ${String(target)}` };
    }

    return { code, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return { code: '', error: message };
  }
}
