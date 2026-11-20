const mockSave = jest.fn()
const mockLoad = jest.fn()
const mockKill = jest.fn()
jest.mock("@/lib/desktop/terminal-bridge", () => ({
  saveTerminalState: (...a: unknown[]) => mockSave(...a),
  loadTerminalState: (...a: unknown[]) => mockLoad(...a),
  terminalKill: (...a: unknown[]) => mockKill(...a),
}))
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }))

import { toast } from "sonner"
import { useTerminalStore, resetTerminalSaveState, terminalExists, nextTabNumber } from "../terminal-store"
import { DEFAULT_PREFS } from "@/lib/terminal/util"
import { leafIds } from "@/lib/terminal/layout"

const S = () => useTerminalStore.getState()

beforeEach(() => {
  jest.useFakeTimers()
  mockSave.mockReset().mockResolvedValue(undefined)
  mockKill.mockReset().mockResolvedValue(undefined)
  resetTerminalSaveState()
  mockLoad.mockReset()
  ;(toast.error as jest.Mock).mockClear()
  useTerminalStore.setState({ projects: [], activeProjectId: null, statuses: {}, titles: {}, fontSize: 13, cwdFrom: {}, optionAsMeta: false, prefs: DEFAULT_PREFS, cwds: {}, zoomedId: null, focusedTerminalId: null, dirty: false, loaded: true })
})
afterEach(() => jest.useRealTimers())

