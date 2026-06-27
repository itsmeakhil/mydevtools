import { signOut as firebaseSignOut } from "firebase/auth"
import { auth } from "@/database/firebase"
import { logoutBackendSession } from "@/lib/backend-auth"
import { usePasswordStore } from "@/store/password-store"
import { useMasterKeyStore } from "@/store/master-key-store"
import { useUserKeypairStore } from "@/store/user-keypair-store"
import { clearKey as clearVaultKey, clearMasterKey } from "@/lib/key-storage"

export const FORCE_LOGOUT_EVENT = "mydevtools:force-logout"

export type LogoutReason =
  | "manual"
  | "session-expired"
  | "session-sync-failed"
  | "unauthorized"

export async function clearSensitiveClientState(): Promise<void> {
  usePasswordStore.getState().clearPasswords()
  useMasterKeyStore.getState().clearKey()
  useUserKeypairStore.getState().clear()

  // Wipe localStorage so no user data is left behind on a forced/expired logout
  // (e.g. a refresh 401). Best-effort — never block logout on a storage failure.
  if (typeof window !== "undefined") {
    try {
      window.localStorage.clear()
    } catch {
      // ignore (private mode / storage disabled)
    }
  }

  // Clear persisted CryptoKeys (best-effort)
  await Promise.allSettled([clearVaultKey(), clearMasterKey()])
}

export async function logoutUser(reason: LogoutReason = "manual"): Promise<void> {
  // Best-effort cleanup; don't block on individual failures.
  await Promise.allSettled([
    clearSensitiveClientState(),
    logoutBackendSession(),
    firebaseSignOut(auth),
  ])

  // Optional: broadcast (useful if multiple tabs are open)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(FORCE_LOGOUT_EVENT, { detail: { reason } }))
  }
}

export function requestLogout(reason: LogoutReason): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(FORCE_LOGOUT_EVENT, { detail: { reason } }))
}

