'use client'

import { useState, type ReactNode, type ElementType } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut, Menu, X } from 'lucide-react'
import { Logo } from '@/components/logo'
import { ModeToggle } from '@/components/modeToggle'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { logoutUser } from '@/lib/logout-user'

export type DashboardNavItem = {
  key: string
  label: string
  icon: ElementType
}

type Props = {
  items: DashboardNavItem[]
  active: string
  onSelect: (key: string) => void
  userLabel?: string | null
  children: ReactNode
}

function Nav({
  items,
  active,
  onSelect,
  onNavigate,
}: {
  items: DashboardNavItem[]
  active: string
  onSelect: (key: string) => void
  onNavigate?: () => void
}) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = item.icon
        const isActive = item.key === active
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              onSelect(item.key)
              onNavigate?.()
            }}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}

export function DashboardShell({ items, active, onSelect, userLabel, children }: Props) {
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const signOut = async () => {
    await logoutUser('manual')
    router.replace('/login')
  }

  return (
    <div className="min-h-[100dvh] bg-muted/30">
      {/* ── Sidebar (desktop) ── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-background md:flex">
        <div className="flex h-16 items-center px-5">
          <Link href="/" aria-label="Home">
            <Logo size={26} />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <Nav items={items} active={active} onSelect={onSelect} />
        </div>
        <div className="border-t border-border p-3">
          {userLabel && (
            <p className="truncate px-2 pb-2 text-xs text-muted-foreground" title={userLabel}>
              {userLabel}
            </p>
          )}
          <div className="flex items-center justify-between px-2 pb-2">
            <span className="text-xs text-muted-foreground">Theme</span>
            <ModeToggle />
          </div>
          <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background px-4 md:hidden">
        <Link href="/" aria-label="Home">
          <Logo size={24} />
        </Link>
        <div className="flex items-center gap-1">
          <ModeToggle />
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen((v) => !v)} aria-label="Menu">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 top-16 z-30 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
          <div
            className="absolute inset-x-0 top-0 border-b border-border bg-background p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <Nav
              items={items}
              active={active}
              onSelect={onSelect}
              onNavigate={() => setMobileOpen(false)}
            />
            <div className="mt-2 border-t border-border pt-2">
              {userLabel && (
                <p className="truncate px-3 pb-2 text-xs text-muted-foreground">{userLabel}</p>
              )}
              <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground" onClick={signOut}>
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="md:pl-60">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">{children}</div>
      </main>
    </div>
  )
}
