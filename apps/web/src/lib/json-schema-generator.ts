/**
 * Infer a structural schema from JSON sample values and emit JSON Schema or typed code.
 * All logic is client-side; intended for developer drafts, not security-critical validation.
 */

export type OutputLanguage =
  | 'jsonSchema'
  | 'python'
  | 'typescript'
  | 'go'
  | 'rust'
  | 'java'
  | 'csharp'
  | 'dart'
  | 'swift';

/** UI order for output language select; labels come from next-intl `JsonSchemaGenerator.languages.*`. */
export const OUTPUT_LANGUAGE_ORDER: readonly OutputLanguage[] = [
  'python',
  'typescript',
  'jsonSchema',
  'go',
  'rust',
  'java',
  'csharp',
  'dart',
  'swift',
] as const;

type ScalarJson = 'string' | 'number' | 'integer' | 'boolean' | 'null';

export type StringFormat =
  | 'date-time'
  | 'date'
  | 'time'
  | 'email'
  | 'uri'
  | 'uuid'
  | 'ipv4';

export type SchemaNode =
  | { kind: 'scalar'; t: ScalarJson; format?: StringFormat }
  | { kind: 'array'; item: SchemaNode }
  | { kind: 'object'; fields: Record<string, { node: SchemaNode; optional: boolean }> }
  | { kind: 'union'; variants: SchemaNode[] };

// Anchored, specific -> general. First match wins.
const FORMAT_PATTERNS: ReadonlyArray<readonly [StringFormat, RegExp]> = [
  ['uuid', /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/],
  ['date-time', /^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/],
  ['date', /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/],
  ['time', /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d+)?$/],
  ['email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/],
  ['ipv4', /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/],
  ['uri', /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^\s]+$/],
];

export function detectFormat(value: string): StringFormat | undefined {
  for (const [fmt, re] of FORMAT_PATTERNS) {
    if (re.test(value)) return fmt;
  }
  return undefined;
}

function fingerprint(n: SchemaNode): string {
  switch (n.kind) {
    case 'scalar':
      return `s:${n.t}${n.format ? ':' + n.format : ''}`;
    case 'array':
      return `a:${fingerprint(n.item)}`;
    case 'object': {
      const keys = Object.keys(n.fields).sort();
      return `o:{${keys.map((k) => `${k}:${fingerprint(n.fields[k].node)}:${n.fields[k].optional}`).join(',')}}`;
    }
    case 'union':
      return `u:${n.variants.map(fingerprint).sort().join('|')}`;
    default:
      return '?';
  }
}

function flattenUnion(nodes: SchemaNode[]): SchemaNode {
  const flat: SchemaNode[] = [];
  for (const node of nodes) {
    if (node.kind === 'union') flat.push(...node.variants);
    else flat.push(node);
  }
  const seen = new Set<string>();
  const out: SchemaNode[] = [];
  for (const node of flat) {
    const fp = fingerprint(node);
    if (!seen.has(fp)) {
      seen.add(fp);
      out.push(node);
    }
  }
  if (out.length === 1) return out[0];
  return { kind: 'union', variants: out };
}

function mergeObjects(a: SchemaNode, b: SchemaNode): SchemaNode {
  if (a.kind !== 'object' || b.kind !== 'object') {
    return flattenUnion([a, b]);
  }
  const keys = new Set([...Object.keys(a.fields), ...Object.keys(b.fields)]);
  const fields: Record<string, { node: SchemaNode; optional: boolean }> = {};
  for (const k of keys) {
    const inA = k in a.fields;
    const inB = k in b.fields;
    if (inA && inB) {
      fields[k] = {
        node: mergeNodes(a.fields[k].node, b.fields[k].node),
        optional: a.fields[k].optional || b.fields[k].optional,
      };
    } else if (inA) {
      fields[k] = { node: a.fields[k].node, optional: true };
    } else {
      fields[k] = { node: b.fields[k].node, optional: true };
    }
  }
  return { kind: 'object', fields };
}

