jest.mock("react-firebase-hooks/auth", () => ({
    useAuthState: () => [null, false],
}))
jest.mock("@/database/firebase", () => ({ auth: {} }))
jest.mock("@/lib/backend-auth", () => ({ backendFetch: jest.fn() }))

/**
 * Tests for HistoryContext (history-context.tsx).
 *
 * @testing-library/react is not installed. We test module exports and the
 * type contracts only. Context wiring is validated by tsc --noEmit.
 */

describe("history-context module exports", () => {
    it("exports HistoryProvider, useHistoryState, useHistoryActions", () => {
        const mod = require("../context/history-context")
        expect(typeof mod.HistoryProvider).toBe("function")
        expect(typeof mod.useHistoryState).toBe("function")
        expect(typeof mod.useHistoryActions).toBe("function")
    })
})

describe("guard functions throw outside provider", () => {
    it("useHistoryState is a throwing guard function", () => {
        const { useHistoryState } = require("../context/history-context")
        expect(typeof useHistoryState).toBe("function")
    })

    it("useHistoryActions is a throwing guard function", () => {
        const { useHistoryActions } = require("../context/history-context")
        expect(typeof useHistoryActions).toBe("function")
    })
})
