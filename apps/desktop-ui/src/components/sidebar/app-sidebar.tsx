'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from '@/components/ui/sidebar'
import { NavGroup } from './nav-group'
import { FeedbackDialog } from '@/components/feedback-dialog'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { LayoutDashboard, Sparkles } from 'lucide-react'
import { usePinnedToolsForActiveWorkspace } from '@/store/pinned-tools-store'
import { useActiveWorkspace } from '@/store/workspace-store'
import { IconPin } from '@tabler/icons-react'
import { buildPinnedNavItems } from './app-sidebar.helpers'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pinnedTools = usePinnedToolsForActiveWorkspace()
  const activeWs = useActiveWorkspace()
  const pinnedNavItems = buildPinnedNavItems(pinnedTools, activeWs)
  const pathname = usePathname();
  const isDashboardActive = pathname === '/dashboard';

  return (
    <Sidebar collapsible='icon' variant='floating' {...props}>
      {/* Brand lockup moved to the unified TopBar (components/shell/top-bar.tsx).
          The sidebar is now pure navigation. */}
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
                    className="absolute inset-0 -z-10 rounded-md bg-primary/10 ring-1 ring-inset ring-primary/20"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  >
                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                  </motion.div>
                )}
                <LayoutDashboard className={cn('z-10 size-4 transition-colors', isDashboardActive && 'text-primary')} />
                <span className={cn('z-10 font-medium', isDashboardActive && 'text-primary')}>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {pinnedNavItems.length > 0 ? (
          <NavGroup
            title="Pinned"
            items={pinnedNavItems}
            icon={IconPin}
          />
        ) : (
          <div className="px-4 py-6 text-center group-data-[state=collapsed]:hidden">
            <Sparkles className="mx-auto mb-2 h-5 w-5 text-muted-foreground/60" />
            <p className="text-xs text-muted-foreground">
              No pinned tools yet.
            </p>
            <Link
              href="/dashboard"
              className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
            >
              Browse all tools →
            </Link>
          </div>
        )}
      </SidebarContent>
      <SidebarFooter className="hidden md:block border-t border-border/30 dark:border-white/5">
        <FeedbackDialog variant="sidebar" />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
