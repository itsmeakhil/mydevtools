'use client'
import React from 'react';
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { NavBar } from '@/components/nav-bar';
import { MobileNav } from '@/components/mobile-nav';

function Layout({ children }: { children: React.ReactNode }) {
  const { state } = useSidebar();

  return (
    <div className="flex h-screen font-mono w-full">
      {/* Sidebar */}
      <aside className={`transition-all duration-200 ease-in-out ${state === 'collapsed' ? 'w-[var(--sidebar-width-icon)]' : 'w-[var(--sidebar-width)]'
        } border-r p-4 hidden md:flex flex-col fixed top-0 bottom-0 left-0 z-30`}>
        <div className="flex-1">
          <AppSidebar />
        </div>
      </aside>

      {/* Mobile Sidebar (Sheet) */}
      <div className="md:hidden">
        <AppSidebar />
      </div>

      {/* Main content area */}
      <div className={`flex-1 ${state === 'collapsed' ? 'md:ml-[var(--sidebar-width-icon)]' : 'md:ml-[var(--sidebar-width)]'
        } ml-0 pb-16 md:pb-0`}>
        {/* Fixed navbar */}
        <header className="sticky top-0 z-20 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 hidden md:block">
          <NavBar />
        </header>

        {/* Scrollable content */}
        <main className="font-mono">
          <div className="mx-auto w-full">
            {children}
          </div>
        </main>
        <MobileNav />
      </div>
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