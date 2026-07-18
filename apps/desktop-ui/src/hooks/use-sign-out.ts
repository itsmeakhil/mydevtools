'use client'

import { useRouter } from 'next/navigation'
import { signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from '@/database/firebase'
import { usePasswordStore } from '@/store/password-store'
import { useEnvironmentManagerStore } from '@/store/environment-manager-store'
import { useMasterKeyStore } from '@/store/master-key-store'
import { useUserKeypairStore } from '@/store/user-keypair-store'
import { useWorkspaceStore } from '@/store/workspace-store'
import { clearMasterKey } from '@/lib/key-storage'
import { logoutBackendSession } from '@/lib/backend-auth'

/**
 * Full sign-out: wipes every in-memory secret + the encrypted vault key from
 * IndexedDB, ends the backend session, signs out of Firebase, and routes to
 * /login. Single source of truth used by the top-bar profile menu.
 */
export function useSignOut(): () => Promise<void> {
  const router = useRouter()
  const { clearPasswords } = usePasswordStore()
  const { clearSets } = useEnvironmentManagerStore()
  const { clearKey: clearMasterKeyStore } = useMasterKeyStore()
  const { clear: clearUserKeypair } = useUserKeypairStore()
  const clearWorkspaceStore = useWorkspaceStore((s) => s.clear)

  return async function signOut() {
    try {
      clearPasswords()      // decrypted passwords in memory
      clearSets()           // decrypted environment sets in memory
      clearMasterKeyStore() // in-memory master key
      clearUserKeypair()    // workspace keypair in memory
      clearWorkspaceStore() // workspace selection

      // Clear password-manager vault key from IndexedDB
      if (typeof window !== 'undefined' && window.indexedDB) {
        await new Promise<void>((resolve) => {
          const req = window.indexedDB.open('PasswordManagerDB', 1)
          req.onsuccess = (e: Event) => {
            const db = (e.target as IDBOpenDBRequest).result
            if (db.objectStoreNames.contains('keys')) {
              const tx = db.transaction('keys', 'readwrite')
              tx.objectStore('keys').delete('vaultKey')
              tx.oncomplete = () => resolve()
              tx.onerror = () => resolve()
            } else {
              resolve()
            }
          }
          req.onerror = () => resolve()
        })
      }

      await clearMasterKey()      // global master key in IndexedDB
      await logoutBackendSession()
      await firebaseSignOut(auth)
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }
}
