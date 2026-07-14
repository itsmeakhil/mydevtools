/**
 * Pure escape / encode transforms for the Escape & Encode tool.
 * All functions are total and never throw.
 */

export type EscapeMode = 'html' | 'backslash' | 'hex' | 'unicode'
export type EscapeDir = 'encode' | 'decode'

export const ESCAPE_MODES: { value: EscapeMode; label: string }[] = [
  { value: 'html', label: 'HTML Entities' },
  { value: 'backslash', label: 'Backslash (JS / JSON string)' },
  { value: 'hex', label: 'Hex ↔ ASCII' },
  { value: 'unicode', label: 'Unicode \\uXXXX' },
]

/* ----------------------------- HTML entities ----------------------------- */

const HTML_ENCODE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

const HTML_NAMED_DECODE: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  copy: '©',
  reg: '®',
  trade: '™',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  euro: '€',
  pound: '£',
  cent: '¢',
  yen: '¥',
  deg: '°',
  plusmn: '±',
  times: '×',
  divide: '÷',
  laquo: '«',
  raquo: '»',
  middot: '·',
  bull: '•',
  dagger: '†',
  para: '¶',
  sect: '§',
}

function htmlEncode(input: string): string {
  let out = ''
  for (const ch of input) {
    if (HTML_ENCODE_MAP[ch]) {
      out += HTML_ENCODE_MAP[ch]
    } else if (ch.codePointAt(0)! > 0x7f) {
      out += `&#${ch.codePointAt(0)};`
    } else {
      out += ch
    }
  }
  return out
}

function htmlDecode(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (m, body: string) => {
    if (body[0] === '#') {
      const isHex = body[1] === 'x' || body[1] === 'X'
      const num = parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10)
      if (Number.isNaN(num)) return m
      try {
        return String.fromCodePoint(num)
      } catch {
        return m
      }
    }
    const named = HTML_NAMED_DECODE[body]
    return named ?? m
  })
}

/* ----------------------------- Backslash (JS) ---------------------------- */

const BACKSLASH_ENCODE: Record<string, string> = {
  '\\': '\\\\',
  '"': '\\"',
  "'": "\\'",
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
  '\f': '\\f',
  '\b': '\\b',
  '\v': '\\v',
  '\0': '\\0',
}

function backslashEncode(input: string): string {
  let out = ''
  for (const ch of input) {
    if (BACKSLASH_ENCODE[ch]) {
      out += BACKSLASH_ENCODE[ch]
    } else {
      const cp = ch.codePointAt(0)!
      if (cp < 0x20) {
        out += '\\x' + cp.toString(16).padStart(2, '0')
      } else {
        out += ch
      }
    }
  }
  return out
}

function backslashDecode(input: string): string {
  let out = ''
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (ch !== '\\') {
      out += ch
      continue
    }
    const next = input[++i]
    switch (next) {
      case 'n': out += '\n'; break
      case 'r': out += '\r'; break
      case 't': out += '\t'; break
      case 'f': out += '\f'; break
      case 'b': out += '\b'; break
      case 'v': out += '\v'; break
      case '0': out += '\0'; break
      case '\\': out += '\\'; break
      case '"': out += '"'; break
      case "'": out += "'"; break
      case 'x': {
        const hexv = input.slice(i + 1, i + 3)
        if (/^[0-9a-fA-F]{2}$/.test(hexv)) {
          out += String.fromCharCode(parseInt(hexv, 16))
          i += 2
        } else {
          out += 'x'
        }
        break
      }
      case 'u': {
        if (input[i + 1] === '{') {
          const end = input.indexOf('}', i + 2)
          const hexv = end > -1 ? input.slice(i + 2, end) : ''
          if (/^[0-9a-fA-F]+$/.test(hexv)) {
            try { out += String.fromCodePoint(parseInt(hexv, 16)) } catch { out += '\\u' }
            i = end
          } else {
            out += 'u'
          }
        } else {
          const hexv = input.slice(i + 1, i + 5)
          if (/^[0-9a-fA-F]{4}$/.test(hexv)) {
            out += String.fromCharCode(parseInt(hexv, 16))
            i += 4
          } else {
            out += 'u'
          }
        }
        break
      }
      case undefined: out += '\\'; break
      default: out += next
    }
  }
  return out
}

/* ------------------------------- Hex ↔ ASCII ----------------------------- */

function hexEncode(input: string): string {
  const bytes = new TextEncoder().encode(input)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ')
}

function hexDecode(input: string): string {
  const cleaned = input.replace(/0x/gi, '').replace(/[^0-9a-fA-F]/g, '')
  if (cleaned.length === 0) return ''
  if (cleaned.length % 2 !== 0) throw new Error('Hex input has an odd number of digits')
  const bytes = new Uint8Array(cleaned.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16)
  }
  return new TextDecoder().decode(bytes)
}

/* ------------------------------- Unicode --------------------------------- */

function unicodeEncode(input: string): string {
  let out = ''
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i)
    if (code > 0x7f) {
      out += '\\u' + code.toString(16).padStart(4, '0')
    } else {
      out += input[i]
    }
  }
  return out
}

function unicodeDecode(input: string): string {
  return input
    .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_m, h: string) => {
      try { return String.fromCodePoint(parseInt(h, 16)) } catch { return _m }
    })
    .replace(/\\u([0-9a-fA-F]{4})/g, (_m, h: string) => String.fromCharCode(parseInt(h, 16)))
}

/* -------------------------------- dispatch ------------------------------- */

export interface EscapeResult { output: string; error: string | null }

export function transform(input: string, mode: EscapeMode, dir: EscapeDir): EscapeResult {
  if (!input) return { output: '', error: null }
  try {
    let output = ''
    if (mode === 'html') output = dir === 'encode' ? htmlEncode(input) : htmlDecode(input)
    else if (mode === 'backslash') output = dir === 'encode' ? backslashEncode(input) : backslashDecode(input)
    else if (mode === 'hex') output = dir === 'encode' ? hexEncode(input) : hexDecode(input)
    else output = dir === 'encode' ? unicodeEncode(input) : unicodeDecode(input)
    return { output, error: null }
  } catch (e) {
    return { output: '', error: e instanceof Error ? e.message : String(e) }
  }
}
