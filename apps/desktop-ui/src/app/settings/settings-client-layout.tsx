'use client'
import React from 'react';
import { ClientLayout } from '../../components/sidebar/client-layout';

export default function SettingsClientLayout({ children }: { children: React.ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>;
}
