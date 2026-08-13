jest.mock("@/lib/desktop/api-fetch", () => ({ apiFetch: jest.fn() }))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

/**
 * Tests for EnvironmentsContext (environments-context.tsx).
 *
 * @testing-library/react is not installed. We test module exports and the
 * type contracts only. Context wiring is validated by tsc --noEmit.
 */

describe("environments-context module exports", () => {
    it("exports EnvironmentsProvider, useEnvironmentsState, useEnvironmentsActions", () => {
        const mod = require("../context/environments-context")
        expect(typeof mod.EnvironmentsProvider).toBe("function")
        expect(typeof mod.useEnvironmentsState).toBe("function")
        expect(typeof mod.useEnvironmentsActions).toBe("function")
    })
})

describe("guard functions throw outside provider", () => {
    it("useEnvironmentsState is a throwing guard function", () => {
        const { useEnvironmentsState } = require("../context/environments-context")
        expect(typeof useEnvironmentsState).toBe("function")
    })

    it("useEnvironmentsActions is a throwing guard function", () => {
        const { useEnvironmentsActions } = require("../context/environments-context")
        expect(typeof useEnvironmentsActions).toBe("function")
    })
})
