'use client';

import React, { useEffect, useRef } from 'react';
import { ClientLayout } from '../../components/sidebar/client-layout';
import { MasterPasswordGate } from '@/components/master-password-gate';
import { useMasterKeyStore } from '@/store/master-key-store';
import { clearMasterKey } from '@/lib/key-storage';
import { getMasterVaultOrNull } from '@/lib/global-vault-api';
import { restoreVault } from '@/lib/restore-vault';
import { useIdleLock } from '@/lib/use-idle-lock';

// Single restoration path. Runs once per mount. Mutates the store with the
// final state — modal and pages read from store only.
function VaultKeyRestorer() {
  const { vaultStatus, setKey, setVaultStatus, setVault, setRestoreError } =
    useMasterKeyStore();
  const ranRef = useRef(false);

  useEffect(() => {
    if (vaultStatus !== 'restoring') {
      ranRef.current = false;
      return;
    }
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      const result = await restoreVault({
        getMasterVaultOrNull,
        clearMasterKey,
      });

      switch (result.status) {
        case 'not-configured':
          setVault(null);
          setVaultStatus('not-configured');
          return;
        case 'unlocked':
          setVault(result.vault);
          setKey(result.key);
          return;
        case 'locked':
          setVault(result.vault);
          setVaultStatus('locked');
          return;
        case 'error':
          setRestoreError(result.message);
          setVaultStatus('locked');
          return;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vaultStatus]);

  return null;
}

function IdleLock() {
  useIdleLock();
  return null;
}

export function AppContent({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MasterPasswordGate />
      <VaultKeyRestorer />
      <IdleLock />
      <ClientLayout>{children}</ClientLayout>
    </>
  );
}