export function mergeNodes(a: SchemaNode, b: SchemaNode): SchemaNode {
  if (fingerprint(a) === fingerprint(b)) return a;

  if (a.kind === 'scalar' && b.kind === 'scalar') {
    if (a.t === b.t) {
      if (a.t === 'string' && a.format !== b.format) {
        return { kind: 'scalar', t: 'string' };
      }
      return a;
    }
    if (
      (a.t === 'integer' && b.t === 'number') ||
      (a.t === 'number' && b.t === 'integer')
    ) {
      return { kind: 'scalar', t: 'number' };
    }
    return flattenUnion([a, b]);
  }

  if (a.kind === 'array' && b.kind === 'array') {
    return { kind: 'array', item: mergeNodes(a.item, b.item) };
  }

  if (a.kind === 'object' && b.kind === 'object') {
    return mergeObjects(a, b);
  }

  return flattenUnion([a, b]);
}

export function inferSchema(value: unknown): SchemaNode {
  if (value === null) return { kind: 'scalar', t: 'null' };
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { kind: 'array', item: { kind: 'scalar', t: 'null' } };
    }
    let acc = inferSchema(value[0]);
    for (let i = 1; i < value.length; i++) {
      acc = mergeNodes(acc, inferSchema(value[i]));
    }
    return { kind: 'array', item: acc };
  }
  const ty = typeof value;
  if (ty === 'string') {
    const format = detectFormat(value as string);
    return format
      ? { kind: 'scalar', t: 'string', format }
      : { kind: 'scalar', t: 'string' };
  }
  if (ty === 'boolean') return { kind: 'scalar', t: 'boolean' };
  if (ty === 'number') {
    const n = value as number;
    const int =
      Number.isInteger(n) && Math.abs(n) <= Number.MAX_SAFE_INTEGER;
    return { kind: 'scalar', t: int ? 'integer' : 'number' };
  }
  if (ty === 'object' && value !== null) {
    const fields: Record<string, { node: SchemaNode; optional: boolean }> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      fields[k] = { node: inferSchema(v), optional: false };
    }
    return { kind: 'object', fields };
  }
  return { kind: 'scalar', t: 'null' };
}

export function collectFormats(node: SchemaNode): Map<StringFormat, number> {
  const counts = new Map<StringFormat, number>();
  const walk = (n: SchemaNode): void => {
    switch (n.kind) {
      case 'scalar':
        if (n.format) counts.set(n.format, (counts.get(n.format) ?? 0) + 1);
        return;
      case 'array':
        walk(n.item);
        return;
      case 'object':
        for (const { node: child } of Object.values(n.fields)) walk(child);
        return;
      case 'union':
        n.variants.forEach(walk);
        return;
    }
  };
  walk(node);
  return counts;
}

function jsonSchemaTypeFragment(node: SchemaNode): Record<string, unknown> {
  switch (node.kind) {
    case 'scalar': {
      const frag: Record<string, unknown> = { type: node.t };
      if (node.t === 'string' && node.format) frag.format = node.format;
      return frag;
    }
    case 'array':
      return { type: 'array', items: toJsonSchemaFragment(node.item) };
    case 'object': {
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      for (const [k, { node: child, optional }] of Object.entries(node.fields)) {
        properties[k] = toJsonSchemaFragment(child);
        if (!optional) required.push(k);
      }
      const base: Record<string, unknown> = {
        type: 'object',
        properties,
      };
      if (required.length) base.required = required;
      return base;
    }
    case 'union':
      return { anyOf: node.variants.map(toJsonSchemaFragment) };
    default:
      return {};
  }
}

function toJsonSchemaFragment(node: SchemaNode): Record<string, unknown> {
  return jsonSchemaTypeFragment(node);
}

