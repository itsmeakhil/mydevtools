/**
 * beautify-minify.ts
 *
 * Pure-TypeScript, dependency-free logic for a "Beautify & Minify" developer
 * tool. Supports HTML, CSS, JavaScript, XML and JSON.
 *
 * Everything here is hand-rolled: no external formatters, no npm deps, no
 * React and no i18n. All exported functions are "total" — they never throw.
 * Risky parsing is wrapped in try/catch and reported via the `error` field.
 */

export type BeautifyLang = 'html' | 'css' | 'js' | 'xml' | 'json';

export const BEAUTIFY_LANGS: { value: BeautifyLang; label: string }[] = [
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'js', label: 'JavaScript' },
  { value: 'xml', label: 'XML' },
  { value: 'json', label: 'JSON' },
];

export interface TransformResult {
  output: string;
  error: string | null;
}

/** Normalize a caught value into a human-readable message. */
function errMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  try {
    return String((e as { message?: unknown } | null)?.message ?? e);
  } catch {
    return 'Unknown error';
  }
}

/** True when the string is empty or only whitespace. */
function isBlank(s: string): boolean {
  return s.trim().length === 0;
}

/** Build an indent string of `level` steps, each `indent` spaces wide. */
function pad(level: number, indent: number): string {
  return ' '.repeat(Math.max(0, level) * indent);
}

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------

export function beautify(
  input: string,
  lang: BeautifyLang,
  indent: number = 2,
): TransformResult {
  if (isBlank(input)) return { output: '', error: null };
  const size = Number.isFinite(indent) && indent >= 0 ? Math.floor(indent) : 2;
  try {
    switch (lang) {
      case 'json':
        return beautifyJson(input, size);
      case 'css':
        return beautifyCss(input, size);
      case 'html':
        return beautifyMarkup(input, size, true);
      case 'xml':
        return beautifyMarkup(input, size, false);
      case 'js':
        return beautifyJs(input, size);
      default:
        return { output: input, error: null };
    }
  } catch (e) {
    return { output: '', error: errMessage(e) };
  }
}

export function minify(input: string, lang: BeautifyLang): TransformResult {
  if (isBlank(input)) return { output: '', error: null };
  try {
    switch (lang) {
      case 'json':
        return minifyJson(input);
      case 'css':
        return minifyCss(input);
      case 'html':
        return minifyMarkup(input, true);
      case 'xml':
        return minifyMarkup(input, false);
      case 'js':
        return minifyJs(input);
      default:
        return { output: input, error: null };
    }
  } catch (e) {
    return { output: '', error: errMessage(e) };
  }
}

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

function beautifyJson(input: string, indent: number): TransformResult {
  try {
    const obj = JSON.parse(input);
    return { output: JSON.stringify(obj, null, indent), error: null };
  } catch (e) {
    return { output: '', error: errMessage(e) };
  }
}

function minifyJson(input: string): TransformResult {
  try {
    const obj = JSON.parse(input);
    return { output: JSON.stringify(obj), error: null };
  } catch (e) {
    return { output: '', error: errMessage(e) };
  }
}

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------

