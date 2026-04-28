'use client';

import React from 'react';
import { useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "../../components/sidebar/app-sidebar";
import { NavBar } from '@/components/nav-bar';
import { MobileNav } from '@/components/mobile-nav';
import useAuth from '@/utils/useAuth';
import { EnsureBackendSession } from '@/components/ensure-backend-session';
import { MasterPasswordGate } from '@/components/master-password-gate';
import { Loader2 } from 'lucide-react';
import { GlobalCommandPalette } from '@/components/global-command-palette';

export function AppContent({ children }: { children: React.ReactNode }) {
  const { state } = useSidebar();
  const { user, loading } = useAuth(true);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div
      style={{ "--sidebar-width": "16rem", "--sidebar-width-icon": "3rem" } as React.CSSProperties}
      className="group/sidebar-wrapper flex h-screen w-full has-[[data-variant=inset]]:bg-sidebar relative overflow-hidden"
    >
      <div className="flex h-full w-full">
        <aside
          className={`${state === 'collapsed' ? 'w-[var(--sidebar-width-icon)]' : 'w-[var(--sidebar-width)]'} ${state === 'collapsed' ? '' : 'border-r'
            } p-4 hidden md:flex flex-col z-30 relative shrink-0`}
        >
          <div className="flex-1 overflow-y-auto">
            <AppSidebar />
          </div>
        </aside>

        <main
          className={`flex-1 font-mono flex flex-col transition-all duration-300 ease-in-out pb-16 md:pb-0 min-w-0 overflow-hidden ${state === 'collapsed' ? 'pl-0' : ''
            }`}
        >
          <div className="shrink-0 z-20 bg-background">
            <NavBar />
          </div>
          <div className="z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <EnsureBackendSession user={user}>
                <MasterPasswordGate>
                  {children}
                </MasterPasswordGate>
              </EnsureBackendSession>
            </div>
          </div>
          <MobileNav />
        </main>
      </div>
      <GlobalCommandPalette />
    </div>
  );
}