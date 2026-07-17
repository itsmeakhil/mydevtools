/**
 * Pure logic for the Code Screenshot tool: language registry and a
 * highlight.js wrapper that returns highlighted HTML. No React, no DOM.
 */
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import json from 'highlight.js/lib/languages/json'
import yaml from 'highlight.js/lib/languages/yaml'
import bash from 'highlight.js/lib/languages/bash'
import sql from 'highlight.js/lib/languages/sql'
import php from 'highlight.js/lib/languages/php'
import ruby from 'highlight.js/lib/languages/ruby'
import kotlin from 'highlight.js/lib/languages/kotlin'
import swift from 'highlight.js/lib/languages/swift'
import plaintext from 'highlight.js/lib/languages/plaintext'
import { beautify, type BeautifyLang } from '@/lib/beautify-minify'

export interface CodeLanguage {
  /** highlight.js language id */
  value: string
  /** Human-readable label (proper nouns, not translated) */
  label: string
}

/** Languages available in the language picker ('auto' is added by the UI). */
export const LANGUAGES: CodeLanguage[] = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'xml', label: 'HTML / XML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'bash', label: 'Bash / Shell' },
  { value: 'sql', label: 'SQL' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'swift', label: 'Swift' },
  { value: 'plaintext', label: 'Plain text' },
]

const LANGUAGE_MODULES: Record<string, Parameters<typeof hljs.registerLanguage>[1]> = {
  javascript,
  typescript,
  python,
  java,
  go,
  rust,
  c,
  cpp,
  csharp,
  xml,
  css,
  json,
  yaml,
  bash,
  sql,
  php,
  ruby,
  kotlin,
  swift,
  plaintext,
}

let registered = false

function ensureRegistered() {
  if (registered) return
  for (const [name, mod] of Object.entries(LANGUAGE_MODULES)) {
    hljs.registerLanguage(name, mod)
  }
  registered = true
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export interface HighlightResult {
  /** Highlighted (and HTML-escaped) markup with span.hljs-* tokens. */
  html: string
  /** Language actually used ('plaintext' when unknown / undetected). */
  language: string
}

/**
 * Highlight `code` in `lang`. `lang === 'auto'` auto-detects among the
 * registered languages. Unknown languages fall back to escaped plaintext.
 * Never throws.
 */
export function highlightCode(code: string, lang: string): HighlightResult {
  ensureRegistered()
  if (!code) return { html: '', language: lang === 'auto' ? 'plaintext' : lang }
  try {
    if (lang === 'auto') {
      const res = hljs.highlightAuto(
        code,
        LANGUAGES.map((l) => l.value),
      )
      return { html: res.value, language: res.language ?? 'plaintext' }
    }
    if (!hljs.getLanguage(lang)) {
      return { html: escapeHtml(code), language: 'plaintext' }
    }
    const res = hljs.highlight(code, { language: lang, ignoreIllegals: true })
    return { html: res.value, language: lang }
  } catch {
    return { html: escapeHtml(code), language: 'plaintext' }
  }
}

/* ------------------------------ formatting ------------------------------- */

/** Map a highlight.js language id to the beautifier that can format it. */
const FORMATTER_LANG: Record<string, BeautifyLang> = {
  javascript: 'js',
  typescript: 'js',
  json: 'json',
  css: 'css',
  xml: 'html',
}

/** Languages `formatCode` can format ('sql' via sql-formatter, rest via beautify). */
export function canFormat(lang: string): boolean {
  return lang === 'sql' || lang in FORMATTER_LANG
}

export interface FormatResult {
  output: string
  error: string | null
}

/**
 * Format `code` for `lang` (a highlight.js id; resolve 'auto' to the detected
 * language before calling). Unsupported languages return the input unchanged
 * with an error. Never throws.
 */
export async function formatCode(code: string, lang: string): Promise<FormatResult> {
  if (!code.trim()) return { output: code, error: null }
  if (lang === 'sql') {
    try {
      const { format } = await import('sql-formatter')
      return { output: format(code, { language: 'sql', tabWidth: 2 }), error: null }
    } catch (e) {
      return { output: code, error: e instanceof Error ? e.message : 'Format failed' }
    }
  }
  const target = FORMATTER_LANG[lang]
  if (!target) return { output: code, error: 'unsupported' }
  const res = beautify(code, target, 2)
  return res.error || !res.output
    ? { output: code, error: res.error ?? 'Format failed' }
    : { output: res.output, error: null }
}

/* ------------------------------ backgrounds ------------------------------ */

export interface ScreenshotBackground {
  /** Stable id, used as i18n key suffix */
  id: string
  /** CSS background value, or null for transparent */
  css: string | null
}

export const BACKGROUNDS: ScreenshotBackground[] = [
  { id: 'ocean', css: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 50%, #7c3aed 100%)' },
  { id: 'sunset', css: 'linear-gradient(135deg, #f97316 0%, #ef4444 50%, #ec4899 100%)' },
  { id: 'candy', css: 'linear-gradient(135deg, #f472b6 0%, #c084fc 50%, #818cf8 100%)' },
  { id: 'forest', css: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #0f766e 100%)' },
  { id: 'midnight', css: 'linear-gradient(135deg, #1e293b 0%, #0f172a 60%, #312e81 100%)' },
  { id: 'gold', css: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)' },
  { id: 'aurora', css: 'linear-gradient(135deg, #22d3ee 0%, #34d399 40%, #a3e635 100%)' },
  { id: 'slate', css: '#334155' },
  { id: 'transparent', css: null },
]
