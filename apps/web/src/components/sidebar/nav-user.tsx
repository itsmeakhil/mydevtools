'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ChevronsUpDown,
  LogOut,
  Moon,
  Sun,
  User as UserIcon,
  Settings,
  HelpCircle,
} from 'lucide-react'
import { useThemeAnimation } from '@space-man/react-theme-animation'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

interface NavUserProps {
  user: {
    name: string
    email: string
    avatar: string
  }
  onSignout: () => Promise<void>
}

const menuItemClass =
  'gap-3 rounded-lg px-2.5 h-9 text-sm cursor-pointer transition-colors [&_svg]:text-muted-foreground'

export function NavUser({ user, onSignout }: NavUserProps) {
  const { isMobile, state } = useSidebar()
  const { theme, toggleTheme, ref } = useThemeAnimation()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isLoggedIn = Boolean(user.name || user.email)
  const displayName = user.name?.trim() || user.email?.split('@')[0] || 'User'
  const initial = (
    user.name?.trim()?.[0] ||
    user.email?.[0] ||
    '?'
  ).toUpperCase()

  if (!isLoggedIn) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            className="text-muted-foreground hover:bg-sidebar-accent/80"
            asChild
          >
            <Link href="/login">
              <UserIcon className="h-8 w-8 shrink-0 opacity-80" />
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Guest</span>
                <span className="truncate text-xs text-muted-foreground">
                  Sign in to sync
                </span>
              </div>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            className="text-muted-foreground hover:bg-sidebar-accent/80"
            asChild
          >
            <Link href="/help">
              <HelpCircle className="h-8 w-8 shrink-0 opacity-80" />
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Help</span>
                <span className="truncate text-xs text-muted-foreground">
                  Docs &amp; security
                </span>
              </div>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  const contentSide = isMobile
    ? 'bottom'
    : state === 'collapsed'
      ? 'right'
      : 'top'
  const contentAlign = isMobile
    ? 'center'
    : state === 'collapsed'
      ? 'end'
      : 'start'

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className={cn(
                'border border-transparent transition-colors',
                'data-[state=open]:border-border/60 data-[state=open]:bg-sidebar-accent/90',
                'hover:border-border/40 hover:bg-sidebar-accent/50'
              )}
            >
              <Avatar className="h-9 w-9 shrink-0 rounded-xl ring-1 ring-border/40 shadow-sm">
                <AvatarImage src={user.avatar} alt={displayName} />
                <AvatarFallback className="rounded-xl bg-primary/10 text-sm font-semibold text-primary">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold tracking-tight">
                  {displayName}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground opacity-70" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side={contentSide}
            align={contentAlign}
            sideOffset={isMobile ? 8 : state === 'collapsed' ? 10 : 8}
            alignOffset={state === 'collapsed' && !isMobile ? -4 : 0}
            className={cn(
              'w-[min(17.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-border/60 p-0',
              'bg-popover/95 shadow-xl backdrop-blur-md',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
            )}
          >
            <div className="border-b border-border/50 bg-muted/25 px-3 py-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11 shrink-0 rounded-xl ring-2 ring-background shadow-md">
                  <AvatarImage src={user.avatar} alt={displayName} />
                  <AvatarFallback className="rounded-xl bg-primary/12 text-base font-semibold text-primary">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/90">
                    Account
                  </p>
                  <p className="truncate text-sm font-semibold leading-tight">
                    {displayName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            <DropdownMenuGroup className="p-1.5">
              <DropdownMenuItem asChild className={menuItemClass}>
                <Link href="/help" className="flex w-full items-center">
                  <HelpCircle className="size-4" />
                  <span>Help</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className={menuItemClass}>
                <Link href="/settings" className="flex w-full items-center">
                  <Settings className="size-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                ref={ref as React.Ref<HTMLDivElement>}
                onClick={() => toggleTheme()}
                className={menuItemClass}
              >
                {mounted && theme === 'dark' ? (
                  <Moon className="size-4" />
                ) : (
                  <Sun className="size-4" />
                )}
                <span>
                  {mounted && theme === 'dark' ? 'Dark' : 'Light'} mode
                </span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="my-0 bg-border/60" />

            <div className="p-1.5 pt-1">
              <DropdownMenuItem
                onClick={() => void onSignout()}
                className={cn(
                  menuItemClass,
                  'text-destructive focus:bg-destructive/10 focus:text-destructive [&_svg]:text-destructive/80'
                )}
              >
                <LogOut className="size-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