export function toJsonSchemaDocument(
  node: SchemaNode,
  title = 'Generated'
): Record<string, unknown> {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://example.com/generated.schema.json',
    title,
    ...toJsonSchemaFragment(node),
  };
}

function pascal(parts: string[]): string {
  const cap = (s: string) =>
    s.length === 0 ? '' : s[0].toUpperCase() + s.slice(1).replace(/[^a-zA-Z0-9]/g, '');
  const name = parts.map((p) => cap(p)).join('');
  return name || 'Value';
}

function typeNameForPath(path: string[]): string {
  if (path.length === 0) return 'Root';
  return pascal(['root', ...path]);
}

const PY_KEYWORDS = new Set([
  'False',
  'None',
  'True',
  'and',
  'as',
  'assert',
  'async',
  'await',
  'break',
  'class',
  'continue',
  'def',
  'del',
  'elif',
  'else',
  'except',
  'finally',
  'for',
  'from',
  'global',
  'if',
  'import',
  'in',
  'is',
  'lambda',
  'nonlocal',
  'not',
  'or',
  'pass',
  'raise',
  'return',
  'try',
  'while',
  'with',
  'yield',
]);

function pyFieldName(jsonKey: string): string {
  const base = jsonKey.replace(/[^a-zA-Z0-9_]/g, '_');
  const snake = base.replace(/([A-Z])/g, '_$1').replace(/^_/, '').toLowerCase();
  const name = snake || 'field';
  if (PY_KEYWORDS.has(name)) return `${name}_`;
  if (/^[0-9]/.test(name)) return `_${name}`;
  return name;
}

function tsEscapeKey(k: string): string {
  if (/^[a-zA-Z_$][\w$]*$/.test(k)) return k;
  return JSON.stringify(k);
}

function goFieldName(jsonKey: string): string {
  const parts = jsonKey.split(/[-_\s.]+/g).filter(Boolean);
  if (parts.length === 0) return 'Field';
  return parts.map((p) => pascal([p])).join('');
}

function csharpSafeProp(jsonKey: string): string {
  return goFieldName(jsonKey);
}

function scalarToPython(node: SchemaNode): string | null {
  if (node.kind !== 'scalar') return null;
  switch (node.t) {
    case 'string':
      return 'str';
    case 'integer':
      return 'int';
    case 'number':
      return 'float';
    case 'boolean':
      return 'bool';
    case 'null':
      return 'None';
    default:
      return 'Any';
  }
}

function scalarToTs(node: SchemaNode): string | null {
  if (node.kind !== 'scalar') return null;
  switch (node.t) {
    case 'string':
      return 'string';
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'null':
      return 'null';
    default:
      return 'unknown';
  }
}

function emitPythonType(
  node: SchemaNode,
  path: string[],
  defs: Map<string, string>
): string {
  const scalar = scalarToPython(node);
  if (scalar !== null) {
    if (node.kind === 'scalar' && node.t === 'null') return 'None';
    return scalar;
  }
  if (node.kind === 'array') {
    const inner = emitPythonType(node.item, [...path, 'item'], defs);
    return `list[${inner}]`;
  }
  if (node.kind === 'union') {
    const parts = node.variants.map((v) => emitPythonType(v, path, defs));
    return parts.join(' | ');
  }
  if (node.kind === 'object') {
    const name = typeNameForPath(path);
    if (!defs.has(name)) {
      defs.set(name, '');
      const lines: string[] = [];
      lines.push(`class ${name}(BaseModel):`);
      const keys = Object.keys(node.fields).sort();
      if (keys.length === 0) {
        lines.push('    pass');
      } else {
        for (const k of keys) {
          const { node: child, optional } = node.fields[k];
          const pyName = pyFieldName(k);
          let ann = emitPythonType(child, [...path, k], defs);
          if (child.kind === 'scalar' && child.t === 'null') {
            ann = 'None';
          }
          const useAlias = pyName !== k;
          const aliasArg = useAlias ? `alias=${JSON.stringify(k)}` : '';
          if (optional) {
            if (ann !== 'None' && !ann.includes('| None')) {
              ann = `${ann} | None`;
            }
            const inner = aliasArg
              ? `default=None, ${aliasArg}`
              : 'default=None';
            lines.push(`    ${pyName}: ${ann} = Field(${inner})`);
          } else if (useAlias) {
            lines.push(`    ${pyName}: ${ann} = Field(${aliasArg})`);
          } else {
            lines.push(`    ${pyName}: ${ann}`);
          }
        }
      }
      defs.set(name, lines.join('\n'));
    }
    return name;
  }
  return 'Any';
}

