/**
 * key-pinning-store.ts
 *
 * Trust-on-first-use (TOFU) pinning for workspace member public keys.
 *
 * The backend serves member public keys (member-publickeys / pending-wraps).
 * That directory is NOT authenticated: a compromised server could substitute an
 * attacker-controlled public key for a member, causing the wrapping admin to
 * wrap the workspace DEK straight to the attacker — silently defeating E2E.
 *
 * We defend like SSH known_hosts: the first time we see a member's public key we
 * pin it locally; if it ever changes we refuse to wrap until a human explicitly
 * re-trusts the new key. Legit changes happen (a user resets their master
 * password and regenerates their keypair), so this warns rather than hard-fails
 * — but the wrap does not proceed on an unverified change without confirmation.
 *
 * Pins live in localStorage (client-side): the server is the untrusted party, so
 * storing pins server-side would defeat the purpose.
 */

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type PinStatus = "new" | "match" | "changed"

type Pin = { publicKey: string; firstSeen: number }

type State = { pins: Record<string, Pin> } // key = user uid

type Actions = {
  /** Compare a fetched public key against the pin without mutating state. */
  check: (uid: string, publicKey: string) => PinStatus
  /** Pin (or re-pin) a member's public key as trusted. */
  trust: (uid: string, publicKey: string) => void
  clear: () => void
}

export const useKeyPinningStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      pins: {},

      check: (uid, publicKey) => {
        const existing = get().pins[uid]
        if (!existing) return "new"
        return existing.publicKey === publicKey ? "match" : "changed"
      },

      trust: (uid, publicKey) =>
        set((state) => ({
          pins: {
            ...state.pins,
            // Preserve firstSeen if we already had a pin (this is a re-trust).
            [uid]: { publicKey, firstSeen: state.pins[uid]?.firstSeen ?? Date.now() },
          },
        })),

      clear: () => set({ pins: {} }),
    }),
    { name: "workspace-key-pins", version: 1 },
  ),
)

export type MemberKey = { uid: string; email: string | null; publicKey: string | null }

/**
 * Verify a batch of member public keys against local pins.
 *
 * Side effect: auto-pins members whose key is unseen (TOFU). Members whose key
 * CHANGED from a prior pin are returned so the caller can prompt for explicit
 * re-trust — they are NOT auto-trusted. Members with no published key are ignored.
 *
 * @returns the members whose public key changed since last pinned.
 */
export function verifyMemberKeys(members: MemberKey[]): MemberKey[] {
  const store = useKeyPinningStore.getState()
  const changed: MemberKey[] = []
  for (const m of members) {
    if (!m.publicKey) continue
    const status = store.check(m.uid, m.publicKey)
    if (status === "new") {
      store.trust(m.uid, m.publicKey) // TOFU: pin first sighting
    } else if (status === "changed") {
      changed.push(m)
    }
  }
  return changed
}

/** Explicitly re-trust members whose key changed (after a human confirms). */
export function trustMemberKeys(members: MemberKey[]): void {
  const store = useKeyPinningStore.getState()
  for (const m of members) {
    if (m.publicKey) store.trust(m.uid, m.publicKey)
  }
}
