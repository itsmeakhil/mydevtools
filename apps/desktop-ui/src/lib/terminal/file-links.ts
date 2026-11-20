/**
 * File references in terminal output: `src/a.ts:12:5`, tsc's `src/a.ts(12,5)`, Python's
 * `File "x.py", line 7`, Rust's `--> a.rs:5:9`, Node stack frames, `~/notes.md`, `./build`.
 * Only candidates: the pane underlines the ones Rust confirms exist.
 */

export interface FileRef {
  /** Where the link goes in the text (end exclusive): the path plus its `:line:col` / `(line,col)`. */
  start: number
  end: number
  path: string
  line?: number
  col?: number
}

const URL_RE = /[a-zA-Z][\w+.-]*:\/\/\S+/g
const PYTHON_RE = /File "([^"\n]+)", line (\d+)/g
// A path-like token: not glued to a preceding path character, and not ending in `.`/`-`.
const TOKEN_RE = /(?<![\w.@+~/-])[\w.@+~/-]*[\w/~]/g
const LINE_COL_RE = /:(\d+)(?::(\d+))?/y
const TSC_RE = /\((\d+),(\d+)\)/y

const num = (s: string | undefined) => (s === undefined ? undefined : Number(s))

export function findFileRefs(text: string): FileRef[] {
  // URLs are the web-links addon's job; blank them so their paths aren't read as files.
  const plain = text.replace(URL_RE, (u) => " ".repeat(u.length))
  const out: FileRef[] = []
  for (const m of plain.matchAll(PYTHON_RE)) {
    const start = m.index + m[0].indexOf(m[1])
    out.push({ start, end: start + m[1].length, path: m[1], line: Number(m[2]) })
  }
  const taken = (i: number) => out.some((r) => i >= r.start && i < r.end)
  for (const m of plain.matchAll(TOKEN_RE)) {
    const path = m[0]
    const start = m.index
    if (path.length < 2 || taken(start)) continue
    let end = start + path.length
    let line: number | undefined
    let col: number | undefined
    LINE_COL_RE.lastIndex = TSC_RE.lastIndex = end
    const pos = LINE_COL_RE.exec(plain) ?? TSC_RE.exec(plain)
    if (pos) {
      line = num(pos[1])
      col = num(pos[2])
      end += pos[0].length
    }
    const explicit = /^(\/|~\/|\.\.?\/)/.test(path)
    const ext = /\.[A-Za-z]\w{0,9}$/.test(path.split("/").pop() ?? "")
    if (explicit || ext || (path.includes("/") && line !== undefined)) out.push({ start, end, path, line, col })
  }
  return out.sort((a, b) => a.start - b.start)
}
