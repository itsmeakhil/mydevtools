/**
 * Tests for key-pinning-store.ts (H-2 — TOFU public-key pinning).
 */
import { useKeyPinningStore, verifyMemberKeys, trustMemberKeys } from "../key-pinning-store"

beforeEach(() => {
  useKeyPinningStore.getState().clear()
})

describe("key-pinning-store — check/trust", () => {
  it("reports 'new' for an unseen uid, 'match' after trust, 'changed' on a different key", () => {
    const s = useKeyPinningStore.getState()
    expect(s.check("u1", "pkA")).toBe("new")
    s.trust("u1", "pkA")
    expect(useKeyPinningStore.getState().check("u1", "pkA")).toBe("match")
    expect(useKeyPinningStore.getState().check("u1", "pkB")).toBe("changed")
  })
})

describe("verifyMemberKeys", () => {
  it("auto-pins first-seen keys (TOFU) and returns no changes", () => {
    const members = [
      { uid: "a", email: "a@x", publicKey: "pkA" },
      { uid: "b", email: "b@x", publicKey: "pkB" },
    ]
    expect(verifyMemberKeys(members)).toEqual([])
    // Second pass with identical keys → still no change.
    expect(verifyMemberKeys(members)).toEqual([])
  })

  it("returns members whose key changed and does NOT auto-trust them", () => {
    verifyMemberKeys([{ uid: "a", email: "a@x", publicKey: "pkA" }])
    const changed = verifyMemberKeys([{ uid: "a", email: "a@x", publicKey: "pkEVIL" }])
    expect(changed.map((m) => m.uid)).toEqual(["a"])
    // Still pinned to the original — not silently updated.
    expect(useKeyPinningStore.getState().check("a", "pkA")).toBe("match")
    expect(useKeyPinningStore.getState().check("a", "pkEVIL")).toBe("changed")
  })

  it("ignores members without a published public key", () => {
    expect(verifyMemberKeys([{ uid: "a", email: null, publicKey: null }])).toEqual([])
    expect(useKeyPinningStore.getState().pins["a"]).toBeUndefined()
  })

  it("trustMemberKeys re-pins a changed key after explicit confirmation", () => {
    verifyMemberKeys([{ uid: "a", email: "a@x", publicKey: "pkA" }])
    const changed = [{ uid: "a", email: "a@x", publicKey: "pkNEW" }]
    expect(verifyMemberKeys(changed)).toHaveLength(1) // detected
    trustMemberKeys(changed) // human confirmed
    expect(useKeyPinningStore.getState().check("a", "pkNEW")).toBe("match")
    expect(verifyMemberKeys(changed)).toEqual([]) // no longer flagged
  })
})
