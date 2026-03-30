'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ChevronsUpDown,
  LogOut,
  Moon,
  Sun,
  User as UserIcon,
  Settings,
} from 'lucide-react'
import { useThemeAnimation } from '@space-man/react-theme-animation'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

interface NavUserProps {
  user: {
    name: string
    email: string
    avatar: string
  }
  onSignout: () => Promise<void>
}

export function NavUser({ user, onSignout }: NavUserProps) {
  const { isMobile } = useSidebar()
  const { theme, toggleTheme, ref } = useThemeAnimation()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Check if user is logged in (based on presence of name or email)
  const isLoggedIn = user.name || user.email

  if (!isLoggedIn) {
    return (
      <Link href={"/login"}>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size='lg' className='text-muted-foreground'>
              <UserIcon className='h-8 w-8' /> {/* Guest icon */}
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-semibold'>Guest User</span>
                <span className='truncate text-xs'>Not logged in</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </Link>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              <Avatar className='h-8 w-8 rounded-lg'>
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className='rounded-lg'>{user.name[0]}</AvatarFallback>
              </Avatar>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-semibold'>{user.name}</span>
                <span className='truncate text-xs'>{user.email}</span>
              </div>
              <ChevronsUpDown className='ml-auto size-4' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg'
            side={isMobile ? 'bottom' : 'right'}
            align='end'
            sideOffset={4}
          >

            <DropdownMenuItem asChild>
              <Link href='/settings'>
                <Settings className='mr-2 h-4 w-4' />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              ref={ref as any}
              onClick={() => toggleTheme()}
              className="cursor-pointer"
            >
              {mounted && theme === 'dark' ? (
                <Moon className="mr-2 h-4 w-4" />
              ) : (
                <Sun className="mr-2 h-4 w-4" />
              )}
              {mounted && theme === 'dark' ? 'Dark' : 'Light'} Theme
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignout}>
              <LogOut className='mr-2 h-4 w-4' />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}