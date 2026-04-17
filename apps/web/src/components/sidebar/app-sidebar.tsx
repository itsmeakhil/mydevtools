'use client'
import { useEffect, useState } from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { Logo } from '../logo'
import { sidebarData } from './data/sidebar-data'
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from '../../database/firebase'
import { useRouter } from 'next/navigation'
import { usePasswordStore } from '@/store/password-store'
import { useEnvironmentManagerStore } from '@/store/environment-manager-store'
import { useMasterKeyStore } from '@/store/master-key-store'
import { clearMasterKey } from '@/lib/key-storage'
import { logoutBackendSession } from '@/lib/backend-auth'
import { usePinnedToolsStore } from '@/store/pinned-tools-store'
import { IconPin } from '@tabler/icons-react'
import type { NavLink, NavCollapsible } from './types'

function buildPinnedNavItems(pinnedTools: string[]): NavLink[] {
  if (pinnedTools.length === 0) return []
  const allLinks: NavLink[] = sidebarData.navGroups.flatMap((group) =>
    group.items.flatMap((item) => {
      if (!('items' in item)) return [item as NavLink]
      return (item as NavCollapsible).items.map((sub) => ({
        ...sub,
        icon: sub.icon ?? item.icon,
      } as NavLink))
    })
  )
  const urlSet = new Set(pinnedTools)
  return allLinks.filter((link) => urlSet.has(String(link.url)))
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { clearPasswords } = usePasswordStore()
  const { clearSets } = useEnvironmentManagerStore()
  const { clearKey: clearMasterKeyStore } = useMasterKeyStore()
  const pinnedTools = usePinnedToolsStore((s) => s.pinnedTools)
  const pinnedNavItems = buildPinnedNavItems(pinnedTools)
  const [user, setUser] = useState({
    name: '',
    email: '',
    avatar: ''
  })

  const router = useRouter();

  // ...

  const handleSignOut = async () => {
    try {
      clearPasswords()     // clear decrypted passwords from memory
      clearSets()          // clear decrypted environment sets from memory
      clearMasterKeyStore() // clear global master key in-memory state

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
      <SidebarHeader className="border-b border-border/30 pb-3 hidden md:flex">
        <div
          className="flex items-center space-x-3 px-3 py-3 transition-all duration-300 hover:cursor-pointer hover:bg-primary/5 rounded-xl bg-transparent border border-transparent hover:border-primary/10 group-data-[state=collapsed]:bg-transparent group-data-[state=collapsed]:border-none group-data-[state=collapsed]:p-0 group-data-[state=collapsed]:justify-center overflow-hidden group/logo"
          onClick={() => router.push('/dashboard')}
        >
          <div className="flex items-center justify-center transition-transform duration-300 group-hover/logo:scale-105">
            <Logo size={36} showText={false} />
          </div>
          <div className="flex flex-col justify-center transition-all duration-300 origin-left group-data-[state=collapsed]:opacity-0 group-data-[state=collapsed]:w-0 group-data-[state=collapsed]:translate-x-[-10px]">
            <div className="relative h-6 w-28 -ml-1 whitespace-nowrap">
              {/* Light Mode Text (Dark Color) */}
              <img
                src="/logo-text-light.png"
                alt="MyDevTools"
                className="dark:hidden object-contain h-full w-full object-left"
              />
              {/* Dark Mode Text (Light Color) */}
              <img
                src="/logo-text-dark.png"
                alt="MyDevTools"
                className="hidden dark:block object-contain h-full w-full object-left"
              />
            </div>
            <p className="text-[10px] text-muted-foreground/80 font-medium tracking-wider uppercase pl-0.5 whitespace-nowrap">Developer&apos;s Toolkit</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="mt-2 md:mt-0">
        {pinnedNavItems.length > 0 && (
          <NavGroup title="Pinned" items={pinnedNavItems} icon={IconPin} />
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
      <SidebarFooter className="hidden md:block">
        <NavUser user={user} onSignout={handleSignOut} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