describe("terminal store", () => {
  it("addProject creates one tab with one leaf", () => {
    S().addProject("/Users/me/code/app")
    const p = S().projects[0]
    expect(p.name).toBe("app")
    expect(p.tabs).toHaveLength(1)
    expect(leafIds(p.tabs[0].layout)).toHaveLength(1)
    expect(S().activeProjectId).toBe(p.id)
  })
  it("closeTerminal of the last leaf closes the tab", () => {
    S().addProject("/x/app")
    const p = S().projects[0]
    const id = leafIds(p.tabs[0].layout)[0]
    S().closeTerminal(id)
    expect(S().projects[0].tabs).toHaveLength(0)
    expect(mockKill).toHaveBeenCalledWith(id)
  })
  it("terminalExists tracks whether a pane is still in a layout", () => {
    S().addProject("/x/app")
    const id = leafIds(S().projects[0].tabs[0].layout)[0]
    expect(terminalExists(id)).toBe(true)
    S().closeTerminal(id)
    expect(terminalExists(id)).toBe(false)
  })
  it("renameTerminal sets a trimmed name; empty clears it back to the live title", () => {
    S().addProject("/x/app")
    const id = leafIds(S().projects[0].tabs[0].layout)[0]
    S().renameTerminal(id, "  api server  ")
    expect(S().projects[0].tabs[0].terminalNames[id]).toBe("api server")
    expect(S().dirty).toBe(true)
    S().renameTerminal(id, "   ")
    expect(id in S().projects[0].tabs[0].terminalNames).toBe(false)
    S().renameTerminal("ghost", "x") // unknown id: no-op, no throw
    expect(S().projects[0].tabs[0].terminalNames).toEqual({})
  })
  it("split adds a leaf; closeTerminal removes it", () => {
    S().addProject("/x/app")
    const id = leafIds(S().projects[0].tabs[0].layout)[0]
    S().split(id, "row")
    expect(leafIds(S().projects[0].tabs[0].layout)).toHaveLength(2)
    S().closeTerminal(id)
    expect(S().projects[0].tabs).toHaveLength(1)
  })
  it("failed save keeps dirty and the next change retries", async () => {
    mockSave.mockRejectedValueOnce(new Error("boom"))
    S().addProject("/x/app")
    await jest.advanceTimersByTimeAsync(500)
    expect(mockSave).toHaveBeenCalledTimes(1)
    expect(S().dirty).toBe(true)
    S().toggleCollapsed(S().projects[0].id)
    await jest.advanceTimersByTimeAsync(500)
    expect(mockSave).toHaveBeenCalledTimes(2)
    expect(S().dirty).toBe(false)
  })
  it("debounces rapid changes into one save", async () => {
    S().addProject("/x/a")
    S().addProject("/x/b")
    await jest.advanceTimersByTimeAsync(500)
    expect(mockSave).toHaveBeenCalledTimes(1)
  })
  it("focusTerminal selects project and tab", () => {
    S().addProject("/x/a")
    S().addProject("/x/b")
    const [pa] = S().projects
    const id = leafIds(pa.tabs[0].layout)[0]
    S().focusTerminal(id)
    expect(S().activeProjectId).toBe(pa.id)
    expect(S().focusedTerminalId).toBe(id)
  })

  it("load success populates state and enables saves", async () => {
    useTerminalStore.setState({ loaded: false })
    mockLoad.mockResolvedValue({ projects: [{ id: "p", path: "/p", name: "p", collapsed: false, tabs: [], activeTabId: null }], activeProjectId: "p" })
    await S().load()
    expect(S().loaded).toBe(true)
    expect(S().projects.map((p) => p.id)).toEqual(["p"])
    expect(S().activeProjectId).toBe("p")
  })

  it("load failure never PUTs, toasts once, and can be retried", async () => {
    useTerminalStore.setState({ loaded: false })
    mockLoad.mockRejectedValue(new Error("down"))
    await S().load()
    await S().load()
    expect(S().loaded).toBe(false)
    expect(toast.error).toHaveBeenCalledTimes(1)
    S().addProject("/x/new")
    await jest.advanceTimersByTimeAsync(2000)
    expect(mockSave).not.toHaveBeenCalled()
    mockLoad.mockResolvedValue({ projects: [], activeProjectId: null })
    await S().load()
    await jest.advanceTimersByTimeAsync(500)
    expect(S().loaded).toBe(true)
    expect(mockSave).toHaveBeenCalledTimes(1)
    expect(mockSave.mock.calls[0][0].projects).toHaveLength(1)
  })

  it("mutation during load is merged with loaded projects, then saved", async () => {
    useTerminalStore.setState({ loaded: false })
    let resolve!: (v: unknown) => void
    mockLoad.mockReturnValue(new Promise((r) => (resolve = r)))
    const pending = S().load()
    S().addProject("/x/mine")
    await jest.advanceTimersByTimeAsync(1000)
    expect(mockSave).not.toHaveBeenCalled()
    resolve({ projects: [{ id: "old", path: "/old", name: "old", collapsed: false, tabs: [], activeTabId: null }], activeProjectId: "old" })
    await pending
    await jest.advanceTimersByTimeAsync(500)
    expect(S().projects.map((p) => p.name)).toEqual(["old", "mine"])
    expect(mockSave).toHaveBeenCalledTimes(1)
    expect(mockSave.mock.calls[0][0].projects).toHaveLength(2)
  })

  it("overlapping saves are serialized; final body is the latest state", async () => {
    const resolvers: (() => void)[] = []
    mockSave.mockImplementation(() => new Promise<void>((r) => resolvers.push(r)))
    S().addProject("/x/a")
    await jest.advanceTimersByTimeAsync(500)
    expect(mockSave).toHaveBeenCalledTimes(1)
    S().addProject("/x/b")
    await jest.advanceTimersByTimeAsync(500)
    expect(mockSave).toHaveBeenCalledTimes(1) // waits for the first
    resolvers[0]()
    await jest.advanceTimersByTimeAsync(0)
    expect(mockSave).toHaveBeenCalledTimes(2)
    expect(mockSave.mock.calls[1][0].projects).toHaveLength(2)
    resolvers[1]()
    await jest.advanceTimersByTimeAsync(0)
    expect(S().dirty).toBe(false)
  })

  it("toast.error fires once across repeated failures", async () => {
    mockSave.mockRejectedValue(new Error("nope"))
    S().addProject("/x/a")
    await jest.advanceTimersByTimeAsync(500)
    S().addProject("/x/b")
    await jest.advanceTimersByTimeAsync(500)
    S().addProject("/x/c")
    await jest.advanceTimersByTimeAsync(500)
    expect(mockSave).toHaveBeenCalledTimes(3)
    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(S().dirty).toBe(true)
  })

  it("closing prunes statuses and setStatus ignores unknown ids", () => {
    S().addProject("/x/a")
    const id = leafIds(S().projects[0].tabs[0].layout)[0]
    S().setStatus(id, "waiting")
    S().setStatus("ghost", "waiting")
    expect(S().statuses).toEqual({ [id]: "waiting" })
    S().closeTerminal(id)
    expect(S().statuses).toEqual({})
    expect(S().attention).toEqual({})
  })

  it("newTab queues a command for the new pane, read once", () => {
    S().addProject("/x/a")
    const p = S().projects[0]
    S().newTab(p.id, "Codex", { run: "  codex  " })
    const tab = S().projects[0].tabs.at(-1)!
    const id = leafIds(tab.layout)[0]
    expect(tab.name).toBe("Codex")
    expect(S().takeRunOnStart(id)).toBe("codex")
    expect(S().takeRunOnStart(id)).toBeUndefined()
    S().newTab(p.id, undefined, { run: "   " })
    expect(S().runOnStart).toEqual({})
  })

  it("a worktree tab keeps its worktree and doesn't inherit the focused pane's folder", () => {
    S().addProject("/x/a")
    const p = S().projects[0]
    S().focusTerminal(leafIds(p.tabs[0].layout)[0])
    S().newTab(p.id, "fix login", { worktree: { path: "/x/a.worktrees/fix-login", branch: "fix-login" } })
    const tab = S().projects[0].tabs.at(-1)!
    expect(tab.worktree).toEqual({ path: "/x/a.worktrees/fix-login", branch: "fix-login" })
    expect(S().cwdFrom[leafIds(tab.layout)[0]]).toBeUndefined()
  })

  it("saved commands: add trims and names blank ones after the command, remove by index", () => {
    S().addProject("/x/a")
    const pid = S().projects[0].id
    S().addCommand(pid, { name: " Dev ", command: " npm run dev " })
    S().addCommand(pid, { name: "", command: "make test" })
    S().addCommand(pid, { name: "nothing", command: "  " })
    expect(S().projects[0].commands).toEqual([{ name: "Dev", command: "npm run dev" }, { name: "make test", command: "make test" }])
    S().removeCommand(pid, 0)
    expect(S().projects[0].commands).toEqual([{ name: "make test", command: "make test" }])
    expect(S().dirty).toBe(true)
  })

  it("setAgent tracks known panes only and closing forgets it", () => {
    S().addProject("/x/a")
    const id = leafIds(S().projects[0].tabs[0].layout)[0]
    S().setAgent(id, "codex")
    S().setAgent("ghost", "codex")
    expect(S().agents).toEqual({ [id]: "codex" })
    S().setAgent(id, null)
    expect(S().agents).toEqual({})
    S().setAgent(id, "gemini")
    S().closeTerminal(id)
    expect(S().agents).toEqual({})
  })

  it("attention keeps when waiting started and the latest reason, cleared on leaving waiting", () => {
    jest.setSystemTime(1_000)
    S().addProject("/x/a")
    const id = leafIds(S().projects[0].tabs[0].layout)[0]
    S().setStatus(id, "waiting", "needs permission")
    jest.setSystemTime(5_000)
    S().setStatus(id, "waiting") // snapshot replay: no message
    expect(S().attention[id]).toEqual({ since: 1_000, message: "needs permission" })
    S().setStatus(id, "waiting", "approve edit?")
    expect(S().attention[id]).toEqual({ since: 1_000, message: "approve edit?" })
    S().setStatus(id, "running")
    expect(S().attention[id]).toBeUndefined()
    S().setStatus(id, "waiting")
    expect(S().attention[id]).toEqual({ since: 5_000, message: undefined })
    S().setStatus(id, "idle")
    expect(S().attention).toEqual({})
    S().setStatus(id, "done", undefined, { code: 0, ms: 61_000 })
    expect(S().attention[id].command).toEqual({ code: 0, ms: 61_000 })
  })

  it("focusTerminal expands a collapsed project", () => {
    S().addProject("/x/a")
    const p = S().projects[0]
    S().toggleCollapsed(p.id)
    expect(S().projects[0].collapsed).toBe(true)
    S().focusTerminal(leafIds(p.tabs[0].layout)[0])
    expect(S().projects[0].collapsed).toBe(false)
  })

  it("focusTerminal inside the visible tab does not schedule a save", async () => {
    S().addProject("/x/a")
    await jest.advanceTimersByTimeAsync(500)
    mockSave.mockClear()
    S().focusTerminal(leafIds(S().projects[0].tabs[0].layout)[0])
    await jest.advanceTimersByTimeAsync(500)
    expect(mockSave).not.toHaveBeenCalled()
  })

  it("load is idempotent: concurrent calls share one request, loaded calls are no-ops", async () => {
    useTerminalStore.setState({ loaded: false })
    mockLoad.mockResolvedValue({ projects: [], activeProjectId: null })
    await Promise.all([S().load(), S().load()])
    expect(mockLoad).toHaveBeenCalledTimes(1)
    S().addProject("/x/a")
    await S().load()
    expect(mockLoad).toHaveBeenCalledTimes(1)
    expect(S().projects).toHaveLength(1)
  })

  it("flushNow saves a pending debounced change at once and resolves when it lands", async () => {
    S().addProject("/x/a")
    let land!: () => void
    mockSave.mockImplementationOnce(() => new Promise<void>((r) => (land = r)))
    const done = jest.fn()
    void S().flushNow().then(done)
    expect(mockSave).toHaveBeenCalledTimes(1)
    await jest.advanceTimersByTimeAsync(0)
    expect(done).not.toHaveBeenCalled()
    land()
    await jest.advanceTimersByTimeAsync(0)
    expect(done).toHaveBeenCalled()
    expect(S().dirty).toBe(false)
    await jest.advanceTimersByTimeAsync(500)
    expect(mockSave).toHaveBeenCalledTimes(1)
  })

  it("flushNow is a no-op when nothing is dirty", async () => {
    await S().flushNow()
    expect(mockSave).not.toHaveBeenCalled()
  })

  it("newTab and addProject use a provided name", () => {
    S().addProject("/x/a", "Terminal 1")
    S().newTab(S().projects[0].id, "Onglet 2")
    expect(S().projects[0].tabs.map((t) => t.name)).toEqual(["Terminal 1", "Onglet 2"])
  })

  it("tab numbers never repeat after closing a tab", () => {
    S().addProject("/x/a", "Terminal 1")
    const pid = S().projects[0].id
    const p = () => S().projects[0]
    S().newTab(pid, `Terminal ${nextTabNumber(p())}`)
    S().closeTab(pid, p().tabs[0].id)
    expect(nextTabNumber(p())).toBe(3)
    S().newTab(pid, `Terminal ${nextTabNumber(p())}`)
    expect(p().tabs.map((t) => t.name)).toEqual(["Terminal 2", "Terminal 3"])
    // Saves from before tabSeq existed: highest trailing number in the names.
    expect(nextTabNumber({ tabs: [{ ...p().tabs[0], name: "Terminal 2" }] })).toBe(3)
    expect(nextTabNumber({ tabs: [] })).toBe(1)
  })

  it("moveTab moves a tab into the target's slot and saves", () => {
    S().addProject("/x/a", "A")
    const pid = S().projects[0].id
    S().newTab(pid, "B")
    S().newTab(pid, "C")
    const [a, , c] = S().projects[0].tabs
    S().moveTab(pid, c.id, a.id)
    expect(S().projects[0].tabs.map((t) => t.name)).toEqual(["C", "A", "B"])
    S().moveTab(pid, c.id, S().projects[0].tabs[2].id)
    expect(S().projects[0].tabs.map((t) => t.name)).toEqual(["A", "B", "C"])
    expect(S().dirty).toBe(true)
  })

  it("split and new tab open in the focused pane's directory", () => {
    S().addProject("/x/app")
    const pid = S().projects[0].id
    const first = leafIds(S().projects[0].tabs[0].layout)[0]
    S().split(first, "row")
    const second = S().focusedTerminalId!
    expect(S().cwdFrom[second]).toBe(first)
    S().newTab(pid)
    const tabLeaf = leafIds(S().projects[0].tabs[1].layout)[0]
    expect(S().cwdFrom[tabLeaf]).toBe(second)
    // Focus in another project: the new tab opens in its own project folder.
    S().addProject("/y/other")
    useTerminalStore.setState({ focusedTerminalId: leafIds(S().projects[1].tabs[0].layout)[0] })
    S().newTab(pid)
    expect(S().cwdFrom[leafIds(S().projects[0].tabs[2].layout)[0]]).toBeUndefined()
  })

  it("font size is clamped, saved with the layout and restored on load", async () => {
    S().setFontSize(99)
    expect(S().fontSize).toBe(24)
    await jest.advanceTimersByTimeAsync(500)
    expect(mockSave.mock.calls[0][0].fontSize).toBe(24)
    useTerminalStore.setState({ loaded: false, dirty: false, fontSize: 13 })
    mockLoad.mockResolvedValue({ projects: [], activeProjectId: null, fontSize: 16 })
    await S().load()
    expect(S().fontSize).toBe(16)
  })

  it("restartTerminal swaps in a fresh id in the same slot, keeping its name and directory source", () => {
    S().addProject("/x/app")
    const a = leafIds(S().projects[0].tabs[0].layout)[0]
    S().split(a, "row")
    const b = leafIds(S().projects[0].tabs[0].layout)[1]
    S().renameTerminal(a, "server")
    S().focusTerminal(a)
    S().setStatus(a, "running")
    S().restartTerminal(a)
    const tab = S().projects[0].tabs[0]
    const [fresh, second] = leafIds(tab.layout)
    expect(fresh).not.toBe(a)
    expect(second).toBe(b)
    expect(tab.terminalNames[fresh]).toBe("server")
    expect(tab.terminalNames[a]).toBeUndefined()
    expect(S().cwdFrom[fresh]).toBe(a)
    expect(S().focusedTerminalId).toBe(fresh)
    expect(S().statuses[a]).toBeUndefined()
    expect(mockKill).not.toHaveBeenCalled() // the new pane kills the old session after spawning from its cwd
  })

  it("toggleZoom needs a split; split clears it", () => {
    S().addProject("/x/app")
    const a = leafIds(S().projects[0].tabs[0].layout)[0]
    S().toggleZoom(a)
    expect(S().zoomedId).toBeNull()
    S().split(a, "row")
    S().toggleZoom(a)
    expect(S().zoomedId).toBe(a)
    expect(S().focusedTerminalId).toBe(a)
    S().toggleZoom(a)
    expect(S().zoomedId).toBeNull()
    S().toggleZoom(a)
    S().split(a, "col")
    expect(S().zoomedId).toBeNull()
  })

  it("optionAsMeta is saved and restored; older saves default to off", async () => {
    S().setOptionAsMeta(true)
    await jest.advanceTimersByTimeAsync(500)
    expect(mockSave.mock.calls[0][0].optionAsMeta).toBe(true)
    useTerminalStore.setState({ loaded: false, dirty: false, optionAsMeta: false })
    mockLoad.mockResolvedValue({ projects: [], activeProjectId: null, optionAsMeta: true })
    await S().load()
    expect(S().optionAsMeta).toBe(true)
    useTerminalStore.setState({ loaded: false, dirty: false, optionAsMeta: false })
    mockLoad.mockResolvedValue({ projects: [], activeProjectId: null })
    await S().load()
    expect(S().optionAsMeta).toBe(false)
  })

  it("prefs: setPrefs saves only real changes; load normalizes, older saves get defaults", async () => {
    S().setPrefs({ cursorStyle: "block" }) // already the default
    expect(S().dirty).toBe(false)
    S().setPrefs({ cursorStyle: "bar", lineHeight: 7 })
    expect(S().prefs).toEqual({ ...DEFAULT_PREFS, cursorStyle: "bar" })
    await jest.advanceTimersByTimeAsync(500)
    expect(mockSave.mock.calls[0][0].prefs).toEqual({ ...DEFAULT_PREFS, cursorStyle: "bar" })
    useTerminalStore.setState({ loaded: false, dirty: false, prefs: DEFAULT_PREFS })
    mockLoad.mockResolvedValue({ projects: [], activeProjectId: null, prefs: { notifySound: true, scrollback: 3 } })
    await S().load()
    expect(S().prefs).toEqual({ ...DEFAULT_PREFS, notifySound: true })
    useTerminalStore.setState({ loaded: false, dirty: false, prefs: DEFAULT_PREFS })
    mockLoad.mockResolvedValue({ projects: [], activeProjectId: null })
    await S().load()
    expect(S().prefs).toEqual(DEFAULT_PREFS)
  })
})
