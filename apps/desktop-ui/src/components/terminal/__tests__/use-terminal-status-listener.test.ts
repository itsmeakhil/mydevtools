const mockHandlers: Record<string, (p: never) => void> = {}
const mockOff = jest.fn()
const mockListen = (name: string) => (cb: (p: never) => void) => {
  mockHandlers[name] = cb
  return Promise.resolve(mockOff)
}
const mockStatuses = jest.fn()
const mockLoad = jest.fn()
const mockConfirmed = jest.fn()
const mockCancelled = jest.fn()
jest.mock("@/lib/desktop/terminal-bridge", () => ({
  onTerminalStatus: (cb: never) => mockListen("status")(cb),
  onTerminalFocus: (cb: never) => mockListen("focus")(cb),
  onQuitRequested: (cb: never) => mockListen("quit")(cb),
  terminalStatuses: () => mockStatuses(),
  loadTerminalState: () => mockLoad(),
  saveTerminalState: () => Promise.resolve(),
  terminalKill: () => Promise.resolve(),
  appQuitConfirmed: () => mockConfirmed(),
  appQuitCancelled: () => mockCancelled(),
}))
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }))
jest.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }))
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock("@/components/confirm-dialog", () => ({ useConfirm: () => ({ confirm: jest.fn(), dialog: null }) }))

import { toast } from "sonner"
import { useTerminalStore, resetTerminalSaveState } from "@/store/terminal-store"
import { leaf } from "@/lib/terminal/layout"
import { subscribeTerminalAttention, finishQuit } from "../use-terminal-status-listener"

const S = () => useTerminalStore.getState()
const project = {
  id: "p", path: "/x", name: "x", collapsed: false, activeTabId: "t",
  tabs: [{ id: "t", name: "T", terminalNames: {}, layout: leaf("a") }],
}

beforeEach(() => {
  resetTerminalSaveState()
  mockOff.mockReset()
  mockStatuses.mockReset().mockResolvedValue({ a: "waiting" })
  mockLoad.mockReset().mockResolvedValue({ projects: [project], activeProjectId: "p" })
  mockConfirmed.mockReset().mockResolvedValue(undefined)
  mockCancelled.mockReset().mockResolvedValue(undefined)
  ;(toast.error as jest.Mock).mockClear()
  useTerminalStore.setState({ projects: [], activeProjectId: null, statuses: {}, titles: {}, focusedTerminalId: null, dirty: false, loaded: false })
})
afterEach(() => jest.useRealTimers())

const settle = () => new Promise((r) => setTimeout(r, 0))

describe("subscribeTerminalAttention", () => {
  it("loads, then replays Rust's status snapshot (events before load are dropped)", async () => {
    const off = subscribeTerminalAttention(jest.fn(), jest.fn())
    mockHandlers.status({ id: "a", status: "running" } as never) // before load: unknown id
    expect(S().statuses).toEqual({})
    await settle()
    expect(mockLoad).toHaveBeenCalledTimes(1)
    expect(S().statuses).toEqual({ a: "waiting" })
    mockHandlers.status({ id: "a", status: "idle" } as never)
    expect(S().statuses).toEqual({})
    off()
    expect(mockOff).toHaveBeenCalledTimes(3)
  })

  it("replays when a later load (e.g. retry) succeeds", async () => {
    mockLoad.mockRejectedValueOnce(new Error("locked"))
    subscribeTerminalAttention(jest.fn(), jest.fn())
    await settle()
    expect(S().loaded).toBe(false)
    expect(mockStatuses).not.toHaveBeenCalled()
    await S().load()
    await settle()
    expect(S().statuses).toEqual({ a: "waiting" })
  })

  it("forwards focus and quit requests, flushing pending saves on quit", async () => {
    const onFocus = jest.fn()
    const onQuit = jest.fn()
    subscribeTerminalAttention(onFocus, onQuit)
    await settle()
    const flush = jest.spyOn(S(), "flushNow")
    mockHandlers.focus({ id: "a" } as never)
    mockHandlers.quit({ count: 2 } as never)
    expect(onFocus).toHaveBeenCalledWith("a")
    expect(onQuit).toHaveBeenCalledWith(2)
    expect(flush).toHaveBeenCalled()
  })
})

describe("finishQuit", () => {
  it("confirm waits for the save at most 1.5 s, then quits", async () => {
    jest.useFakeTimers()
    useTerminalStore.setState({ dirty: true, flushNow: () => new Promise<void>(() => {}) })
    const p = finishQuit(true)
    await jest.advanceTimersByTimeAsync(1499)
    expect(mockConfirmed).not.toHaveBeenCalled()
    await jest.advanceTimersByTimeAsync(1)
    await p
    expect(mockConfirmed).toHaveBeenCalledTimes(1)
  })

  it("confirm quits after a clean save", async () => {
    useTerminalStore.setState({ dirty: false, flushNow: () => Promise.resolve() })
    await finishQuit(true)
    expect(mockConfirmed).toHaveBeenCalledTimes(1)
    expect(mockCancelled).not.toHaveBeenCalled()
  })

  it("confirm keeps the app open when the save settled but failed (still dirty)", async () => {
    useTerminalStore.setState({ dirty: true, flushNow: () => Promise.resolve() })
    await finishQuit(true)
    expect(mockConfirmed).not.toHaveBeenCalled()
    expect(mockCancelled).toHaveBeenCalledTimes(1)
  })

  it("cancel tells Rust; failures become a toast", async () => {
    await finishQuit(false)
    expect(mockCancelled).toHaveBeenCalledTimes(1)
    mockCancelled.mockRejectedValueOnce(new Error("nope"))
    await finishQuit(false)
    expect(toast.error).toHaveBeenCalledWith("nope")
  })
})
