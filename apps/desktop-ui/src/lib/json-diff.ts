/**
 * Pure logic for the JSON Diff tool.
 * Semantic, structure-aware diff of two JSON documents: key order and
 * formatting are ignored. All exported functions are total and never throw.
 */

export type ChangeType = 'added' | 'removed' | 'changed'

export interface JsonChange {
  /** Dot/bracket path, e.g. `users[2].name`. `$` denotes the document root. */
  path: string
  type: ChangeType
  before?: unknown
  after?: unknown
}

export interface DiffOptions {
  /** Compare arrays as multisets of deep-equal values instead of by index. */
  ignoreArrayOrder?: boolean
}

export interface DiffResult {
  error: string | null
  changes: JsonChange[]
}

/* --------------------------------- helpers -------------------------------- */

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Deep structural equality for JSON values (key order insensitive). */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a)
    const bKeys = Object.keys(b)
    if (aKeys.length !== bKeys.length) return false
    for (const k of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(b, k)) return false
      if (!deepEqual(a[k], b[k])) return false
    }
    return true
  }
  return false
}

const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/

function joinKey(base: string, key: string): string {
  if (IDENT_RE.test(key)) return base === '$' ? key : `${base}.${key}`
  const quoted = `[${JSON.stringify(key)}]`
  return base === '$' ? quoted : `${base}${quoted}`
}

function joinIndex(base: string, index: number): string {
  return base === '$' ? `$[${index}]` : `${base}[${index}]`
}

/* ---------------------------------- diff ---------------------------------- */

function diffValues(
  a: unknown,
  b: unknown,
  path: string,
  changes: JsonChange[],
  opts: DiffOptions,
): void {
  if (deepEqual(a, b)) return

  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    for (const key of keys) {
      const inA = Object.prototype.hasOwnProperty.call(a, key)
      const inB = Object.prototype.hasOwnProperty.call(b, key)
      const childPath = joinKey(path, key)
      if (inA && !inB) {
        changes.push({ path: childPath, type: 'removed', before: a[key] })
      } else if (!inA && inB) {
        changes.push({ path: childPath, type: 'added', after: b[key] })
      } else {
        diffValues(a[key], b[key], childPath, changes, opts)
      }
    }
    return
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (opts.ignoreArrayOrder) {
      diffArraysUnordered(a, b, path, changes)
    } else {
      const min = Math.min(a.length, b.length)
      for (let i = 0; i < min; i++) {
        diffValues(a[i], b[i], joinIndex(path, i), changes, opts)
      }
      for (let i = min; i < a.length; i++) {
        changes.push({ path: joinIndex(path, i), type: 'removed', before: a[i] })
      }
      for (let i = min; i < b.length; i++) {
        changes.push({ path: joinIndex(path, i), type: 'added', after: b[i] })
      }
    }
    return
  }

  // Scalars, or values of different kinds (object vs array vs scalar).
  changes.push({ path, type: 'changed', before: a, after: b })
}

/** Compare arrays as multisets of deep-equal values. */
function diffArraysUnordered(
  a: unknown[],
  b: unknown[],
  path: string,
  changes: JsonChange[],
): void {
  const matchedB = new Array<boolean>(b.length).fill(false)
  const unmatchedA: number[] = []

  for (let i = 0; i < a.length; i++) {
    let found = false
    for (let j = 0; j < b.length; j++) {
      if (!matchedB[j] && deepEqual(a[i], b[j])) {
        matchedB[j] = true
        found = true
        break
      }
    }
    if (!found) unmatchedA.push(i)
  }

  for (const i of unmatchedA) {
    changes.push({ path: joinIndex(path, i), type: 'removed', before: a[i] })
  }
  for (let j = 0; j < b.length; j++) {
    if (!matchedB[j]) {
      changes.push({ path: joinIndex(path, j), type: 'added', after: b[j] })
    }
  }
}

/**
 * Diff two JSON documents given as text.
 * Returns parse errors via `error` (changes will be empty in that case).
 */
export function diffJson(aText: string, bText: string, opts: DiffOptions = {}): DiffResult {
  let a: unknown
  let b: unknown
  try {
    a = JSON.parse(aText)
  } catch (e) {
    return { error: `Left document: ${e instanceof Error ? e.message : String(e)}`, changes: [] }
  }
  try {
    b = JSON.parse(bText)
  } catch (e) {
    return { error: `Right document: ${e instanceof Error ? e.message : String(e)}`, changes: [] }
  }
  const changes: JsonChange[] = []
  diffValues(a, b, '$', changes, opts)
  return { error: null, changes }
}

/** Pretty-print JSON text with 2-space indentation. Never throws. */
export function formatJsonText(text: string): { output: string; error: string | null } {
  try {
    return { output: JSON.stringify(JSON.parse(text), null, 2), error: null }
  } catch (e) {
    return { output: '', error: e instanceof Error ? e.message : String(e) }
  }
}

/** Compact single-line rendering of a value for the change list UI. */
export function previewValue(value: unknown, maxLength = 80): string {
  const s = value === undefined ? 'undefined' : JSON.stringify(value)
  if (s.length <= maxLength) return s
  return s.slice(0, maxLength - 1) + '…'
}

export const SAMPLE_A = JSON.stringify(
  {
    name: 'my-service',
    version: '1.2.0',
    port: 8080,
    features: { auth: true, metrics: false },
    users: [
      { id: 1, name: 'Ada', roles: ['admin'] },
      { id: 2, name: 'Linus', roles: ['dev'] },
      { id: 3, name: 'Grace', roles: ['dev', 'ops'] },
    ],
    tags: ['stable', 'internal'],
  },
  null,
  2,
)

export const SAMPLE_B = JSON.stringify(
  {
    version: '1.3.0',
    name: 'my-service',
    port: 8080,
    features: { auth: true, metrics: true, tracing: true },
    users: [
      { id: 1, name: 'Ada', roles: ['admin'] },
      { id: 2, name: 'Linus T.', roles: ['dev'] },
    ],
    tags: ['internal', 'stable'],
    deprecated: false,
  },
  null,
  2,
)