export function generatePython(node: SchemaNode): string {
  const defs = new Map<string, string>();
  const rootAnn = emitPythonType(node, [], defs);
  const classes = [...defs.entries()]
    .filter(([, code]) => code.length)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, code]) => code)
    .join('\n\n\n');
  const header = `from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field
`;
  if (node.kind === 'object') {
    return `${header}\n\n${classes}\n`;
  }
  return `${header}

# Inferred type for root JSON value:
RootAlias = ${rootAnn}
`;
}

export function generateTypeScript(node: SchemaNode): string {
  function typeRef(n: SchemaNode, path: string[]): string {
    const s = scalarToTs(n);
    if (s !== null) return s;
    if (n.kind === 'array') return `${typeRef(n.item, [...path, 'item'])}[]`;
    if (n.kind === 'union') {
      return n.variants.map((v) => typeRef(v, path)).join(' | ');
    }
    if (n.kind === 'object') {
      return typeNameForPath(path);
    }
    return 'unknown';
  }

  if (node.kind === 'object') {
    const declared = new Set<string>();
    const parts: string[] = [];
    function declareObject(n: SchemaNode, path: string[]) {
      if (n.kind !== 'object') return;
      const name = typeNameForPath(path);
      if (declared.has(name)) return;
      const keys = Object.keys(n.fields).sort();
      for (const k of keys) {
        const child = n.fields[k].node;
        if (child.kind === 'object') declareObject(child, [...path, k]);
        if (child.kind === 'array' && child.item.kind === 'object') {
          declareObject(child.item, [...path, k, 'item']);
        }
      }
      declared.add(name);
      const lines = keys.map((k) => {
        const { node: child, optional } = n.fields[k];
        const opt = optional ? '?' : '';
        return `  ${tsEscapeKey(k)}${opt}: ${typeRef(child, [...path, k])};`;
      });
      parts.push(`export interface ${name} {\n${lines.join('\n')}\n}`);
    }
    declareObject(node, []);
    return parts.join('\n\n') + '\n';
  }
  return `export type Root = ${typeRef(node, [])};\n`;
}

