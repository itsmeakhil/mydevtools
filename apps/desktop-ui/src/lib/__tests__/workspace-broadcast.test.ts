/**
 * Tests for workspace-broadcast module.
 * These tests verify BroadcastChannel functionality for cross-tab workspace sync.
 */

describe("workspace-broadcast", () => {
  let addEventListenerFn: jest.Mock
  let removeEventListenerFn: jest.Mock
  let postMessageFn: jest.Mock

  beforeEach(() => {
    addEventListenerFn = jest.fn()
    removeEventListenerFn = jest.fn()
    postMessageFn = jest.fn()

    // Mock the global BroadcastChannel
    Object.defineProperty(global, "BroadcastChannel", {
      value: jest.fn(() => ({
        addEventListener: addEventListenerFn,
        removeEventListener: removeEventListenerFn,
        postMessage: postMessageFn,
      })),
      writable: true,
      configurable: true,
    })

    // Mock window if it doesn't exist
    if (!global.window) {
      Object.defineProperty(global, "window", {
        value: {},
        writable: true,
        configurable: true,
      })
    }

    // Make sure window has BroadcastChannel
    ;(global.window as any).BroadcastChannel = (global as any).BroadcastChannel
  })

  afterEach(() => {
    jest.resetModules()
  })

  it("exports broadcastWorkspaceChanged function", () => {
    const { broadcastWorkspaceChanged } = require("@/lib/workspace-broadcast")
    expect(typeof broadcastWorkspaceChanged).toBe("function")
  })

  it("exports subscribeToWorkspaceBroadcast function", () => {
    const { subscribeToWorkspaceBroadcast } = require("@/lib/workspace-broadcast")
    expect(typeof subscribeToWorkspaceBroadcast).toBe("function")
  })

  it("exports getWorkspaceBroadcast function", () => {
    const { getWorkspaceBroadcast } = require("@/lib/workspace-broadcast")
    expect(typeof getWorkspaceBroadcast).toBe("function")
  })

  describe("broadcastWorkspaceChanged", () => {
    it("calls postMessage with workspace-changed message", () => {
      const { broadcastWorkspaceChanged } = require("@/lib/workspace-broadcast")

      broadcastWorkspaceChanged("ws-123")

      expect(postMessageFn).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "workspace-changed",
          workspaceId: "ws-123",
        })
      )
    })

    it("handles multiple workspace IDs", () => {
      const { broadcastWorkspaceChanged } = require("@/lib/workspace-broadcast")

      broadcastWorkspaceChanged("ws-a")
      broadcastWorkspaceChanged("ws-b")

      expect(postMessageFn).toHaveBeenCalledTimes(2)
      expect(postMessageFn).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ workspaceId: "ws-a" })
      )
      expect(postMessageFn).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ workspaceId: "ws-b" })
      )
    })
  })

  describe("subscribeToWorkspaceBroadcast", () => {
    it("adds message event listener", () => {
      const { subscribeToWorkspaceBroadcast } = require("@/lib/workspace-broadcast")
      const handler = jest.fn()

      subscribeToWorkspaceBroadcast(handler)

      expect(addEventListenerFn).toHaveBeenCalledWith("message", expect.any(Function))
    })

    it("returns an unsubscribe function", () => {
      const { subscribeToWorkspaceBroadcast } = require("@/lib/workspace-broadcast")
      const handler = jest.fn()

      const unsubscribe = subscribeToWorkspaceBroadcast(handler)

      expect(typeof unsubscribe).toBe("function")
    })

    it("calls handler when message is received", () => {
      const { subscribeToWorkspaceBroadcast } = require("@/lib/workspace-broadcast")
      const handler = jest.fn()

      subscribeToWorkspaceBroadcast(handler)

      const listener = addEventListenerFn.mock.calls[0][1] as Function
      const testMessage = {
        type: "workspace-changed" as const,
        workspaceId: "ws-789",
      }

      listener({ data: testMessage })

      expect(handler).toHaveBeenCalledWith(testMessage)
    })

    it("unsubscribe removes the event listener", () => {
      const { subscribeToWorkspaceBroadcast } = require("@/lib/workspace-broadcast")
      const handler = jest.fn()

      const unsubscribe = subscribeToWorkspaceBroadcast(handler)
      const listener = addEventListenerFn.mock.calls[0][1]

      unsubscribe()

      expect(removeEventListenerFn).toHaveBeenCalledWith("message", listener)
    })

    it("supports multiple independent subscriptions", () => {
      const { subscribeToWorkspaceBroadcast } = require("@/lib/workspace-broadcast")
      const handler1 = jest.fn()
      const handler2 = jest.fn()

      subscribeToWorkspaceBroadcast(handler1)
      subscribeToWorkspaceBroadcast(handler2)

      expect(addEventListenerFn).toHaveBeenCalledTimes(2)
    })

    it("handles different message types", () => {
      const { subscribeToWorkspaceBroadcast } = require("@/lib/workspace-broadcast")
      const handler = jest.fn()

      subscribeToWorkspaceBroadcast(handler)

      const listener = addEventListenerFn.mock.calls[0][1] as Function
      const clearedMessage = { type: "workspace-cleared" as const }

      listener({ data: clearedMessage })

      expect(handler).toHaveBeenCalledWith(clearedMessage)
    })
  })

  describe("getWorkspaceBroadcast", () => {
    it("creates and returns a cached BroadcastChannel instance", () => {
      const { getWorkspaceBroadcast } = require("@/lib/workspace-broadcast")

      const result1 = getWorkspaceBroadcast()
      const result2 = getWorkspaceBroadcast()

      expect(result1).toBeTruthy()
      expect(result1).toBe(result2)
    })
  })
})
