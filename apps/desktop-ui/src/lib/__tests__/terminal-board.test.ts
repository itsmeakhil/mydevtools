import { boardColumns } from "@/lib/terminal/board"
import { leaf, splitAt } from "@/lib/terminal/layout"
import type { TerminalProject } from "@/store/terminal-store"

const project = (id: string, ids: string[], branch?: string): TerminalProject => {
  let layout = leaf(ids[0])
  for (const x of ids.slice(1)) layout = splitAt(layout, ids[0], "row", x)
  return {
    id, path: "/" + id, name: id, collapsed: false, activeTabId: "t",
    tabs: [{ id: "t", name: "T", layout, terminalNames: {}, ...(branch && { worktree: { path: "/wt", branch } }) }],
  }
}

describe("boardColumns", () => {
  it("columns sort blocked/done oldest first and carry reasons", () => {
    const p = project("p", ["a", "b", "c", "d", "e", "f"])
    const cols = boardColumns(
      [p],
      { a: "waiting", b: "waiting", c: "waiting", d: "done", e: "running", f: "running" },
      { a: { since: 30 }, b: { since: 10, message: "approve edit?" }, c: { since: 20 }, d: { since: 5 } },
      { e: 200, f: 100 },
    )
    expect(cols.blocked.map((c) => c.id)).toEqual(["b", "c", "a"])
    expect(cols.blocked[0].message).toBe("approve edit?")
    expect(cols.done.map((c) => c.id)).toEqual(["d"])
    expect(cols.running.map((c) => c.id)).toEqual(["f", "e"])
    expect(cols.idle).toEqual([])
    expect(cols.blocked[0]).toMatchObject({ projectId: "p", projectName: "p", tabName: "T", tabId: "t", since: 10 })
  })

  it("worktree tabs carry their branch", () => {
    const cols = boardColumns([project("p", ["a"], "fix-login")], {}, {}, {})
    expect(cols.idle[0].worktreeBranch).toBe("fix-login")
  })

  it("empty projects give empty columns", () => {
    expect(boardColumns([], {}, {}, {})).toEqual({ blocked: [], done: [], running: [], idle: [] })
  })

  it("helper cards carry their parent id", () => {
    const cols = boardColumns([project("p", ["a", "h"])], {}, {}, {}, { a: ["h"] })
    expect(cols.idle.find((c) => c.id === "h")?.parentId).toBe("a")
    expect(cols.idle.find((c) => c.id === "a")?.parentId).toBeUndefined()
  })
})
