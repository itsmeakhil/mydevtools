import {
  blobMime,
  buildFolderTree,
  countFolders,
  fileTypeStats,
  joinDir,
  looksLikeText,
  parentDir,
  visibleRange,
  type SecureFileEntry,
} from "../secure-files"

const f = (name: string, dir: string): SecureFileEntry => ({ id: name, name, dir, size: 1, mtime: 0, importedAt: 0 })

describe("buildFolderTree", () => {
  it("derives nested folders from file dirs and keeps empty extra dirs", () => {
    const tree = buildFolderTree(
      [f("z.txt", ""), f("a.txt", "proj/src"), f("b.txt", "proj"), f("c.txt", "proj/src")],
      ["proj/empty", "other"],
    )
    expect(tree.files.map((x) => x.name)).toEqual(["z.txt"])
    expect(tree.children.map((c) => c.path)).toEqual(["other", "proj"])
    const proj = tree.children[1]!
    expect(proj.files.map((x) => x.name)).toEqual(["b.txt"])
    expect(proj.children.map((c) => c.path)).toEqual(["proj/empty", "proj/src"])
    expect(proj.children[1]!.files.map((x) => x.name)).toEqual(["a.txt", "c.txt"])
    expect(proj.children[0]!.files).toEqual([])
  })

  it("path helpers", () => {
    expect(joinDir("", "a")).toBe("a")
    expect(joinDir("a", "b")).toBe("a/b")
    expect(parentDir("a/b/c")).toBe("a/b")
    expect(parentDir("a")).toBe("")
  })
})

describe("visibleRange", () => {
  it("windows with overscan and clamps to bounds", () => {
    expect(visibleRange(0, 600, 36, 100000, 6)).toEqual([0, 23])
    expect(visibleRange(3600, 600, 36, 100000, 6)).toEqual([94, 123])
    const [s, e] = visibleRange(100000 * 36, 600, 36, 100000, 6)
    expect(e).toBe(100000)
    expect(s).toBeLessThanOrEqual(e)
    expect(visibleRange(0, 600, 36, 0)).toEqual([0, 0])
    expect(visibleRange(0, 600, 36, 5)).toEqual([0, 5])
  })
})

describe("fileTypeStats / countFolders", () => {
  const classify = (name: string) => (name.endsWith(".png") ? "image" : name.endsWith(".ts") ? "code" : "file")

  it("groups by type, biggest group first", () => {
    const files: SecureFileEntry[] = [
      { ...f("a.png", ""), size: 100 },
      { ...f("b.ts", ""), size: 10 },
      { ...f("c.ts", ""), size: 20 },
      { ...f("d.bin", ""), size: 5 },
    ]
    // Equal counts fall back to size, biggest first.
    expect(fileTypeStats(files, classify)).toEqual([
      { type: "code", count: 2, size: 30 },
      { type: "image", count: 1, size: 100 },
      { type: "file", count: 1, size: 5 },
    ])
    expect(fileTypeStats([], classify)).toEqual([])
  })

  it("counts every folder except the root", () => {
    const tree = buildFolderTree([f("x.txt", "a/b"), f("y.txt", "c")], ["d/e/f"])
    expect(countFolders(tree)).toBe(6) // a, a/b, c, d, d/e, d/e/f
  })
})

describe("blobMime", () => {
  it("maps names to media types the webview understands", () => {
    expect(blobMime("image", "a.jpg")).toBe("image/jpeg")
    expect(blobMime("image", "a.PNG")).toBe("image/png")
    expect(blobMime("image", "logo.svg")).toBe("image/svg+xml")
    expect(blobMime("pdf", "doc.pdf")).toBe("application/pdf")
    expect(blobMime("file", "secrets.env")).toBe("application/octet-stream")
  })
})

describe("looksLikeText", () => {
  it("accepts utf-8, rejects NUL/invalid bytes", () => {
    expect(looksLikeText(new TextEncoder().encode("KEY=value\n"))).toBe(true)
    expect(looksLikeText(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 1]))).toBe(false)
    expect(looksLikeText(new Uint8Array([0xff, 0xfe, 0xfd]))).toBe(false)
    expect(looksLikeText(new Uint8Array())).toBe(true)
  })
})

describe("NO_FOLDER", () => {
  it("is a value no real folder path can equal", () => {
    const { NO_FOLDER } = require("../secure-files")
    expect(typeof NO_FOLDER).toBe("string")
    // "" is the root folder and must stay distinct from "no selection".
    expect(NO_FOLDER).not.toBe("")
    expect(NO_FOLDER).not.toMatch(/^[\w./-]+$/)
  })
})
