'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { FeedbackDialog } from '@/components/feedback-dialog'
import { OrgSwitcherDropdown } from '@/components/org-switcher-dropdown'
import { Logo } from '../logo'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { LayoutDashboard } from 'lucide-react'
import { sidebarData } from './data/sidebar-data'
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from '../../database/firebase'
import { useRouter } from 'next/navigation'
import { usePasswordStore } from '@/store/password-store'
import { useEnvironmentManagerStore } from '@/store/environment-manager-store'
import { useMasterKeyStore } from '@/store/master-key-store'
import { useUserKeypairStore } from '@/store/user-keypair-store'
import { useWorkspaceDekStore } from '@/store/workspace-dek-store'
import { clearMasterKey } from '@/lib/key-storage'
import { logoutBackendSession } from '@/lib/backend-auth'
import { usePinnedToolsForActiveWorkspace } from '@/store/pinned-tools-store'
import { useWorkspaceStore, useActiveWorkspace } from '@/store/workspace-store'
import { IconPin } from '@tabler/icons-react'
import type { NavLink, NavCollapsible } from './types'
import { buildPinnedNavItems } from './app-sidebar.helpers'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { clearPasswords } = usePasswordStore()
  const { clearSets } = useEnvironmentManagerStore()
  const { clearKey: clearMasterKeyStore } = useMasterKeyStore()
  const { clear: clearUserKeypair } = useUserKeypairStore()
  const { clear: clearWorkspaceDeks } = useWorkspaceDekStore()
  const pinnedTools = usePinnedToolsForActiveWorkspace()
  const clearWorkspaceStore = useWorkspaceStore((s) => s.clear)
  const activeWs = useActiveWorkspace()
  const pinnedNavItems = buildPinnedNavItems(pinnedTools, activeWs)
  const [user, setUser] = useState({
    name: '',
    email: '',
    avatar: ''
  })

  const router = useRouter();
  const pathname = usePathname();
  const isDashboardActive = pathname === '/dashboard';

  // ...

  const handleSignOut = async () => {
    try {
      clearPasswords()       // clear decrypted passwords from memory
      clearSets()            // clear decrypted environment sets from memory
      clearMasterKeyStore()  // clear global master key in-memory state
      clearUserKeypair()     // clear workspace keypair from memory
      clearWorkspaceDeks()   // clear workspace DEKs from memory
      clearWorkspaceStore()  // clear workspace selection on sign-out

      // Clear password-manager vault key from IndexedDB
      if (typeof window !== 'undefined' && window.indexedDB) {
        await new Promise<void>((resolve) => {
          const req = window.indexedDB.open("PasswordManagerDB", 1)
          req.onsuccess = (e: any) => {
            const db = e.target.result
            if (db.objectStoreNames.contains("keys")) {
              const tx = db.transaction("keys", "readwrite")
              tx.objectStore("keys").delete("vaultKey")
              tx.oncomplete = () => resolve()
              tx.onerror = () => resolve()
            } else {
              resolve()
            }
          }
          req.onerror = () => resolve()
        })
      }

      // Clear global master key from IndexedDB
      await clearMasterKey()

      await logoutBackendSession()
      await firebaseSignOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser({
          name: user.displayName || '',
          email: user.email || '',
          avatar: user.photoURL || ''
        })
      }
    })

    return () => unsubscribe()
  }, [])

  return (
    <Sidebar collapsible='icon' variant='floating' {...props}>
      <SidebarHeader className="border-b border-border/30 dark:border-white/5 pb-3 hidden md:flex">
        <div
          className="flex items-center space-x-3 px-3 py-3 transition-all duration-300 hover:cursor-pointer hover:bg-primary/5 rounded-xl bg-transparent border border-transparent hover:border-primary/10 group-data-[state=collapsed]:bg-transparent group-data-[state=collapsed]:border-none group-data-[state=collapsed]:p-0 group-data-[state=collapsed]:justify-center overflow-hidden group/logo"
          onClick={() => router.push('/dashboard')}
        >
          <div className="flex items-center justify-center transition-transform duration-300 group-hover/logo:scale-105">
            <Logo size={36} showText={false} />
          </div>
          <div className="flex flex-col justify-center transition-all duration-300 origin-left group-data-[state=collapsed]:opacity-0 group-data-[state=collapsed]:w-0 group-data-[state=collapsed]:translate-x-[-10px]">
            <div className="flex items-center gap-1.5">
              <div className="relative h-6 w-28 -ml-1 whitespace-nowrap shrink-0">
                <Image
                  src="/logo-text-light.png"
                  alt="MyDevTools"
                  fill
                  className="dark:hidden object-contain object-left"
                />
                <Image
                  src="/logo-text-dark.png"
                  alt="MyDevTools"
                  fill
                  className="hidden dark:block object-contain object-left"
                />
              </div>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary ring-1 ring-primary/20 whitespace-nowrap">
                Beta
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground/80 font-medium tracking-wider uppercase pl-0.5 whitespace-nowrap">Developer&apos;s Toolkit</p>
          </div>
        </div>
        <div className="px-2 pt-1 group-data-[state=collapsed]:hidden">
          <OrgSwitcherDropdown />
        </div>
      </SidebarHeader>
      <SidebarContent className="mt-2 md:mt-0">
        <SidebarMenu className="px-2 mb-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isDashboardActive}
              tooltip="Dashboard"
              className={cn(
                'transition-all duration-200',
                isDashboardActive && 'bg-transparent hover:bg-transparent dark:bg-transparent',
              )}
            >
              <Link href="/dashboard" className="relative flex items-center">
                {isDashboardActive && (
                  <motion.div
                    layoutId="sidebar-active-pill"
                    className="absolute inset-0 -z-10 rounded-md bg-gradient-to-r from-primary/15 to-primary/[0.03] ring-1 ring-inset ring-primary/15 dark:from-primary/25 dark:to-primary/5"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  >
                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-primary to-violet-500" />
                  </motion.div>
                )}
                <LayoutDashboard className={cn('z-10 size-4 transition-colors', isDashboardActive && 'text-primary')} />
                <span className={cn('z-10 font-medium', isDashboardActive && 'text-primary')}>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {pinnedNavItems.length > 0 && (
          <NavGroup
            title="Pinned"
            items={pinnedNavItems}
            icon={IconPin}
            ignoreToolVisibility
          />
        )}
        {sidebarData.navGroups.map((group) => {
          const filteredItems = group.items
            .map((item) => {
              if (!('items' in item)) {
                return pinnedTools.includes(String(item.url)) ? null : item
              }
              const filteredSubs = (item as NavCollapsible).items.filter(
                (sub) => !pinnedTools.includes(String(sub.url))
              )
              return filteredSubs.length === 0 ? null : { ...item, items: filteredSubs }
            })
            .filter(Boolean) as typeof group.items
          if (filteredItems.length === 0) return null
          return <NavGroup key={group.title} {...group} items={filteredItems} />
        })}
      </SidebarContent>
      <SidebarFooter className="hidden md:block border-t border-border/30 dark:border-white/5">
        <FeedbackDialog variant="sidebar" />
        <NavUser user={user} onSignout={handleSignOut} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
