import { calcStrength, isCommonPassword } from "../password-strength"

describe("calcStrength.acceptable (new-vault setup floor)", () => {
    it("rejects a short/weak password", () => {
        expect(calcStrength("aaaaaaa1").acceptable).toBe(false)
    })

    it("rejects a too-short password even if otherwise strong", () => {
        expect(calcStrength("Ab1!xy").acceptable).toBe(false) // < 12 chars
    })

    it("rejects a common password", () => {
        expect(calcStrength("password1234").acceptable).toBe(false)
        expect(isCommonPassword("Password123")).toBe(true)
    })

    it("accepts a 14-char mixed, non-common password", () => {
        expect(calcStrength("Tr0ub4dour&3xtra").acceptable).toBe(true)
    })

    it("still exposes the 0-5 score for the meter", () => {
        expect(calcStrength("Tr0ub4dour&3xtra").score).toBe(5)
        expect(calcStrength("").score).toBe(0)
    })
})
