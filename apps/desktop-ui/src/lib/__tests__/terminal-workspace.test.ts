import { configHash } from "@/lib/terminal/trust"
import { needsTrust, needsUnlock, planWorkspace } from "@/lib/terminal/workspace"
import { LAYOUT_PRESETS, leaf } from "@/lib/terminal/layout"

describe("workspaces and trust", () => {
  it("hashes the exact file text (sha-256 hex)", async () => {
    expect(await configHash("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
  })
  it("maps pane entries to the layout's panes in order", () => {
    const plan = planWorkspace({ name: "w", layout: LAYOUT_PRESETS.columns3, panes: [{ command: "claude" }, {}, { command: "npm test", env: "api" }] })
    expect(plan).toEqual([{ run: "claude" }, {}, { run: "npm test", envName: "api" }])
    expect(planWorkspace({ name: "w", layout: LAYOUT_PRESETS.grid })).toEqual([{}, {}, {}, {}])
  })
  it("only layouts with nothing to run or open need no trust", () => {
    expect(needsTrust({ name: "w", layout: leaf("a") })).toBe(false)
    expect(needsTrust({ name: "w", layout: leaf("a"), panes: [{}] })).toBe(false)
    expect(needsTrust({ name: "w", layout: leaf("a"), panes: [{ command: "ls" }] })).toBe(true)
    expect(needsTrust({ name: "w", layout: leaf("a"), panes: [{ env: "prod" }] })).toBe(true)
    expect(needsTrust({ name: "w", layout: leaf("a"), worktree: "x" })).toBe(true)
  })
  it("a workspace with saved environments can't open while the vault is locked", () => {
    expect(needsUnlock([{ run: "ls" }, { envName: "api" }], false)).toBe(true)
    expect(needsUnlock([{ run: "ls" }, { envName: "api" }], true)).toBe(false)
    expect(needsUnlock([{ run: "ls" }, {}], false)).toBe(false)
  })
})
