'use client'
import React from 'react';
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { NavBar } from '@/components/nav-bar';
import { MobileNav } from '@/components/mobile-nav';
import useAuth from '@/utils/useAuth';
import { EnsureBackendSession } from '@/components/ensure-backend-session';
import { GlobalCommandPalette } from '@/components/global-command-palette';

function Layout({ children }: { children: React.ReactNode }) {
  const { state } = useSidebar();
  const { user } = useAuth(false);

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
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
              <EnsureBackendSession user={user}>
                {children}
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

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Layout>{children}</Layout>
    </SidebarProvider>
  );
}