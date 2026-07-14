// apps/web/src/store/__tests__/user-keypair-store.test.ts
//
// Unit tests for useUserKeypairStore.
// Environment: jest-environment-node — no DOM.

import { useUserKeypairStore } from "../user-keypair-store"

// Minimal CryptoKey stand-in (no Web Crypto calls needed here)
function makeFakeCryptoKey(): CryptoKey {
  return { type: "private", extractable: false, algorithm: {}, usages: [] } as unknown as CryptoKey
}

beforeEach(() => {
  useUserKeypairStore.getState().clear()
})

describe("useUserKeypairStore — initial state", () => {
  it("starts with publicKey=null, privateKey=null, hydrated=false", () => {
    const state = useUserKeypairStore.getState()
    expect(state.publicKey).toBeNull()
    expect(state.privateKey).toBeNull()
    expect(state.hydrated).toBe(false)
  })
})

describe("useUserKeypairStore — setKeypair", () => {
  it("updates publicKey and privateKey, sets hydrated=true", () => {
    const fakePublicKey = "spki-base64-string"
    const fakePrivateKey = makeFakeCryptoKey()

    useUserKeypairStore.getState().setKeypair(fakePublicKey, fakePrivateKey)

    const state = useUserKeypairStore.getState()
    expect(state.publicKey).toBe(fakePublicKey)
    expect(state.privateKey).toBe(fakePrivateKey)
    expect(state.hydrated).toBe(true)
  })
})

describe("useUserKeypairStore — clear", () => {
  it("resets all fields back to initial values", () => {
    const fakePrivateKey = makeFakeCryptoKey()
    useUserKeypairStore.getState().setKeypair("some-pub-key", fakePrivateKey)

    // Confirm it was set
    expect(useUserKeypairStore.getState().hydrated).toBe(true)

    useUserKeypairStore.getState().clear()

    const state = useUserKeypairStore.getState()
    expect(state.publicKey).toBeNull()
    expect(state.privateKey).toBeNull()
    expect(state.hydrated).toBe(false)
  })
})