export function generateGo(node: SchemaNode): string {
  function structBody(n: SchemaNode, path: string[]): { lines: string[]; deps: string[] } {
    if (n.kind !== 'object') return { lines: [], deps: [] };
    const lines: string[] = [];
    const deps: string[] = [];
    const keys = Object.keys(n.fields).sort();
    for (const k of keys) {
      const { node: child, optional } = n.fields[k];
      const goName = goFieldName(k);
      const tag = k;
      const { typeStr, extraDeps } = goType(child, [...path, k], optional);
      deps.push(...extraDeps);
      lines.push(`\t${goName} ${typeStr} \`json:"${tag}${optional ? ',omitempty' : ''}"\``);
    }
    return { lines, deps };
  }

  function goType(
    n: SchemaNode,
    path: string[],
    optional: boolean
  ): { typeStr: string; extraDeps: string[] } {
    const scalar = (t: string) => ({
      typeStr: optional ? `*${t}` : t,
      extraDeps: [] as string[],
    });
    if (n.kind === 'scalar') {
      switch (n.t) {
        case 'string':
          return scalar('string');
        case 'integer':
          return scalar('int64');
        case 'number':
          return scalar('float64');
        case 'boolean':
          return scalar('bool');
        case 'null':
          return { typeStr: 'json.RawMessage', extraDeps: [] };
        default:
          return { typeStr: 'json.RawMessage', extraDeps: [] };
      }
    }
    if (n.kind === 'array') {
      const inner = goType(n.item, [...path, 'item'], false);
      const slice = `[]${inner.typeStr}`;
      return {
        typeStr: optional ? `*${slice}` : slice,
        extraDeps: inner.extraDeps,
      };
    }
    if (n.kind === 'union') {
      return { typeStr: 'json.RawMessage', extraDeps: [] };
    }
    if (n.kind === 'object') {
      const name = typeNameForPath(path);
      return {
        typeStr: optional ? `*${name}` : name,
        extraDeps: [name],
      };
    }
    return { typeStr: 'json.RawMessage', extraDeps: [] };
  }

  const structs: string[] = [];
  const seen = new Set<string>();

  function walk(n: SchemaNode, path: string[]) {
    if (n.kind === 'object') {
      const name = typeNameForPath(path);
      if (seen.has(name)) return;
      seen.add(name);
      const keys = Object.keys(n.fields).sort();
      for (const k of keys) {
        const ch = n.fields[k].node;
        if (ch.kind === 'object') walk(ch, [...path, k]);
        if (ch.kind === 'array' && ch.item.kind === 'object') walk(ch.item, [...path, k, 'item']);
      }
      const { lines } = structBody(n, path);
      structs.push(`type ${name} struct {\n${lines.join('\n')}\n}`);
    } else if (n.kind === 'array' && n.item.kind === 'object') {
      walk(n.item, [...path, 'item']);
    }
  }

  walk(node, []);

  if (node.kind !== 'object') {
    return `package main

import "encoding/json"

// Root wraps non-object JSON root.
type Root = json.RawMessage
`;
  }

  return `package main

import "encoding/json"

${structs.join('\n\n')}
`;
}

export function generateRust(node: SchemaNode): string {
  function rsType(n: SchemaNode, path: string[], optional: boolean): string {
    const wrap = (s: string) => (optional ? `Option<${s}>` : s);
    if (n.kind === 'scalar') {
      switch (n.t) {
        case 'string':
          return wrap('String');
        case 'integer':
          return wrap('i64');
        case 'number':
          return wrap('f64');
        case 'boolean':
          return wrap('bool');
        case 'null':
          return wrap('serde_json::Value');
        default:
          return wrap('serde_json::Value');
      }
    }
    if (n.kind === 'array') {
      return wrap(`Vec<${rsType(n.item, [...path, 'item'], false)}>`);
    }
    if (n.kind === 'union') {
      return wrap('serde_json::Value');
    }
    if (n.kind === 'object') {
      return wrap(typeNameForPath(path));
    }
    return wrap('serde_json::Value');
  }

  const structs: string[] = [];
  const seen = new Set<string>();

  function walk(n: SchemaNode, path: string[]) {
    if (n.kind === 'object') {
      const name = typeNameForPath(path);
      if (seen.has(name)) return;
      seen.add(name);
      const keys = Object.keys(n.fields).sort();
      for (const k of keys) {
        const ch = n.fields[k].node;
        if (ch.kind === 'object') walk(ch, [...path, k]);
        if (ch.kind === 'array' && ch.item.kind === 'object') walk(ch.item, [...path, k, 'item']);
      }
      const fields = keys.map((k) => {
        const { node: child, optional } = n.fields[k];
        const serde = `#[serde(rename = "${k.replace(/"/g, '\\"')}")]`;
        return `${serde}\n    pub ${k.replace(/[^a-zA-Z0-9_]/g, '_')}: ${rsType(child, [...path, k], optional)}`;
      });
      structs.push(
        `#[derive(Debug, Clone, Serialize, Deserialize)]\npub struct ${name} {\n    ${fields.join(',\n    ')}\n}`
      );
    } else if (n.kind === 'array' && n.item.kind === 'object') {
      walk(n.item, [...path, 'item']);
    }
  }

  walk(node, []);

  if (node.kind !== 'object') {
    return `use serde::{Deserialize, Serialize};

pub type Root = serde_json::Value;
`;
  }

  return `use serde::{Deserialize, Serialize};

${structs.join('\n\n')}
`;
}

