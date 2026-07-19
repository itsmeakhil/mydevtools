'use client'
import React from 'react';
import { ClientLayout } from '../../components/sidebar/client-layout';
import { RequireAuth } from '@/components/require-auth';
import { MasterPasswordGate } from '@/components/master-password-gate';
import { OnboardingGate } from '@/components/onboarding-gate';
import { PasskeyPromptGate } from '@/components/passkey-prompt-gate';
import { isDesktop } from '@/lib/desktop/is-desktop';

export default function DashboardClientLayout({ children }: { children: React.ReactNode }) {
  // Onboarding/passkey are web-account flows; the offline desktop app has no
  // per-session auth backend for them (local API 501s on /auth/*).
  const web = !isDesktop();
  return (
    <RequireAuth>
      {web && <OnboardingGate />}
      <MasterPasswordGate />
      {web && <PasskeyPromptGate />}
      <ClientLayout>{children}</ClientLayout>
    </RequireAuth>
  );
}
