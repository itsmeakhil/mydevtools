'use client';

import React, { useEffect } from 'react';
import { ClientLayout } from '../../components/sidebar/client-layout';
import { RequireAuth } from '@/components/require-auth';
import { MasterPasswordGate } from '@/components/master-password-gate';
import { useMasterKeyStore } from '@/store/master-key-store';
import { loadMasterKey } from '@/lib/key-storage';
import { getMasterVaultOrNull } from '@/lib/global-vault-api';
import { verifyKey } from '@/lib/encryption';
import useAuth from '@/utils/useAuth';

// Silently restores the encryption key from IndexedDB on login so critical
// apps that are visited after a page refresh don't need to re-enter the password.
function VaultKeyRestorer() {
  const { user } = useAuth(false);
  const { isUnlocked, setKey, setVaultStatus } = useMasterKeyStore();

  useEffect(() => {
    if (!user || isUnlocked) return;

    async function tryRestoreKey() {
      try {
        const savedKey = await loadMasterKey();
        if (!savedKey) return;

        const vaultData = await getMasterVaultOrNull();
        if (!vaultData) {
          setVaultStatus('not-configured');
          return;
        }

        const valid = await verifyKey(savedKey, vaultData.verifier.encrypted, vaultData.verifier.iv);
        if (valid) {
          setKey(savedKey);
        }
      } catch {
        // Silent — modal will handle errors when user navigates to a critical app
      }
    }

    tryRestoreKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return null;
}

export function AppContent({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      {/* Modal renders when a critical app calls openVaultGate() */}
      <MasterPasswordGate />
      {/* Silent key restorer — no UI, no blocking */}
      <VaultKeyRestorer />
      <ClientLayout>{children}</ClientLayout>
    </RequireAuth>
  );
}
