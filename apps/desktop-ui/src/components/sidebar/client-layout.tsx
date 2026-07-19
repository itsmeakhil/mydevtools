'use client'
import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { NavBar } from '@/components/nav-bar';
import { MobileNav } from '@/components/mobile-nav';
import { TopBar } from '@/components/shell/top-bar';
import { useTabStore } from '@/store/tab-store';
import { isTabRoute } from '@/lib/route-config';
import { getTabComponent, isRegisteredTab } from '@/lib/tab-registry';
import { MigrationBanner } from '@/components/migration-banner';
import { isDesktop } from '@/lib/desktop/is-desktop';
import { MobileDesktopHint } from '@/components/mobile-desktop-hint';
import { useWorkspaceStore } from '@/store/workspace-store';
import { initWorkspaceScopeReset } from '@/lib/workspace-scope-reset';

// Reset workspace-scoped stores whenever the active workspace changes
// (module-level, mirrors workspace-store's own subscribeOnce pattern).
initWorkspaceScopeReset();

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
  // Keying tool content by workspace remounts every mounted tab (and page) on
  // switch, so each tool refetches under the new scope instead of showing the
  // previous workspace's data.
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  const inTabMode = isTabRoute(pathname) && tabs.length > 0;

  return (
    <div
      style={{ "--sidebar-width": "16rem", "--sidebar-width-icon": "3rem" } as React.CSSProperties}
      className="group/sidebar-wrapper flex flex-col h-screen w-full has-[[data-variant=inset]]:bg-sidebar relative overflow-hidden"
    >
      <TabSyncer />
      <TopBar />
      <div className="flex min-h-0 w-full flex-1">
        <main
          className={`flex-1 font-mono flex flex-col transition-all duration-300 ease-in-out pb-16 md:pb-0 min-w-0 overflow-hidden ${state === 'collapsed' ? 'pl-0' : ''
            }`}
        >
          <div className="shrink-0 z-20 bg-background">
            {!inTabMode && <NavBar />}
            {/* Web-account migration poll — desktop local API has no /auth/me */}
            {!isDesktop() && <MigrationBanner />}
            <MobileDesktopHint />
          </div>

          {inTabMode ? (
            <TabContent key={activeWorkspaceId ?? 'none'} />
          ) : (
            <div
              key={activeWorkspaceId ?? 'none'}
              className="z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
            >
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
                {children}
              </div>
            </div>
          )}

          <MobileNav />
        </main>
      </div>
      {/* Command palette is mounted once globally in ClientShell (root layout) —
          a second mount here caused stacked overlays needing two clicks to dismiss. */}
    </div>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  // Hydrate the workspace store on app launch. Nothing else does this on
  // desktop (EnsureBackendSession is unmounted here), and without it the
  // local personal workspace never resolves — encrypted tools (api-key-vault,
  // password-manager, environment-manager) fail with "No active workspace".
  useEffect(() => {
    const { hydrated, loadFromBackend } = useWorkspaceStore.getState();
    if (!hydrated) {
      loadFromBackend().catch((e) => console.warn('Workspace hydration failed:', e));
    }
  }, []);

  return (
    <SidebarProvider>
      <Layout>{children}</Layout>
    </SidebarProvider>
  );
}
