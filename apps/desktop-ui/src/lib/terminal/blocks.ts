/**
 * Command blocks from the shell's OSC 133 marks: A = prompt, B = end of prompt (input starts),
 * C = command started (output starts), D;<exit> = it ended. Positions are xterm markers, read
 * when used, so they follow the buffer as old scrollback is trimmed.
 */

/** An xterm marker (or anything with a current line). */
export interface LineRef {
  readonly line: number
  readonly isDisposed?: boolean
}

export interface Block {
  prompt: LineRef
  /** Where typed input starts (the last B of this prompt). */
  input?: { at: LineRef; x: number }
  /** First output row (C). */
  output?: LineRef
  /** Where the command ended (D); `x` = cursor column then (> 0: output ended mid-line). */
  end?: { at: LineRef; x: number }
  exit?: number
  startedAt?: number
  ms?: number
}

export type Mark = { kind: "A" } | { kind: "B"; x: number } | { kind: "C" } | { kind: "D"; exit?: number; x: number }

export const MAX_BLOCKS = 1000

/** The block list after one mark at `at` (time `now`, ms). Pure: returns a new array. */
export function onMark(blocks: Block[], mark: Mark, at: LineRef, now: number): Block[] {
  const live = blocks.filter((b) => !b.prompt.isDisposed)
  if (mark.kind === "A") return [...live, { prompt: at }].slice(-MAX_BLOCKS)
  const last = live[live.length - 1]
  if (!last) return live
  let next: Block | null = null
  if (mark.kind === "B" && !last.output) next = { ...last, input: { at, x: mark.x } }
  else if (mark.kind === "C" && !last.output) next = { ...last, output: at, startedAt: now }
  // A D that closes no C (the first prompt, an empty Enter) ends nothing.
  else if (mark.kind === "D" && last.output && !last.end)
    next = { ...last, end: { at, x: mark.x }, exit: mark.exit, ms: last.startedAt === undefined ? undefined : now - last.startedAt }
  return next ? [...live.slice(0, -1), next] : live
}

export interface BufferLine {
  isWrapped: boolean
  translateToString(trimRight?: boolean, startColumn?: number, endColumn?: number): string
}
export interface BufferLike {
  length: number
  getLine(i: number): BufferLine | undefined
}

/** Rows `from..to` (inclusive) as text: wrapped rows joined, others on new lines. */
function rows(buf: BufferLike, from: number, to: number, firstCol = 0, lastEnd?: number): string {
  let out = ""
  for (let i = from; i <= to; i++) {
    const l = buf.getLine(i)
    if (!l) break
    const end = i === to ? lastEnd : undefined
    const text = l.translateToString(end === undefined, i === from ? firstCol : 0, end)
    out += (i > from && !l.isWrapped ? "\n" : "") + text
  }
  return out.replace(/\s+$/, "")
}

/** The command typed at this prompt; null without a B mark or before it started (C). */
export function commandText(buf: BufferLike, b: Block): string | null {
  if (!b.input || !b.output || b.input.at.isDisposed) return null
  const text = rows(buf, b.input.at.line, b.output.line - 1, b.input.x)
  return text || null
}

/** The command's output, without the next prompt; null while it runs. */
export function outputText(buf: BufferLike, b: Block): string | null {
  if (!b.output || !b.end) return null
  const { at, x } = b.end
  return x > 0 ? rows(buf, b.output.line, at.line, 0, x) : at.line > b.output.line ? rows(buf, b.output.line, at.line - 1) : ""
}

/** Prompt row of the previous/next failed command from `top`; null when there is none. */
export function failedTarget(blocks: Block[], top: number, dir: "prev" | "next"): number | null {
  const lines = blocks.filter((b) => b.exit !== undefined && b.exit !== 0).map((b) => b.prompt.line)
  if (dir === "prev") return lines.filter((l) => l < top).pop() ?? null
  return lines.find((l) => l > top) ?? null
}

/** The block a buffer row belongs to (its prompt is the last one at or above the row). */
export function blockAt(blocks: Block[], line: number): Block | null {
  let found: Block | null = null
  for (const b of blocks) if (b.prompt.line <= line) found = b
  return found
}
