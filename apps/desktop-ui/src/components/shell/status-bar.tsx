'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { IconLock, IconLockOpen, IconStack2 } from '@tabler/icons-react'
import { useMasterKeyStore } from '@/store/master-key-store'
import { useActiveWorkspace } from '@/store/workspace-store'
import { isDesktop } from '@/lib/desktop/is-desktop'
import { cn } from '@/lib/utils'

/**
 * 28px Liquid Glass status bar under the content pane: vault lock state,
 * active workspace, app version. Display-only — locking/unlocking stays in the
 * tools and the master-password gate.
 */
export function StatusBar() {
  const t = useTranslations('Shell')
  const unlocked = useMasterKeyStore((s) => s.isUnlocked)
  const workspace = useActiveWorkspace()
  const [version, setVersion] = useState('')

  useEffect(() => {
    if (!isDesktop()) return
    void import('@/lib/desktop/updater')
      .then((m) => m.currentAppVersion())
      .then(setVersion)
      .catch(() => {})
  }, [])

  const Lock = unlocked ? IconLockOpen : IconLock

  return (
    <footer
      aria-label={t('status')}
      className="liquid chrome mt-3 hidden h-7 shrink-0 items-center gap-4 rounded-full px-3.5 text-xs font-medium text-muted-foreground md:flex"
    >
      <span className="flex items-center gap-1.5">
        <Lock
          className={cn('h-3.5 w-3.5', unlocked ? 'text-success' : 'text-muted-foreground')}
          stroke={1.8}
          aria-hidden
        />
        {unlocked ? t('vaultUnlocked') : t('vaultLocked')}
      </span>
      {workspace?.name ? (
        <span className="flex min-w-0 items-center gap-1.5">
          <IconStack2 className="h-3.5 w-3.5 shrink-0" stroke={1.8} aria-hidden />
          <span className="truncate">{workspace.name}</span>
        </span>
      ) : null}
      <span className="flex-1" />
      {version ? <span className="tabular-nums">v{version}</span> : null}
    </footer>
  )
}
