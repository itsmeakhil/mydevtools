'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Monitor, X } from 'lucide-react'

const DESKTOP_RECOMMENDED_SLUGS = new Set([
  'api-client',
  'sql-client',
  'database-explorer',
  'redis-commander',
  'encryption-playground',
  's3-drive',
  'csv-excel-json',
  'environment-manager',
  'notes',
  'to-do',
  'bookmarks',
  'break-room',
  'api-keys',
  'image-compressor',
  'image-to-base64',
  'svg-optimizer',
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
    <div className="md:hidden flex items-start gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
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
        className="-mr-1 -mt-1 inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-amber-500/20"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
