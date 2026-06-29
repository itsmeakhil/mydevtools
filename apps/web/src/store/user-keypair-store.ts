import { create } from "zustand"

type State = {
  publicKey: string | null
  privateKey: CryptoKey | null
  hydrated: boolean
}

type Actions = {
  setKeypair: (publicKey: string, privateKey: CryptoKey) => void
  clear: () => void
}

export const useUserKeypairStore = create<State & Actions>((set) => ({
  publicKey: null,
  privateKey: null,
  hydrated: false,
  setKeypair: (publicKey, privateKey) => set({ publicKey, privateKey, hydrated: true }),
  clear: () => set({ publicKey: null, privateKey: null, hydrated: false }),
}))

export const useUserPublicKey = (): string | null =>
  useUserKeypairStore((s) => s.publicKey)
export const useUserPrivateKey = (): CryptoKey | null =>
  useUserKeypairStore((s) => s.privateKey)
