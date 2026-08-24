/**
 * The dashboard greeting takes its name from the local profile (user
 * preferences), never from `useAuth` — that identity is a fixed object whose
 * displayName is always null by design (utils/useAuth.tsx:29).
 */
import { greetingFirstName } from "../types"

describe("greetingFirstName", () => {
  it("uses the first word of a full name", () => {
    expect(greetingFirstName("Akhil Edathadan")).toBe("Akhil")
  })

  it("passes a single-word name through", () => {
    expect(greetingFirstName("Akhil")).toBe("Akhil")
  })

  it("ignores surrounding and repeated whitespace", () => {
    expect(greetingFirstName("  Akhil  Edathadan ")).toBe("Akhil")
  })

  it("returns null for an unset name so the greeting falls back", () => {
    expect(greetingFirstName("")).toBeNull()
    expect(greetingFirstName("   ")).toBeNull()
    expect(greetingFirstName(undefined)).toBeNull()
    expect(greetingFirstName(null)).toBeNull()
  })
})
