import { needsYou, projectWaitingCount, totalWaiting } from "../terminal/status"
import { leaf, splitAt } from "../terminal/layout"
import type { TerminalProject } from "@/store/terminal-store"

const proj = (id: string, collapsed: boolean, ids: string[]): TerminalProject => {
  let layout = leaf(ids[0])
  for (const i of ids.slice(1)) layout = splitAt(layout, ids[0], "row", i)
  return {
    id, path: "/" + id, name: id, collapsed, activeTabId: "t",
    tabs: [{ id: "t", name: "T", layout, terminalNames: { [ids[0]]: "zsh" } }],
  }
}
const projects = [proj("p1", true, ["a", "b"]), proj("p2", false, ["c"])]

describe("terminal status", () => {
  it("needsYou includes collapsed projects, in project order", () => {
    const r = needsYou(projects, { c: "waiting", a: "waiting", b: "running" })
    expect(r.map((x) => x.terminalId)).toEqual(["a", "c"])
    expect(r[0]).toMatchObject({ projectId: "p1", projectName: "p1", terminalName: "zsh" })
  })
  it("projectWaitingCount counts waiting only", () => {
    expect(projectWaitingCount(projects[0], { a: "waiting", b: "idle" })).toBe(1)
  })
  it("totalWaiting ignores idle/running and unknown ids", () => {
    expect(totalWaiting(projects, { a: "waiting", b: "running", c: "idle", gone: "waiting" })).toBe(1)
  })
})
