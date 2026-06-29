"use client"
import { useEffect, useState } from "react"
import { getCipherKey } from "@/lib/cipher-key"
import { useActiveWorkspace, useWorkspaceStore } from "@/store/workspace-store"
import { useMasterKeyStore } from "@/store/master-key-store"
import { useUserKeypairStore } from "@/store/user-keypair-store"

/**
 * Returns the currently active cipher key.
 *
 * Personal workspace  → master key (AES-GCM from PBKDF2, existing flow).
 * Shared workspace    → workspace DEK fetched/unwrapped from workspace-dek-store.
 * No workspace / key  → null; callers should show a loading skeleton.
 *
 * Shared module — consumed by password-manager, environment-manager, and
 * api-key-vault. Do NOT duplicate this logic in component trees.
 */
export function useCipherKey(): CryptoKey | null {
  const [key, setKey] = useState<CryptoKey | null>(null)
  const activeWs = useActiveWorkspace()
  const masterKey = useMasterKeyStore((s) => s.encryptionKey)

  useEffect(() => {
    let cancelled = false
    getCipherKey(activeWs, masterKey).then((k) => {
      if (!cancelled) setKey(k)
    })
    return () => {
      cancelled = true
    }
  }, [activeWs, masterKey])

  return key
}

/**
 * Caller-facing diagnostic for why a cipher key isn't available right now. Used
 * by encrypted-tool mutation handlers so "Vault is locked" only shows when the
 * personal master vault is actually locked — otherwise we tell the user the
 * real reason (no workspace DEK granted yet, keypair missing, etc.).
 */
export function cipherKeyErrorMessage(): string {
  const ws = useWorkspaceStore.getState().workspaces.find(
    (w) => w.id === useWorkspaceStore.getState().activeWorkspaceId,
  )
  const masterUnlocked = useMasterKeyStore.getState().isUnlocked
  if (!masterUnlocked) return "Vault is locked — unlock your master password to continue."
  if (!ws) return "No active workspace."
  if (ws.is_personal) return "Vault is locked — unlock your master password to continue."
  // Shared workspace from here on.
  const hasKeypair = !!useUserKeypairStore.getState().privateKey
  if (!hasKeypair) return "Your security keypair isn't loaded yet — try again in a moment."
  return "You don't have decryption access to this workspace yet. Ask an admin to grant access from Workspace settings → Members."
}