export function generateJava(node: SchemaNode): string {
  function jType(n: SchemaNode, path: string[], optional: boolean): string {
    const wrap = (s: string) => (optional ? `Optional<${s}>` : s);
    if (n.kind === 'scalar') {
      switch (n.t) {
        case 'string':
          return wrap('String');
        case 'integer':
          return wrap('Long');
        case 'number':
          return wrap('Double');
        case 'boolean':
          return wrap('Boolean');
        case 'null':
          return wrap('JsonNode');
        default:
          return wrap('JsonNode');
      }
    }
    if (n.kind === 'array') {
      return wrap(`java.util.List<${jType(n.item, [...path, 'item'], false)}>`);
    }
    if (n.kind === 'union') {
      return wrap('JsonNode');
    }
    if (n.kind === 'object') {
      return wrap(typeNameForPath(path));
    }
    return wrap('JsonNode');
  }

  const classes: string[] = [];
  const seen = new Set<string>();

  function walk(n: SchemaNode, path: string[]) {
    if (n.kind === 'object') {
      const name = typeNameForPath(path);
      if (seen.has(name)) return;
      seen.add(name);
      const keys = Object.keys(n.fields).sort();
      for (const k of keys) {
        const ch = n.fields[k].node;
        if (ch.kind === 'object') walk(ch, [...path, k]);
        if (ch.kind === 'array' && ch.item.kind === 'object') walk(ch.item, [...path, k, 'item']);
      }
      const fields = keys.map((k) => {
        const { node: child, optional } = n.fields[k];
        const jName = goFieldName(k);
        return `
    @JsonProperty("${k}")
    public ${jType(child, [...path, k], optional)} ${jName};`;
      });
      classes.push(`public class ${name} {${fields.join('')}
}`);
    } else if (n.kind === 'array' && n.item.kind === 'object') {
      walk(n.item, [...path, 'item']);
    }
  }

  walk(node, []);

  if (node.kind !== 'object') {
    return `import com.fasterxml.jackson.databind.JsonNode;

// Non-object JSON root: use JsonNode or ObjectMapper.readTree(String).
`;
  }

  return `import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.*;

${classes.join('\n\n')}
`;
}

export function generateCSharp(node: SchemaNode): string {
  function csType(n: SchemaNode, path: string[], optional: boolean): string {
    const wrap = (s: string) => (optional ? `${s}?` : s);
    if (n.kind === 'scalar') {
      switch (n.t) {
        case 'string':
          return wrap('string');
        case 'integer':
          return wrap('long');
        case 'number':
          return wrap('double');
        case 'boolean':
          return wrap('bool');
        case 'null':
          return 'JsonElement?';
        default:
          return 'JsonElement?';
      }
    }
    if (n.kind === 'array') {
      return wrap(`List<${csType(n.item, [...path, 'item'], false)}>`);
    }
    if (n.kind === 'union') {
      return 'JsonElement';
    }
    if (n.kind === 'object') {
      return wrap(typeNameForPath(path));
    }
    return 'JsonElement?';
  }

  const classes: string[] = [];
  const seen = new Set<string>();

  function walk(n: SchemaNode, path: string[]) {
    if (n.kind === 'object') {
      const name = typeNameForPath(path);
      if (seen.has(name)) return;
      seen.add(name);
      const keys = Object.keys(n.fields).sort();
      for (const k of keys) {
        const ch = n.fields[k].node;
        if (ch.kind === 'object') walk(ch, [...path, k]);
        if (ch.kind === 'array' && ch.item.kind === 'object') walk(ch.item, [...path, k, 'item']);
      }
      const props = keys.map((k) => {
        const { node: child, optional } = n.fields[k];
        const pname = csharpSafeProp(k);
        return `
    [JsonPropertyName("${k}")]
    public ${csType(child, [...path, k], optional)} ${pname} { get; set; }`;
      });
      classes.push(`public class ${name}
{${props.join('')}
}`);
    } else if (n.kind === 'array' && n.item.kind === 'object') {
      walk(n.item, [...path, 'item']);
    }
  }

  walk(node, []);

  if (node.kind !== 'object') {
    return `using System.Text.Json;

// For non-object roots, use JsonElement or JsonNode.
public record Root(JsonElement Value);
`;
  }

  return `using System.Collections.Generic;
using System.Text.Json.Serialization;

${classes.join('\n\n')}
`;
}

