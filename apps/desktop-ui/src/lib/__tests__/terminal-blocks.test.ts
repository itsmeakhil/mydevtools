import { blockAt, commandText, failedTarget, MAX_BLOCKS, onMark, outputText, type Block, type BufferLike, type LineRef } from "@/lib/terminal/blocks"

const at = (line: number): LineRef => ({ line })

/** A screen whose rows are `rows`; `~` at the start of a row = it wraps from the row above. */
function buffer(rows: string[]): BufferLike {
  return {
    length: rows.length,
    getLine: (i) =>
      i < 0 || i >= rows.length
        ? undefined
        : {
            isWrapped: rows[i].startsWith("~"),
            translateToString: (trim, start = 0, end?: number) => {
              const s = rows[i].replace(/^~/, "").slice(start, end)
              return trim ? s.replace(/\s+$/, "") : s
            },
          },
  }
}

/** Marks for: prompt "$ " on row p, typed command, output rows, D at (end, dx). */
function run(blocks: Block[], p: number, cmd: { out: number; end: number; dx?: number; exit?: number; t0?: number; t1?: number }) {
  blocks = onMark(blocks, { kind: "A" }, at(p), 0)
  blocks = onMark(blocks, { kind: "B", x: 2 }, at(p), 0)
  blocks = onMark(blocks, { kind: "C" }, at(cmd.out), cmd.t0 ?? 1000)
  return onMark(blocks, { kind: "D", exit: cmd.exit ?? 0, x: cmd.dx ?? 0 }, at(cmd.end), cmd.t1 ?? 1500)
}

describe("onMark", () => {
  it("builds a block from A, B, C, D with exit and duration", () => {
    const [b] = run([], 0, { out: 1, end: 3, exit: 3, t0: 1000, t1: 4500 })
    expect(b.prompt.line).toBe(0)
    expect(b.input).toEqual({ at: at(0), x: 2 })
    expect(b.output?.line).toBe(1)
    expect(b.end?.at.line).toBe(3)
    expect(b.exit).toBe(3)
    expect(b.ms).toBe(3500)
  })

  it("ignores a D that closes no command (first prompt, empty Enter)", () => {
    let blocks = onMark([], { kind: "D", exit: 0, x: 0 }, at(0), 0)
    blocks = onMark(blocks, { kind: "A" }, at(0), 0)
    blocks = onMark(blocks, { kind: "D", exit: 1, x: 0 }, at(1), 10)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].exit).toBeUndefined()
    expect(blocks[0].end).toBeUndefined()
  })

  it("takes the last B of a prompt (the line editor redrew it)", () => {
    let blocks = onMark([], { kind: "A" }, at(0), 0)
    blocks = onMark(blocks, { kind: "B", x: 2 }, at(0), 0)
    blocks = onMark(blocks, { kind: "B", x: 9 }, at(0), 0)
    expect(blocks[0].input?.x).toBe(9)
  })

  it(`keeps at most ${MAX_BLOCKS} blocks, dropping the oldest`, () => {
    let blocks: Block[] = []
    for (let i = 0; i < MAX_BLOCKS + 5; i++) blocks = onMark(blocks, { kind: "A" }, at(i), 0)
    expect(blocks).toHaveLength(MAX_BLOCKS)
    expect(blocks[0].prompt.line).toBe(5)
  })

  it("drops blocks whose prompt scrolled out of the scrollback", () => {
    const gone = { line: -1, isDisposed: true }
    let blocks = onMark([], { kind: "A" }, gone, 0)
    blocks = onMark(blocks, { kind: "A" }, at(3), 0)
    expect(blocks.map((b) => b.prompt.line)).toEqual([3])
  })
})

describe("commandText / outputText", () => {
  const screen = buffer(["$ make test", "ok 1", "ok 2", "", "$ "])

  it("reads the command after the prompt and the output without the next prompt", () => {
    const [b] = run([], 0, { out: 1, end: 4 })
    expect(commandText(screen, b)).toBe("make test")
    expect(outputText(screen, b)).toBe("ok 1\nok 2")
  })

  it("joins a wrapped command line", () => {
    const s = buffer(["$ echo aaaa", "~bbbb", "aaaabbbb", "$ "])
    const [b] = run([], 0, { out: 2, end: 3 })
    expect(commandText(s, b)).toBe("echo aaaabbbb")
  })

  it("keeps output that ends without a newline (D in mid-line)", () => {
    const s = buffer(["$ printf hi", "hi$ "])
    const [b] = run([], 0, { out: 1, end: 1, dx: 2 })
    expect(outputText(s, b)).toBe("hi")
  })

  it("block_without_b_mark_has_no_command", () => {
    let blocks = onMark([], { kind: "A" }, at(0), 0)
    blocks = onMark(blocks, { kind: "C" }, at(1), 0)
    blocks = onMark(blocks, { kind: "D", exit: 0, x: 0 }, at(4), 5)
    expect(commandText(screen, blocks[0])).toBeNull()
    expect(outputText(screen, blocks[0])).toBe("ok 1\nok 2")
  })

  it("has no output while the command is still running", () => {
    let blocks = onMark([], { kind: "A" }, at(0), 0)
    blocks = onMark(blocks, { kind: "B", x: 2 }, at(0), 0)
    blocks = onMark(blocks, { kind: "C" }, at(1), 0)
    expect(outputText(screen, blocks[0])).toBeNull()
    expect(commandText(screen, blocks[0])).toBe("make test")
  })
})

describe("failedTarget / blockAt", () => {
  let blocks: Block[] = []
  blocks = run(blocks, 0, { out: 1, end: 2, exit: 0 })
  blocks = run(blocks, 2, { out: 3, end: 4, exit: 1 })
  blocks = run(blocks, 4, { out: 5, end: 6, exit: 0 })
  blocks = run(blocks, 6, { out: 7, end: 8, exit: 2 })
  blocks = onMark(blocks, { kind: "A" }, at(8), 0) // current prompt, no exit yet

  it("jumps only between failed commands", () => {
    expect(failedTarget(blocks, 8, "prev")).toBe(6)
    expect(failedTarget(blocks, 6, "prev")).toBe(2)
    expect(failedTarget(blocks, 2, "prev")).toBeNull()
    expect(failedTarget(blocks, 0, "next")).toBe(2)
    expect(failedTarget(blocks, 6, "next")).toBeNull()
  })

  it("finds the block a row belongs to", () => {
    expect(blockAt(blocks, 3)?.prompt.line).toBe(2)
    expect(blockAt(blocks, 6)?.prompt.line).toBe(6)
    expect(blockAt(blocks, 99)?.prompt.line).toBe(8)
  })
})
