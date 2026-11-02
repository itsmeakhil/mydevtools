'use client'

import Link from 'next/link'
import { Settings, HelpCircle, Moon, ChevronsUpDown } from 'lucide-react'
import { ModeToggle } from '@/components/modeToggle'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAppUser } from '@/hooks/use-app-user'
import { cn } from '@/lib/utils'

/**
 * Profile avatar + account menu (Settings, Help, Theme).
 * `sidebar`: the app sidebar's footer row — avatar + name, or avatar only when
 * the rail is collapsed. `header`: the bare avatar, for windows too narrow to
 * show the sidebar.
 */
export function AccountMenu({
  variant,
  collapsed = false,
}: {
  variant: 'sidebar' | 'header'
  collapsed?: boolean
}) {
  const user = useAppUser()
  const displayName = user.name?.trim() || 'You'
  const initial = displayName[0]!.toUpperCase()
  const inSidebar = variant === 'sidebar'

  const avatar = (
    <Avatar className="h-8 w-8 shrink-0 border border-border">
      {user.avatar ? <AvatarImage src={user.avatar} alt={displayName} /> : null}
      <AvatarFallback className="bg-[hsl(var(--surface-3))] text-xs font-semibold text-foreground">
        {initial}
      </AvatarFallback>
    </Avatar>
  )

  const trigger = (
    <DropdownMenuTrigger asChild>
      <button
        aria-label="Account"
        className={cn(
          'flex items-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
          !inSidebar && 'h-9 w-9 justify-center rounded-full',
          inSidebar && !collapsed && 'h-11 w-full gap-2.5 rounded-md px-2 text-left hover:bg-foreground/[0.06]',
          inSidebar && collapsed && 'h-9 w-9 justify-center rounded-full',
        )}
      >
        {avatar}
        {inSidebar && !collapsed ? (
          <>
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
              {displayName}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          </>
        ) : null}
      </button>
    </DropdownMenuTrigger>
  )

  return (
    <DropdownMenu modal={false}>
      {inSidebar && collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {displayName}
          </TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      <DropdownMenuContent
        side={inSidebar ? (collapsed ? 'right' : 'top') : 'bottom'}
        align={inSidebar ? (collapsed ? 'end' : 'start') : 'end'}
        sideOffset={8}
        className="w-56"
      >
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium">{displayName}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer gap-2.5">
            <Settings className="h-4 w-4 text-muted-foreground" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/help" className="cursor-pointer gap-2.5">
            <HelpCircle className="h-4 w-4 text-muted-foreground" /> Help
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <span className="flex items-center gap-2.5 text-sm">
            <Moon className="h-4 w-4 text-muted-foreground" /> Theme
          </span>
          <ModeToggle />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
