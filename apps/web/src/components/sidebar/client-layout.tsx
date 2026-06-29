'use client'
import React, { useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { NavBar } from '@/components/nav-bar';
import { MobileNav } from '@/components/mobile-nav';
import { GlobalCommandPalette } from '@/components/global-command-palette';
import { TabBar } from '@/components/tab-bar/tab-bar';
import { useTabStore } from '@/store/tab-store';
import { isTabRoute } from '@/lib/route-config';
import { getTabComponent, isRegisteredTab } from '@/lib/tab-registry';
import { MigrationBanner } from '@/components/migration-banner';

// Renders all open tool tabs simultaneously. The active tab is visible;
// inactive tabs use display:none to stay mounted (preserving their state).
function TabContent() {
  const { tabs, activeTabPath } = useTabStore();

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {tabs.map((tab) => {
        const Component = getTabComponent(tab.path);
        if (!Component) return null;
        const isActive = tab.path === activeTabPath;
        return (
          <div
            key={tab.path}
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto"
            style={{ display: isActive ? 'flex' : 'none' }}
          >
            <Component />
          </div>
        );
      })}
    </div>
  );
}

// Syncs the current URL pathname to the tab store.
function TabSyncer() {
  const pathname = usePathname();
  const { openTab, setActiveTab } = useTabStore();

  useEffect(() => {
    if (isTabRoute(pathname) && isRegisteredTab(pathname)) {
      openTab(pathname);
      setActiveTab(pathname);
    }
  }, [pathname, openTab, setActiveTab]);

  return null;
}

function Layout({ children }: { children: React.ReactNode }) {
  const { state } = useSidebar();
  const pathname = usePathname();
  const { tabs } = useTabStore();

  // Open command palette for new tab via "+" button
  const openCommandPalette = useCallback(() => {
    document.dispatchEvent(new CustomEvent('open-command-palette'));
  }, []);

  const inTabMode = isTabRoute(pathname) && tabs.length > 0;

  return (
    <div
      style={{ "--sidebar-width": "16rem", "--sidebar-width-icon": "3rem" } as React.CSSProperties}
      className="group/sidebar-wrapper flex h-screen w-full has-[[data-variant=inset]]:bg-sidebar relative overflow-hidden"
    >
      <TabSyncer />
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
            {inTabMode ? (
              <TabBar onNewTab={openCommandPalette} />
            ) : (
              <NavBar />
            )}
            <MigrationBanner />
          </div>

          {inTabMode ? (
            <TabContent />
          ) : (
            <div className="z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
                {children}
              </div>
            </div>
          )}

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