export function generateDart(node: SchemaNode): string {
  function dType(n: SchemaNode, path: string[]): string {
    if (n.kind === 'scalar') {
      switch (n.t) {
        case 'string':
          return 'String';
        case 'integer':
        case 'number':
          return 'num';
        case 'boolean':
          return 'bool';
        case 'null':
          return 'dynamic';
        default:
          return 'dynamic';
      }
    }
    if (n.kind === 'array') {
      return `List<${dType(n.item, [...path, 'item'])}>`;
    }
    if (n.kind === 'union') {
      return 'dynamic';
    }
    if (n.kind === 'object') {
      return typeNameForPath(path);
    }
    return 'dynamic';
  }

  function dartParseExpr(
    child: SchemaNode,
    fieldPath: string[],
    jsonAccess: string
  ): string {
    if (child.kind === 'scalar') {
      switch (child.t) {
        case 'string':
          return `${jsonAccess} as String`;
        case 'integer':
        case 'number':
          return `${jsonAccess} as num`;
        case 'boolean':
          return `${jsonAccess} as bool`;
        case 'null':
          return jsonAccess;
        default:
          return jsonAccess;
      }
    }
    if (child.kind === 'array') {
      const item = child.item;
      const itemPath = [...fieldPath, 'item'];
      if (item.kind === 'object') {
        const itemName = typeNameForPath(itemPath);
        return `(${jsonAccess} as List<dynamic>).map((e) => ${itemName}.fromJson(e as Map<String, dynamic>)).toList()`;
      }
      const inner = dType(item, itemPath);
      return `(${jsonAccess} as List<dynamic>).map((e) => e as ${inner}).toList()`;
    }
    if (child.kind === 'object') {
      const nm = typeNameForPath(fieldPath);
      return `${nm}.fromJson(${jsonAccess} as Map<String, dynamic>)`;
    }
    return jsonAccess;
  }

  const classes: string[] = [];
  const seen = new Set<string>();

  function walk(n: SchemaNode, path: string[]) {
    if (n.kind === 'object') {
      const name = typeNameForPath(path);
      if (seen.has(name)) return;
      seen.add(name);
      const keys = Object.keys(n.fields).sort();
      for (const k of keys) {
        const ch = n.fields[k].node;
        if (ch.kind === 'object') walk(ch, [...path, k]);
        if (ch.kind === 'array' && ch.item.kind === 'object') walk(ch.item, [...path, k, 'item']);
      }
      const fields = keys.map((k) => {
        const { node: child, optional } = n.fields[k];
        return `    final ${dType(child, [...path, k])}${optional ? '?' : ''} ${pyFieldName(k)};`;
      });
      const ctorParams = keys.map((k) => {
        const opt = n.fields[k].optional;
        const fn = pyFieldName(k);
        return opt ? `this.${fn}` : `required this.${fn}`;
      });
      const fromJsonLines = keys.map((k) => {
        const fn = pyFieldName(k);
        const acc = `json['${k.replace(/'/g, "\\'")}']`;
        const { node: child, optional } = n.fields[k];
        let expr = dartParseExpr(child, [...path, k], acc);
        if (optional) {
          expr = `${acc} == null ? null : (${expr})`;
        }
        return `      ${fn}: ${expr},`;
      });
      classes.push(`class ${name} {
${fields.join('\n')}

  ${name}({${ctorParams.join(', ')}});

  factory ${name}.fromJson(Map<String, dynamic> json) {
    return ${name}(
${fromJsonLines.join('\n')}
    );
  }
}`);
    } else if (n.kind === 'array' && n.item.kind === 'object') {
      walk(n.item, [...path, 'item']);
    }
  }

  walk(node, []);

  if (node.kind !== 'object') {
    return '// Non-object root: use dynamic or decode with jsonDecode.\ntypedef Root = dynamic;\n';
  }

  return classes.join('\n\n') + '\n';
}

