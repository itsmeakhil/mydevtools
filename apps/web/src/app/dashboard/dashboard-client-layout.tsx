'use client'
import React from 'react';
import { ClientLayout } from '../../components/sidebar/client-layout';
import { RequireAuth } from '@/components/require-auth';
import { MasterPasswordGate } from '@/components/master-password-gate';

export default function DashboardClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <MasterPasswordGate />
      <ClientLayout>{children}</ClientLayout>
    </RequireAuth>
  );
}
