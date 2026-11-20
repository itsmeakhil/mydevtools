import { parseProjectConfig, serializeProjectConfig, SCHEMA_URL, type ProjectConfigV1 } from "@/lib/terminal/project-config"
import { LAYOUT_PRESETS, leaf, type SplitNode } from "@/lib/terminal/layout"

const config: ProjectConfigV1 = {
  version: 1,
  commands: [{ name: "Dev", command: "npm run dev" }],
  workspaces: [
    { name: "Review", layout: LAYOUT_PRESETS.columns2, worktree: "review", panes: [{ command: "claude" }, { command: "npm test", env: "api · staging" }] },
  ],
}

describe("project terminal config", () => {
  it("round-trips, with $schema first and readable pane ids", () => {
    const text = serializeProjectConfig(config)
    expect(text.endsWith("}\n")).toBe(true)
    expect(text.split("\n")[1]).toBe(`  "$schema": "${SCHEMA_URL}",`)
    expect(text).toContain('"id": "p1"')
    const back = parseProjectConfig(text)
    expect(back.ok && serializeProjectConfig(back.config)).toBe(text)
  })

  it("rejects unknown versions, bad JSON and non-string pane fields", () => {
    expect(parseProjectConfig(JSON.stringify({ version: 2 })).ok).toBe(false)
    expect(parseProjectConfig("{ nope").ok).toBe(false)
    const secretInline = { version: 1, workspaces: [{ name: "x", layout: leaf("a"), panes: [{ env: { TOKEN: "s3cret" } }] }] }
    expect(parseProjectConfig(JSON.stringify(secretInline)).ok).toBe(false)
  })

  it("rejects layouts it can't safely open", () => {
    const wide: SplitNode = { kind: "split", dir: "row", children: Array.from({ length: 17 }, (_, i) => leaf(`l${i}`)), sizes: Array(17).fill(100 / 17) }
    expect(parseProjectConfig(JSON.stringify({ version: 1, workspaces: [{ name: "w", layout: wide }] })).ok).toBe(false)
    const badSizes = { kind: "split", dir: "row", children: [leaf("a"), leaf("b")], sizes: [100] }
    expect(parseProjectConfig(JSON.stringify({ version: 1, workspaces: [{ name: "w", layout: badSizes }] })).ok).toBe(false)
    const tooManyPanes = { version: 1, workspaces: [{ name: "w", layout: leaf("a"), panes: [{}, {}] }] }
    expect(parseProjectConfig(JSON.stringify(tooManyPanes)).ok).toBe(false)
  })

  it("rejects control and invisible characters that would hide what runs", () => {
    const cmd = (command: string) => parseProjectConfig(JSON.stringify({ version: 1, commands: [{ name: "x", command }] })).ok
    expect(cmd("\u0010")).toBe(false) // Ctrl-P: re-runs the last history line
    expect(cmd("\u0012deploy")).toBe(false) // Ctrl-R: history search
    expect(cmd("ls\nrm -rf ~")).toBe(false)
    expect(cmd("echo \u202Eevil")).toBe(false) // right-to-left override
    expect(cmd("echo a\u200Bb")).toBe(false) // zero-width space
    expect(cmd("echo café · ok")).toBe(true)
    const pane = { version: 1, workspaces: [{ name: "w", layout: { kind: "leaf", id: "a" }, panes: [{ env: "prod\u0007" }] }] }
    expect(parseProjectConfig(JSON.stringify(pane)).ok).toBe(false)
  })

  it("keeps only known layout fields and normalizes sizes", () => {
    const layout = { kind: "split", dir: "row", extra: "x".repeat(10), children: [{ kind: "leaf", id: "a", junk: 1 }, { kind: "leaf", id: "b" }], sizes: [1e-300, 1] }
    const r = parseProjectConfig(JSON.stringify({ version: 1, workspaces: [{ name: "w", layout }] }))
    expect(r.ok).toBe(true)
    const got = r.ok ? r.config.workspaces![0].layout : null
    expect(got).toEqual({ kind: "split", dir: "row", children: [{ kind: "leaf", id: "a" }, { kind: "leaf", id: "b" }], sizes: [5, 95] })
    const huge = { ...layout, sizes: [1e308, 1e308] }
    const h = parseProjectConfig(JSON.stringify({ version: 1, workspaces: [{ name: "w", layout: huge }] }))
    expect(h.ok && h.config.workspaces![0].layout).toMatchObject({ sizes: [50, 50] })
  })
})