export function generateSwift(node: SchemaNode): string {
  function swType(n: SchemaNode, path: string[], optional: boolean): string {
    const opt = optional ? '?' : '';
    if (n.kind === 'scalar') {
      switch (n.t) {
        case 'string':
          return `String${opt}`;
        case 'integer':
          return `Int64${opt}`;
        case 'number':
          return `Double${opt}`;
        case 'boolean':
          return `Bool${opt}`;
        case 'null':
          return `String${opt}`;
        default:
          return `String${opt}`;
      }
    }
    if (n.kind === 'array') {
      return `[${swType(n.item, [...path, 'item'], false)}]${opt}`;
    }
    if (n.kind === 'union') {
      return `String${opt}`;
    }
    if (n.kind === 'object') {
      return `${typeNameForPath(path)}${opt}`;
    }
    return `String${opt}`;
  }

  const structs: string[] = [];
  const seen = new Set<string>();

  function walk(n: SchemaNode, path: string[]) {
    if (n.kind === 'object') {
      const name = typeNameForPath(path);
      if (seen.has(name)) return;
      seen.add(name);
      const keys = Object.keys(n.fields).sort();
      for (const k of keys) {
        const ch = n.fields[k].node;
        if (ch.kind === 'object') walk(ch, [...path, k]);
        if (ch.kind === 'array' && ch.item.kind === 'object') walk(ch.item, [...path, k, 'item']);
      }
      const coding = keys
        .map((k) => `        case ${pyFieldName(k)} = "${k.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
        .join('\n');
      const props = keys.map((k) => {
        const { node: child, optional } = n.fields[k];
        return `    let ${pyFieldName(k)}: ${swType(child, [...path, k], optional)}`;
      });
      structs.push(`struct ${name}: Codable {
    enum CodingKeys: String, CodingKey {
${coding}
    }
${props.join('\n')}
}`);
    } else if (n.kind === 'array' && n.item.kind === 'object') {
      walk(n.item, [...path, 'item']);
    }
  }

  walk(node, []);

  if (node.kind !== 'object') {
    return `// Non-object JSON root: decode as Array, Dictionary, or a scalar using JSONSerialization.\n`;
  }

  return `import Foundation

// Note: fields inferred as mixed or null-only types use String as a placeholder — adjust before production use.

${structs.join('\n\n')}
`;
}

export function generateFromSchema(node: SchemaNode, lang: OutputLanguage): string {
  switch (lang) {
    case 'jsonSchema':
      return JSON.stringify(toJsonSchemaDocument(node), null, 2);
    case 'python':
      return generatePython(node);
    case 'typescript':
      return generateTypeScript(node);
    case 'go':
      return generateGo(node);
    case 'rust':
      return generateRust(node);
    case 'java':
      return generateJava(node);
    case 'csharp':
      return generateCSharp(node);
    case 'dart':
      return generateDart(node);
    case 'swift':
      return generateSwift(node);
    default:
      return '';
  }
}
