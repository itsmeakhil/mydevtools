'use client'
import React from 'react';
import { ClientLayout } from '../../components/sidebar/client-layout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>;
}