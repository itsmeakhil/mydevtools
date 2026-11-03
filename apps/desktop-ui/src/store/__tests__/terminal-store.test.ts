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
import { useTerminalStore, resetTerminalSaveState } from "../terminal-store"
import { leafIds } from "@/lib/terminal/layout"

const S = () => useTerminalStore.getState()

beforeEach(() => {
  jest.useFakeTimers()
  mockSave.mockReset().mockResolvedValue(undefined)
  mockKill.mockReset().mockResolvedValue(undefined)
  resetTerminalSaveState()
  mockLoad.mockReset()
  ;(toast.error as jest.Mock).mockClear()
  useTerminalStore.setState({ projects: [], activeProjectId: null, statuses: {}, focusedTerminalId: null, dirty: false, loaded: true })
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
  })
})
