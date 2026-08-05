'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Settings, LogOut, User as UserIcon, HelpCircle, Moon, Grid2x2Plus } from 'lucide-react'
import { ModeToggle } from '@/components/modeToggle'
import { TooltipProvider } from '@/components/ui/tooltip'
import { TopNavStrip, NavIcon } from '@/components/shell/top-nav-strip'
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
  useEffect(() => {
    setIsTauri(isDesktop())
  }, [])

  // macOS hides the traffic lights in fullscreen, so the left inset that
  // reserves room for them is only needed when the window is NOT fullscreen.
  const [isFullscreen, setIsFullscreen] = useState(false)
  useEffect(() => {
    if (!isDesktop()) return
    let cancelled = false
    let unlisten: (() => void) | undefined
    void (async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      const win = getCurrentWindow()
      const sync = () =>
        win
          .isFullscreen()
          .then((v) => {
            if (!cancelled) setIsFullscreen(v)
          })
          .catch(() => {})
      sync()
      unlisten = await win.onResized(sync)
    })()
    return () => {
      cancelled = true
      unlisten?.()
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
        !isTauri ? 'px-4' : 'pr-6',
      )}
      style={isTauri ? { paddingLeft: isFullscreen ? 16 : 92 } : undefined}
    >
      {/* Brand → dashboard. Text wordmark in Courier Prime, no logo mark. */}
      <button
        onClick={() => router.push('/dashboard')}
        className="flex shrink-0 items-center rounded-md px-1.5 py-1.5 transition-colors hover:bg-foreground/[0.06]"
        aria-label="Go to dashboard"
      >
        <span
          className="text-[15px] font-bold leading-none tracking-wide"
          style={{ fontFamily: 'var(--font-courier-prime), ui-monospace, monospace' }}
        >
          mydevtools<span className="text-primary">.tech</span>
        </span>
      </button>

      {/* Favorites strip — replaces the left panel */}
      <div className="mx-1 hidden h-5 w-px shrink-0 bg-border sm:block" aria-hidden />
      <TopNavStrip />

      {/* Draggable spacer — the breathing room in the middle */}
      <div data-tauri-drag-region className="h-full flex-1" />

      {/* Right cluster — open tool + account menu (theme + settings live inside it) */}
      <div className="flex shrink-0 items-center gap-2">
        <TooltipProvider delayDuration={300}>
          <NavIcon
            label="Open tool (⌘K)"
            icon={Grid2x2Plus}
            onClick={() => document.dispatchEvent(new CustomEvent('open-command-palette'))}
          />
        </TooltipProvider>
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
                <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                  <span className="flex items-center gap-2.5 text-sm">
                    <Moon className="h-4 w-4 text-muted-foreground" /> Theme
                  </span>
                  <ModeToggle />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => void signOut()}
                  className={cn('cursor-pointer gap-2.5 text-destructive focus:text-destructive')}
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                  <span className="flex items-center gap-2.5 text-sm">
                    <Moon className="h-4 w-4 text-muted-foreground" /> Theme
                  </span>
                  <ModeToggle />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/login" className="cursor-pointer gap-2.5">
                    <UserIcon className="h-4 w-4 text-muted-foreground" /> Sign in
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