/** Strip /* ... *\/ comments from CSS/JS-like text (string-safe enough for CSS). */
function stripCssComments(input: string): string {
  let out = '';
  let i = 0;
  const n = input.length;
  let inStr: string | null = null;
  while (i < n) {
    const ch = input[i];
    if (inStr) {
      out += ch;
      if (ch === '\\' && i + 1 < n) {
        out += input[i + 1];
        i += 2;
        continue;
      }
      if (ch === inStr) inStr = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = ch;
      out += ch;
      i++;
      continue;
    }
    if (ch === '/' && input[i + 1] === '*') {
      i += 2;
      while (i < n && !(input[i] === '*' && input[i + 1] === '/')) i++;
      i += 2; // skip closing */
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

/**
 * Beautify CSS by walking the token stream and reacting to the structural
 * characters `{ } ; ,`. Handles nesting (e.g. @media { .a { } }).
 */
function beautifyCss(input: string, indent: number): TransformResult {
  const src = stripCssComments(input);
  const lines: string[] = [];
  let level = 0;
  let buf = '';
  let inStr: string | null = null;
  const n = src.length;

  const flushDecl = (semicolon: boolean) => {
    const text = collapse(buf);
    buf = '';
    if (text.length === 0) return;
    lines.push(pad(level, indent) + text + (semicolon ? ';' : ''));
  };

  for (let i = 0; i < n; i++) {
    const ch = src[i];

    if (inStr) {
      buf += ch;
      if (ch === '\\' && i + 1 < n) {
        buf += src[i + 1];
        i++;
        continue;
      }
      if (ch === inStr) inStr = null;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inStr = ch;
      buf += ch;
      continue;
    }

    if (ch === '{') {
      const selector = collapse(buf);
      buf = '';
      lines.push(pad(level, indent) + selector + ' {');
      level++;
      continue;
    }

    if (ch === '}') {
      // Emit any pending declaration that had no trailing semicolon.
      flushDecl(true);
      level = Math.max(0, level - 1);
      lines.push(pad(level, indent) + '}');
      continue;
    }

    if (ch === ';') {
      flushDecl(true);
      continue;
    }

    if (ch === '\n' || ch === '\r' || ch === '\t') {
      buf += ' ';
      continue;
    }

    buf += ch;
  }

  // Trailing content (e.g. a stray declaration with no closing brace).
  const tail = collapse(buf);
  if (tail.length > 0) lines.push(pad(level, indent) + tail);

  // Ensure a colon in declarations is spaced as `prop: value`.
  const pretty = lines.map((l) => normalizeDeclColon(l)).join('\n');
  return { output: pretty, error: null };
}

/** Collapse internal whitespace runs to single spaces and trim. */
function collapse(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Within a single beautified declaration line, ensure exactly one space after
 * the first top-level colon (property: value). Leaves selector/at-rule lines
 * (which contain `{`) and pseudo-selectors untouched — those never reach here
 * because selectors are emitted separately.
 */
function normalizeDeclColon(line: string): string {
  const trimmed = line.trim();
  // Only touch declaration-looking lines "prop: value" or "prop:value;".
  if (trimmed.length === 0 || trimmed === '{' || trimmed === '}') return line;
  if (trimmed.endsWith('{')) return line;
  const leading = line.slice(0, line.length - line.trimStart().length);
  const idx = trimmed.indexOf(':');
  if (idx <= 0) return line;
  const prop = trimmed.slice(0, idx).trim();
  const rest = trimmed.slice(idx + 1).trim();
  // Guard against things like "http://..." inside values — only reformat when
  // the property side looks like a simple CSS property name.
  if (!/^[-\w]+$/.test(prop)) return line;
  return leading + prop + ': ' + rest;
}

/**
 * Minify CSS: strip comments, remove spaces around `{ } : ; ,`, drop the last
 * semicolon before `}`, collapse whitespace and newlines.
 */
function minifyCss(input: string): TransformResult {
  const css = stripCssComments(input);
  // Rebuild while respecting string literals so we don't mangle content.
  let out = '';
  let inStr: string | null = null;
  const n = css.length;
  for (let i = 0; i < n; i++) {
    const ch = css[i];
    if (inStr) {
      out += ch;
      if (ch === '\\' && i + 1 < n) {
        out += css[i + 1];
        i++;
        continue;
      }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = ch;
      out += ch;
      continue;
    }
    if (ch === '\n' || ch === '\r' || ch === '\t') {
      out += ' ';
      continue;
    }
    out += ch;
  }

  // Now collapse whitespace outside of strings.
  out = collapseOutsideStrings(out);
  // Remove spaces around structural punctuation (outside strings).
  out = squeezePunctuationOutsideStrings(out);
  // Remove the final `;` right before a `}`.
  out = out.replace(/;+}/g, '}');
  return { output: out.trim(), error: null };
}

/** Collapse runs of whitespace to a single space, ignoring string interiors. */
function collapseOutsideStrings(s: string): string {
  let out = '';
  let inStr: string | null = null;
  let prevSpace = false;
  const n = s.length;
  for (let i = 0; i < n; i++) {
    const ch = s[i];
    if (inStr) {
      out += ch;
      if (ch === '\\' && i + 1 < n) {
        out += s[i + 1];
        i++;
        continue;
      }
      if (ch === inStr) inStr = null;
      prevSpace = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = ch;
      out += ch;
      prevSpace = false;
      continue;
    }
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      if (!prevSpace) out += ' ';
      prevSpace = true;
      continue;
    }
    out += ch;
    prevSpace = false;
  }
  return out;
}

/** Remove spaces around `{ } : ; ,` while respecting string literals. */
function squeezePunctuationOutsideStrings(s: string): string {
  const punct = new Set(['{', '}', ':', ';', ',']);
  let out = '';
  let inStr: string | null = null;
  const n = s.length;
  for (let i = 0; i < n; i++) {
    const ch = s[i];
    if (inStr) {
      out += ch;
      if (ch === '\\' && i + 1 < n) {
        out += s[i + 1];
        i++;
        continue;
      }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = ch;
      out += ch;
      continue;
    }
    if (punct.has(ch)) {
      // drop a trailing space we already emitted
      if (out.endsWith(' ')) out = out.slice(0, -1);
      out += ch;
      // skip following spaces
      while (i + 1 < n && (s[i + 1] === ' ' || s[i + 1] === '\t')) i++;
      continue;
    }
    out += ch;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Markup (HTML + XML) — shared tokenizer
// ---------------------------------------------------------------------------

type MarkupToken =
  | { kind: 'open'; name: string; raw: string; selfClose: boolean }
  | { kind: 'close'; name: string; raw: string }
  | { kind: 'text'; raw: string }
  | { kind: 'comment'; raw: string }
  | { kind: 'directive'; raw: string } // <!doctype>, <?xml ?>, CDATA
  | { kind: 'raw'; name: string; raw: string }; // verbatim pre/script/style/textarea block

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/** Elements whose inner content must be preserved verbatim (HTML only). */
const RAW_TEXT_ELEMENTS = new Set(['pre', 'textarea', 'script', 'style']);

/**
 * Tokenize markup into tags, text, comments and directives. When `html` is
 * true, the content of raw-text elements (pre/textarea/script/style) is
 * captured as a single verbatim block so it is never reflowed.
 */
function tokenizeMarkup(input: string, html: boolean): MarkupToken[] {
  const tokens: MarkupToken[] = [];
  let i = 0;
  const n = input.length;

  while (i < n) {
    if (input[i] === '<') {
      // Comment
      if (input.startsWith('<!--', i)) {
        const end = input.indexOf('-->', i + 4);
        const stop = end === -1 ? n : end + 3;
        tokens.push({ kind: 'comment', raw: input.slice(i, stop) });
        i = stop;
        continue;
      }
      // CDATA / doctype / processing instruction
      if (input.startsWith('<![CDATA[', i)) {
        const end = input.indexOf(']]>', i + 9);
        const stop = end === -1 ? n : end + 3;
        tokens.push({ kind: 'directive', raw: input.slice(i, stop) });
        i = stop;
        continue;
      }
      if (input[i + 1] === '!' || input[i + 1] === '?') {
        const end = input.indexOf('>', i);
        const stop = end === -1 ? n : end + 1;
        tokens.push({ kind: 'directive', raw: input.slice(i, stop) });
        i = stop;
        continue;
      }
      // A regular tag (open or close). Find matching '>' respecting quotes.
      const tagEnd = findTagEnd(input, i);
      if (tagEnd === -1) {
        // Unterminated '<' — treat the remainder as text.
        tokens.push({ kind: 'text', raw: input.slice(i) });
        break;
      }
      const raw = input.slice(i, tagEnd + 1);
      const isClose = raw[1] === '/';
      const name = tagName(raw);

      if (isClose) {
        tokens.push({ kind: 'close', name, raw });
        i = tagEnd + 1;
        continue;
      }

      const selfClose = /\/\s*>$/.test(raw) || (html && VOID_ELEMENTS.has(name));

      // HTML raw-text elements: swallow everything up to the matching close.
      if (html && !selfClose && RAW_TEXT_ELEMENTS.has(name)) {
        const closeTag = new RegExp(`</${name}\\s*>`, 'i');
        const rest = input.slice(tagEnd + 1);
        const m = closeTag.exec(rest);
        if (m) {
          const inner = rest.slice(0, m.index);
          const closeRaw = m[0];
          tokens.push({
            kind: 'raw',
            name,
            raw: raw + inner + closeRaw,
          });
          i = tagEnd + 1 + m.index + closeRaw.length;
          continue;
        }
        // No close found — emit as open and let the rest flow as text.
      }

      tokens.push({ kind: 'open', name, raw, selfClose });
      i = tagEnd + 1;
      continue;
    }

    // Text run until next '<'.
    const next = input.indexOf('<', i);
    const stop = next === -1 ? n : next;
    tokens.push({ kind: 'text', raw: input.slice(i, stop) });
    i = stop;
  }

  return tokens;
}

/** Find the index of the `>` that closes the tag starting at `start`. */
function findTagEnd(input: string, start: number): number {
  let i = start + 1;
  const n = input.length;
  let quote: string | null = null;
  while (i < n) {
    const ch = input[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '>') {
      return i;
    }
    i++;
  }
  return -1;
}

/** Extract the lowercased tag name from a raw tag string. */
function tagName(raw: string): string {
  const m = /^<\/?\s*([^\s/>]+)/.exec(raw);
  return m ? m[1].toLowerCase() : '';
}

/** Re-indent the raw content of a verbatim block onto the current level. */
function renderRawBlock(raw: string, level: number, indent: number): string {
  // Keep interior text verbatim; only indent the first line so the block sits
  // at the right depth. Splitting/rejoining would reflow, which we must not do.
  return pad(level, indent) + raw;
}

/**
 * Pretty-print markup. Each tag/text node goes on its own line, indented by
 * nesting depth. Shared by HTML (`html=true`) and XML (`html=false`).
 */
function beautifyMarkup(
  input: string,
  indent: number,
  html: boolean,
): TransformResult {
  const tokens = tokenizeMarkup(input, html);
  const lines: string[] = [];
  let level = 0;

  for (const tok of tokens) {
    switch (tok.kind) {
      case 'text': {
        const text = tok.raw.trim();
        if (text.length === 0) break;
        // Collapse internal whitespace for readability.
        lines.push(pad(level, indent) + collapse(text));
        break;
      }
      case 'comment':
      case 'directive': {
        lines.push(pad(level, indent) + tok.raw.trim());
        break;
      }
      case 'raw': {
        lines.push(renderRawBlock(tok.raw, level, indent));
        break;
      }
      case 'open': {
        lines.push(pad(level, indent) + tok.raw.trim());
        if (!tok.selfClose) level++;
        break;
      }
      case 'close': {
        level = Math.max(0, level - 1);
        lines.push(pad(level, indent) + tok.raw.trim());
        break;
      }
    }
  }

  return { output: lines.join('\n'), error: null };
}

/**
 * Minify markup: drop comments, collapse whitespace between tags and trim.
 * Verbatim blocks (pre/script/style/textarea for HTML) are preserved.
 */
function minifyMarkup(input: string, html: boolean): TransformResult {
  const tokens = tokenizeMarkup(input, html);
  let out = '';

  for (const tok of tokens) {
    switch (tok.kind) {
      case 'comment':
        // remove all comments (including conditional comments, per spec)
        break;
      case 'text': {
        const collapsed = tok.raw.replace(/\s+/g, ' ');
        // Preserve a single space only if the original had meaningful content.
        out += collapsed.trim().length === 0 ? '' : collapsed.trim();
        break;
      }
      case 'raw':
        // Keep verbatim content exactly as-is.
        out += tok.raw;
        break;
      case 'directive':
        out += tok.raw.trim();
        break;
      case 'open':
      case 'close':
        out += collapse(tok.raw);
        break;
    }
  }

  return { output: out.trim(), error: null };
}

// ---------------------------------------------------------------------------
// JavaScript
// ---------------------------------------------------------------------------

type JsPiece =
  | { t: 'code'; v: string }
  | { t: 'str'; v: string } // string or template literal (kept verbatim)
  | { t: 'line-comment'; v: string }
  | { t: 'block-comment'; v: string }
  | { t: 'regex'; v: string };

/**
 * Split JS source into pieces, isolating strings, template literals, comments
 * and regex literals so downstream formatting never mutates their contents.
 *
 * Regex detection is heuristic: a `/` starts a regex only when the previous
 * significant token suggests an expression position (operator, `(`, `,`, `=`,
 * `return`, etc.), which is good enough for common code.
 */
function tokenizeJs(input: string): JsPiece[] {
  const pieces: JsPiece[] = [];
  let i = 0;
  const n = input.length;
  let code = '';
  let lastSignificant = ''; // last non-space code char emitted

  const flushCode = () => {
    if (code.length > 0) {
      pieces.push({ t: 'code', v: code });
      code = '';
    }
  };

  const regexAllowed = (): boolean => {
    const c = lastSignificant;
    if (c === '') return true;
    // After these, a `/` is division, not regex.
    if (/[\w$)\]]/.test(c)) {
      // But keywords like `return`, `typeof`, `case`... allow regex.
      const kw = /(^|[^\w$])(return|typeof|instanceof|in|of|new|delete|void|do|else|yield|await|case)$/;
      return kw.test(code.slice(-12));
    }
    return true;
  };

  while (i < n) {
    const ch = input[i];
    const next = input[i + 1];

    // Line comment
    if (ch === '/' && next === '/') {
      flushCode();
      let j = i + 2;
      while (j < n && input[j] !== '\n') j++;
      pieces.push({ t: 'line-comment', v: input.slice(i, j) });
      i = j;
      continue;
    }

    // Block comment
    if (ch === '/' && next === '*') {
      flushCode();
      let j = i + 2;
      while (j < n && !(input[j] === '*' && input[j + 1] === '/')) j++;
      j = Math.min(n, j + 2);
      pieces.push({ t: 'block-comment', v: input.slice(i, j) });
      i = j;
      continue;
    }

    // Strings and template literals
    if (ch === '"' || ch === "'" || ch === '`') {
      flushCode();
      const quote = ch;
      let j = i + 1;
      while (j < n) {
        if (input[j] === '\\') {
          j += 2;
          continue;
        }
        if (input[j] === quote) {
          j++;
          break;
        }
        j++;
      }
      pieces.push({ t: 'str', v: input.slice(i, j) });
      lastSignificant = quote;
      i = j;
      continue;
    }

    // Regex literal
    if (ch === '/' && regexAllowed()) {
      let j = i + 1;
      let inClass = false;
      let ok = false;
      while (j < n) {
        const cj = input[j];
        if (cj === '\\') {
          j += 2;
          continue;
        }
        if (cj === '\n') break; // unterminated → not a regex
        if (cj === '[') inClass = true;
        else if (cj === ']') inClass = false;
        else if (cj === '/' && !inClass) {
          ok = true;
          j++;
          break;
        }
        j++;
      }
      if (ok) {
        // consume flags
        while (j < n && /[a-z]/i.test(input[j])) j++;
        flushCode();
        pieces.push({ t: 'regex', v: input.slice(i, j) });
        lastSignificant = '/';
        i = j;
        continue;
      }
      // Not a regex — fall through to treat `/` as code.
    }

    code += ch;
    if (!/\s/.test(ch)) lastSignificant = ch;
    i++;
  }

  flushCode();
  return pieces;
}

/**
 * Best-effort JS beautifier: token-aware brace/bracket indentation. Never
 * throws; on any trouble it returns the original text with a soft note.
 */
function beautifyJs(input: string, indent: number): TransformResult {
  try {
    const pieces = tokenizeJs(input);
    let level = 0;
    let out = '';
    let atLineStart = true;

    const newline = () => {
      out = out.replace(/[ \t]+$/, '');
      out += '\n';
      atLineStart = true;
    };
    const emitIndent = () => {
      if (atLineStart) {
        out += pad(level, indent);
        atLineStart = false;
      }
    };
    const emit = (s: string) => {
      emitIndent();
      out += s;
    };

    for (const piece of pieces) {
      if (piece.t !== 'code') {
        // Non-code pieces are emitted verbatim on the current line.
        if (piece.t === 'line-comment') {
          emit(piece.v);
          newline();
        } else {
          emit(piece.v);
        }
        continue;
      }

      // Walk the code piece char-by-char, reacting to structural chars.
      const v = piece.v;
      for (let k = 0; k < v.length; k++) {
        const ch = v[k];

        if (ch === '\n') {
          // Preserve author's line breaks but re-indent.
          if (!atLineStart) newline();
          continue;
        }
        if (ch === ' ' || ch === '\t' || ch === '\r') {
          if (!atLineStart) out += ' ';
          continue;
        }

        if (ch === '{' || ch === '[' || ch === '(') {
          emit(ch);
          if (ch === '{') {
            level++;
            newline();
          } else {
            level++;
          }
          continue;
        }

        if (ch === '}' || ch === ']' || ch === ')') {
          if (ch === '}') {
            if (!atLineStart) newline();
            level = Math.max(0, level - 1);
            emit(ch);
          } else {
            level = Math.max(0, level - 1);
            emit(ch);
          }
          continue;
        }

        if (ch === ';') {
          emit(ch);
          newline();
          continue;
        }

        emit(ch);
      }
    }

    // Tidy: collapse 3+ blank lines, drop trailing spaces, trim ends.
    const cleaned = out
      .split('\n')
      .map((l) => l.replace(/[ \t]+$/, ''))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\n+/, '')
      .replace(/\n+$/, '\n')
      .trimEnd();

    return { output: cleaned, error: null };
  } catch (e) {
    // Best-effort contract: never fail hard, hand back the input.
    return { output: input, error: 'Could not fully format: ' + errMessage(e) };
  }
}

/**
 * Conservative JS minifier: strip comments, collapse whitespace outside of
 * strings/templates/regex, and remove spaces around safe punctuation. Errs
 * toward keeping a space whenever removing one could change meaning.
 */
function minifyJs(input: string): TransformResult {
  try {
    const pieces = tokenizeJs(input);
    let out = '';

    // Punctuation around which it is safe to drop surrounding whitespace.
    const safe = new Set(['{', '}', '(', ')', ';', ',', ':', '[', ']']);

    for (const piece of pieces) {
      if (piece.t === 'line-comment' || piece.t === 'block-comment') {
        // Drop comments. A block comment between tokens becomes a boundary;
        // insert a space so `a/*x*/b` doesn't merge into `ab`.
        if (piece.t === 'block-comment' && !/\n/.test(piece.v)) {
          if (out.length && !/\s$/.test(out)) out += ' ';
        } else {
          if (out.length && !/\s$/.test(out)) out += ' ';
        }
        continue;
      }
      if (piece.t === 'str' || piece.t === 'regex') {
        out += piece.v;
        continue;
      }

      // Code: collapse whitespace runs to single spaces.
      const collapsed = piece.v.replace(/\s+/g, ' ');
      out += collapsed;
    }

    // Remove spaces adjacent to safe punctuation (single pass, both sides).
    let result = '';
    for (let i = 0; i < out.length; i++) {
      const ch = out[i];
      if (ch === ' ') {
        const prev = result[result.length - 1];
        const nxt = out[i + 1];
        if (prev !== undefined && safe.has(prev)) continue; // space after punct
        if (nxt !== undefined && safe.has(nxt)) continue; // space before punct
        result += ch;
        continue;
      }
      result += ch;
    }

    return { output: result.trim(), error: null };
  } catch (e) {
    return { output: input, error: 'Could not fully minify: ' + errMessage(e) };
  }
}
