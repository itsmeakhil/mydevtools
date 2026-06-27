"use client"
import { useEffect, useState } from "react"
import { getCipherKey } from "@/lib/cipher-key"
import { useActiveWorkspace } from "@/store/workspace-store"
import { useMasterKeyStore } from "@/store/master-key-store"

/**
 * Returns the currently active cipher key for the Password Manager.
 *
 * Personal workspace  → master key (AES-GCM from PBKDF2, existing flow).
 * Shared workspace    → workspace DEK fetched/unwrapped from workspace-dek-store.
 * No workspace / key  → null; callers should show a loading skeleton.
 *
 * ponytail: C-T6 DEK integration — apply useCipherKey to remaining call sites
 * (import-export-dialog, etc.) in a follow-up once C-T9 workspace encryption
 * toggle ships.
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
