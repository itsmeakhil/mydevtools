'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Monitor, X } from 'lucide-react'

const DESKTOP_RECOMMENDED_SLUGS = new Set([
  'api-client',
  'data-explorer',
  's3-drive',
  'environment-manager',
  'notes',
  'to-do',
  'api-keys',
])

function slugFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/app\/([^/]+)/)
  return match ? match[1] : null
}

export function MobileDesktopHint() {
  const pathname = usePathname()
  const slug = slugFromPathname(pathname)
  const applies = slug !== null && DESKTOP_RECOMMENDED_SLUGS.has(slug)
  const storageKey = applies ? `mdt:desktop-hint-dismissed:${slug}` : ''

  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (!applies) return
    setDismissed(sessionStorage.getItem(storageKey) === '1')
  }, [applies, storageKey])

  if (!applies || dismissed) return null

  return (
    <div className="md:hidden flex items-start gap-3 border-b border-border bg-warning/10 px-4 py-3 text-[13px] text-foreground [&>svg]:text-warning">
      <Monitor className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p className="flex-1 leading-relaxed">
        This tool works best on a larger screen. You can keep going on mobile, but expect a tight fit.
      </p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          sessionStorage.setItem(storageKey, '1')
          setDismissed(true)
        }}
        className="-mr-1 -mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
