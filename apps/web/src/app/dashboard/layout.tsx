'use client'
import React from 'react';
import { ClientLayout } from '../../components/sidebar/client-layout';
import { RequireAuth } from '@/components/require-auth';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <ClientLayout>{children}</ClientLayout>
    </RequireAuth>
  );
}