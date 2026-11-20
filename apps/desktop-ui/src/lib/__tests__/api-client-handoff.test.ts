jest.mock("@/store/tab-store", () => ({ useTabStore: { getState: () => ({ openTab: jest.fn() }) } }))

import { onApiClientHandoff, openInApiClient, takeApiClientHandoff } from "@/lib/api-client/handoff"
import { useTerminalStore } from "@/store/terminal-store"

const req = (url: string) => ({ name: "localhost:3000", method: "GET" as const, url })

describe("API client handoff", () => {
  beforeEach(() => void takeApiClientHandoff())

  it("hands a request over once, then nothing", () => {
    const navigate = jest.fn()
    openInApiClient(req("http://localhost:3000/api"), navigate)
    expect(navigate).toHaveBeenCalledWith("/app/api-client")
    expect(takeApiClientHandoff()).toEqual(req("http://localhost:3000/api"))
    expect(takeApiClientHandoff()).toBeNull()
  })

  it("keeps only the latest request when two arrive before the client takes one", () => {
    openInApiClient(req("http://localhost:1/a"), () => {})
    openInApiClient(req("http://localhost:2/b"), () => {})
    expect(takeApiClientHandoff()?.url).toBe("http://localhost:2/b")
  })

  it("tells a mounted API client that a request is waiting", () => {
    const seen = jest.fn()
    const off = onApiClientHandoff(seen)
    openInApiClient(req("http://localhost:3000"), () => {})
    expect(seen).toHaveBeenCalledTimes(1)
    off()
    openInApiClient(req("http://localhost:3000"), () => {})
    expect(seen).toHaveBeenCalledTimes(1)
  })
})

describe("terminal ports", () => {
  it("stores a pane's ports and forgets them when none are left", () => {
    const p = { port: 3000, url: "http://localhost:3000" }
    useTerminalStore.getState().setPorts("t1", [p])
    expect(useTerminalStore.getState().ports.t1).toEqual([p])
    useTerminalStore.getState().setPorts("t1", [])
    expect("t1" in useTerminalStore.getState().ports).toBe(false)
  })
})
