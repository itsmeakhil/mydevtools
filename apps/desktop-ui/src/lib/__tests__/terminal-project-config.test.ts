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
})
