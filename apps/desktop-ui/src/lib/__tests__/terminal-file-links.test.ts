import { findFileRefs, type FileRef } from "@/lib/terminal/file-links"
import { normalizePrefs } from "@/lib/terminal/util"

/** The refs in `text`, with the text each one covers. */
const refs = (text: string) => findFileRefs(text).map((r: FileRef) => ({ ...r, covers: text.slice(r.start, r.end) }))
const one = (text: string) => {
  const r = refs(text)
  expect(r).toHaveLength(1)
  return r[0]
}

describe("findFileRefs", () => {
  it("reads path:line:col and path:line", () => {
    expect(one("error in src/a.ts:12:5 here")).toMatchObject({ path: "src/a.ts", line: 12, col: 5, covers: "src/a.ts:12:5" })
    expect(one("./a/b.go:4")).toMatchObject({ path: "./a/b.go", line: 4, col: undefined, covers: "./a/b.go:4" })
  })

  it("reads tsc's file(line,col)", () => {
    expect(one("src/a.ts(12,5): error TS2322")).toMatchObject({ path: "src/a.ts", line: 12, col: 5, covers: "src/a.ts(12,5)" })
  })

  it("reads Python tracebacks, linking the path", () => {
    expect(one('  File "/x/y.py", line 7, in main')).toMatchObject({ path: "/x/y.py", line: 7, covers: "/x/y.py" })
  })

  it("reads Rust and Node locations", () => {
    expect(one("  --> src/main.rs:5:9")).toMatchObject({ path: "src/main.rs", line: 5, col: 9 })
    expect(one("    at run (/p/q.js:1:2)")).toMatchObject({ path: "/p/q.js", line: 1, col: 2, covers: "/p/q.js:1:2" })
  })

  it("reads home-relative and bare paths with an extension", () => {
    expect(one("see ~/n.md")).toMatchObject({ path: "~/n.md", line: undefined })
    expect(one("modified: src/foo.ts")).toMatchObject({ path: "src/foo.ts" })
    expect(one("cd ./build")).toMatchObject({ path: "./build" })
  })

  it("finds several on one line", () => {
    expect(refs("a/b.ts:1 and c/d.rs:2:3").map((r) => r.covers)).toEqual(["a/b.ts:1", "c/d.rs:2:3"])
  })

  it("ignores versions, URLs, and words that aren't paths", () => {
    expect(refs("version 1.2.3:4")).toEqual([])
    expect(refs("GET http://h/a.ts:3 and https://x.dev/src/a.ts")).toEqual([])
    expect(refs("tag v1/a:b")).toEqual([])
    expect(refs("hello world done")).toEqual([])
  })

  it("leaves trailing punctuation out of the path", () => {
    expect(one("see src/a.ts.")).toMatchObject({ path: "src/a.ts", covers: "src/a.ts" })
    expect(one("(src/a.ts:3),")).toMatchObject({ path: "src/a.ts", covers: "src/a.ts:3" })
  })
})

describe("editor pref", () => {
  it("defaults to VS Code and refuses unknown editors", () => {
    expect(normalizePrefs({}).editor).toBe("vscode")
    expect(normalizePrefs({ editor: "zed" }).editor).toBe("zed")
    expect(normalizePrefs({ editor: "emacs" }).editor).toBe("vscode")
  })
})
