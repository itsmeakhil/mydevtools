'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Settings, LogOut, User as UserIcon, HelpCircle } from 'lucide-react'
import { Logo } from '@/components/logo'
import { ModeToggle } from '@/components/modeToggle'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppUser } from '@/hooks/use-app-user'
import { useSignOut } from '@/hooks/use-sign-out'
import { isDesktop } from '@/lib/desktop/is-desktop'
import { cn } from '@/lib/utils'

/**
 * Unified top bar — the pro-app chrome that replaces the sidebar logo lockup
 * and footer profile card. Left: brand → dashboard. Right: theme, settings,
 * profile. The wide middle is a drag region (empty by design — tool search
 * lives on the dashboard + the ⌘K palette). `data-tauri-drag-region` makes it
 * draggable once the OS title bar is turned off (traffic lights inset).
 */
export function TopBar() {
  const router = useRouter()
  const user = useAppUser()
  const signOut = useSignOut()

  // macOS traffic lights are inset into this bar (titleBarStyle: Overlay), so
  // pad the left only inside the Tauri window. Mounted-guarded to avoid an SSR
  // hydration mismatch (isDesktop() is false on the server).
  const [isTauri, setIsTauri] = useState(false)
  const [version, setVersion] = useState('')
  useEffect(() => {
    setIsTauri(isDesktop())
    let cancelled = false
    import('@tauri-apps/api/app')
      .then((m) => m.getVersion())
      .then((v) => {
        if (!cancelled) setVersion(v)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const isLoggedIn = Boolean(user.name || user.email)
  const displayName = user.name?.trim() || user.email?.split('@')[0] || 'User'
  const initial = (user.name?.trim()?.[0] || user.email?.[0] || '?').toUpperCase()

  return (
    <header
      data-tauri-drag-region
      className={cn(
        'flex h-14 w-full shrink-0 items-center gap-3 border-b border-border bg-[hsl(var(--surface-2))]',
        isTauri ? 'pl-[22px] pr-6' : 'px-4',
      )}
    >
      {/* Brand → dashboard. Icon (logo mark) + a larger wordmark, sized
          independently so the wordmark can grow without the mark. */}
      <button
        onClick={() => router.push('/dashboard')}
        className="flex shrink-0 items-center gap-2.5 rounded-md px-1.5 py-1.5 transition-colors hover:bg-foreground/[0.06]"
        aria-label="Go to dashboard"
      >
        <Logo size={28} showText={false} />
        <span className="relative hidden h-8 w-40 sm:block">
          <Image
            src="/logo-text-light.png"
            alt="MyDevTools"
            fill
            className="object-contain object-left dark:hidden"
          />
          <Image
            src="/logo-text-dark.png"
            alt="MyDevTools"
            fill
            className="hidden object-contain object-left dark:block"
          />
        </span>
        {version ? (
          <span className="-ml-1.5 hidden shrink-0 self-center rounded border border-border bg-[hsl(var(--surface-3))] px-1.5 py-0.5 font-mono text-[11px] leading-none text-muted-foreground sm:inline-block">
            v{version}
          </span>
        ) : null}
      </button>

      {/* Draggable spacer — the breathing room in the middle */}
      <div data-tauri-drag-region className="h-full flex-1" />

      {/* Right cluster */}
      <div className="flex shrink-0 items-center gap-2">
        <ModeToggle />

        <div className="mx-0.5 h-5 w-px bg-border" />

        <Link
          href="/settings"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
          aria-label="Settings"
        >
          <Settings className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </Link>

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              className="ml-0.5 flex h-9 w-9 items-center justify-center rounded-full outline-none ring-offset-2 ring-offset-[hsl(var(--surface-2))] transition focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Account"
            >
              <Avatar className="h-8 w-8 border border-border">
                {user.avatar ? <AvatarImage src={user.avatar} alt={displayName} /> : null}
                <AvatarFallback className="bg-[hsl(var(--surface-3))] text-xs font-semibold text-foreground">
                  {initial}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-56">
            {isLoggedIn ? (
              <>
                <div className="px-2 py-1.5">
                  <p className="truncate text-sm font-medium">{displayName}</p>
                  {user.email ? (
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  ) : null}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer gap-2.5">
                    <UserIcon className="h-4 w-4 text-muted-foreground" /> Profile
                  </Link>
                </DropdownMenuItem>
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
                <DropdownMenuItem
                  onClick={() => void signOut()}
                  className={cn('cursor-pointer gap-2.5 text-destructive focus:text-destructive')}
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem asChild>
                <Link href="/login" className="cursor-pointer gap-2.5">
                  <UserIcon className="h-4 w-4 text-muted-foreground" /> Sign in
                </Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
