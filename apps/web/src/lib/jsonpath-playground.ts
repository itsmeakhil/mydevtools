/**
 * Pure logic for the JSONPath Playground tool.
 * Query JSON documents with JSONPath (jsonpath-plus) or JMESPath (jmespath).
 * All exported functions are total and never throw.
 */

import { JSONPath } from 'jsonpath-plus'
import { search as jmespathSearch } from 'jmespath'

export type QueryEngine = 'jsonpath' | 'jmespath'

export const QUERY_ENGINES: QueryEngine[] = ['jsonpath', 'jmespath']

export interface JsonQueryResult {
  /** Pretty-printed JSON of the matches (always an array for JSONPath). */
  output: string
  /** Number of matches (array length, or 0/1 for scalar JMESPath results). */
  count: number
  error: string | null
}

export interface ParseJsonResult {
  value: unknown
  error: string | null
}

/** Parse JSON text, returning a value or an error message (never throws). */
export function parseJsonText(text: string): ParseJsonResult {
  if (!text.trim()) return { value: undefined, error: 'Empty input' }
  try {
    return { value: JSON.parse(text), error: null }
  } catch (e) {
    return { value: undefined, error: e instanceof Error ? e.message : String(e) }
  }
}

/** Pretty-print JSON text with 2-space indentation. */
export function formatJsonText(text: string): { output: string; error: string | null } {
  const parsed = parseJsonText(text)
  if (parsed.error) return { output: '', error: parsed.error }
  return { output: JSON.stringify(parsed.value, null, 2), error: null }
}

/**
 * Run a JSONPath or JMESPath query against a JSON document given as text.
 * Never throws; malformed JSON or queries are reported via `error`.
 */
export function runJsonQuery(
  jsonText: string,
  query: string,
  engine: QueryEngine,
): JsonQueryResult {
  if (!jsonText.trim()) return { output: '', count: 0, error: null }
  if (!query.trim()) return { output: '', count: 0, error: null }

  const parsed = parseJsonText(jsonText)
  if (parsed.error) return { output: '', count: 0, error: `Invalid JSON: ${parsed.error}` }

  try {
    if (engine === 'jsonpath') {
      const results = JSONPath({
        path: query,
        json: parsed.value as null | boolean | number | string | object,
        wrap: true,
        eval: 'safe',
      }) as unknown[]
      return {
        output: JSON.stringify(results, null, 2),
        count: results.length,
        error: null,
      }
    }
    // JMESPath
    const result: unknown = jmespathSearch(parsed.value, query)
    const count = Array.isArray(result) ? result.length : result === null || result === undefined ? 0 : 1
    return {
      output: JSON.stringify(result ?? null, null, 2),
      count,
      error: null,
    }
  } catch (e) {
    return { output: '', count: 0, error: e instanceof Error ? e.message : String(e) }
  }
}

/** Realistic nested sample document shared by the Sample button. */
export const SAMPLE_JSON = JSON.stringify(
  {
    store: {
      name: 'Corner Bookshop',
      location: { city: 'Portland', country: 'US' },
      books: [
        { title: 'The Pragmatic Programmer', author: 'Andrew Hunt', price: 39.95, inStock: true, tags: ['programming', 'career'] },
        { title: 'Clean Code', author: 'Robert C. Martin', price: 33.5, inStock: false, tags: ['programming'] },
        { title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann', price: 44.99, inStock: true, tags: ['databases', 'distributed-systems'] },
        { title: 'Refactoring', author: 'Martin Fowler', price: 41.0, inStock: true, tags: ['programming', 'design'] },
      ],
    },
    staff: [
      { name: 'Ada', role: 'manager' },
      { name: 'Linus', role: 'clerk' },
    ],
    open: true,
  },
  null,
  2,
)

export interface CheatsheetEntry {
  /** The query expression, inserted into the query input when clicked. */
  expression: string
  /** Suffix of the i18n key under `cheats.` describing what it does. */
  key: string
}

export const CHEATSHEET: Record<QueryEngine, CheatsheetEntry[]> = {
  jsonpath: [
    { expression: '$.store.books[*].title', key: 'jpAllTitles' },
    { expression: '$..author', key: 'jpAllAuthors' },
    { expression: '$.store.books[0]', key: 'jpFirstBook' },
    { expression: '$.store.books[-1]', key: 'jpLastBook' },
    { expression: '$.store.books[0:2]', key: 'jpSlice' },
    { expression: '$.store.books[?(@.price < 40)]', key: 'jpFilterPrice' },
    { expression: '$.store.books[?(@.inStock)].title', key: 'jpFilterInStock' },
    { expression: '$..*', key: 'jpRecursive' },
  ],
  jmespath: [
    { expression: 'store.books[*].title', key: 'jmAllTitles' },
    { expression: 'store.books[0].author', key: 'jmFirstAuthor' },
    { expression: 'store.books[-1]', key: 'jmLastBook' },
    { expression: 'store.books[0:2]', key: 'jmSlice' },
    { expression: 'store.books[?price < `40`].title', key: 'jmFilterPrice' },
    { expression: 'store.books[?inStock] | length(@)', key: 'jmCount' },
    { expression: 'store.books[*].{t: title, p: price}', key: 'jmProjection' },
    { expression: 'sort_by(store.books, &price)[*].title', key: 'jmSort' },
  ],
}
