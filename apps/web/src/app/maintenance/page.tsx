import type { Metadata } from 'next'
import Link from 'next/link'
import { Wrench } from 'lucide-react'
import { MdtStatusPage } from '@/components/mdt-status-page'

export const metadata: Metadata = {
  title: 'Down for maintenance',
  description: 'MyDevTools is temporarily down for scheduled maintenance.',
  robots: { index: false, follow: false },
}

export default function MaintenancePage() {
  return (
    <MdtStatusPage
      code={<Wrench className="mdt-icon-grad h-28 w-28 sm:h-32 sm:w-32" strokeWidth={1.25} />}
      kicker="Scheduled maintenance"
      title="We're tuning things up."
      description="MyDevTools is temporarily offline for maintenance. We'll be back shortly — thanks for your patience."
      diagnostics={[
        'systems offline for scheduled maintenance',
        'status: upgrade in progress…',
        'eta: back shortly — hang tight',
      ]}
    >
      <Link
        href="/"
        className="mdt-btn-grad inline-flex h-12 items-center justify-center rounded-full px-7 text-sm font-medium"
      >
        Retry
      </Link>
      <a
        href="https://github.com/itsmeakhil/mydevtools.tech"
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-12 items-center justify-center rounded-full border border-border/60 bg-background/60 px-7 text-sm font-medium text-foreground transition-all hover:bg-muted hover:scale-[1.03] active:scale-[0.98]"
      >
        Self-host meanwhile
      </a>
    </MdtStatusPage>
  )
}
