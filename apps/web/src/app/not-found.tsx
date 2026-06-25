import Link from 'next/link'
import { ArrowRight, Home } from 'lucide-react'
import { MdtStatusPage } from '@/components/mdt-status-page'

export default function NotFound() {
  return (
    <MdtStatusPage
      code="404"
      kicker="Page not found"
      title="This page slipped through the cracks."
      description="The page you are looking for was moved, renamed, or never existed. The tools are still here."
      diagnostics={[
        'resolving requested route…',
        'GET /unknown → 404 NOT_FOUND',
        'hint: the tools index has everything',
      ]}
    >
      <Link
        href="/"
        className="mdt-btn-grad inline-flex h-12 items-center justify-center rounded-full px-7 text-sm font-medium"
      >
        <Home className="mr-2 h-4 w-4" />
        Back home
      </Link>
      <Link
        href="/tools"
        className="inline-flex h-12 items-center justify-center rounded-full border border-border/60 bg-background/60 px-7 text-sm font-medium text-foreground transition-all hover:bg-muted hover:scale-[1.03] active:scale-[0.98]"
      >
        Browse all tools
        <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
    </MdtStatusPage>
  )
}
