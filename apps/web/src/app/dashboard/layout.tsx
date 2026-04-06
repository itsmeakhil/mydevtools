'use client'
import React from 'react';
import { ClientLayout } from '../../components/sidebar/client-layout';
import { RequireAuth } from '@/components/require-auth';
import { MasterPasswordGate } from '@/components/master-password-gate';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      {/* Gate sits outside ClientLayout so the overlay covers the full screen. */}
      <MasterPasswordGate>
        <ClientLayout>{children}</ClientLayout>
      </MasterPasswordGate>
    </RequireAuth>
  );
}