const mockSave = jest.fn()
const mockLoad = jest.fn()
const mockKill = jest.fn()
jest.mock("@/lib/desktop/terminal-bridge", () => ({
  saveTerminalState: (...a: unknown[]) => mockSave(...a),
  loadTerminalState: (...a: unknown[]) => mockLoad(...a),
  terminalKill: (...a: unknown[]) => mockKill(...a),
}))
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }))

import { useTerminalStore } from "../terminal-store"
import { leafIds } from "@/lib/terminal/layout"

const S = () => useTerminalStore.getState()

beforeEach(() => {
  jest.useFakeTimers()
  mockSave.mockReset().mockResolvedValue(undefined)
  mockKill.mockReset().mockResolvedValue(undefined)
  useTerminalStore.setState({ projects: [], activeProjectId: null, statuses: {}, focusedTerminalId: null, dirty: false })
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
})
