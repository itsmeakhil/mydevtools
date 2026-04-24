'use client'
import React from 'react';
import { ClientLayout } from '../../components/sidebar/client-layout';

export default function ProfileClientLayout({ children }: { children: React.ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>;
}
