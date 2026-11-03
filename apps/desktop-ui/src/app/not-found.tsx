import Link from 'next/link'
import { ArrowRight, Home } from 'lucide-react'
import { MdtStatusPage } from '@/components/mdt-status-page'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <MdtStatusPage
      code="404"
      kicker="Page not found"
      title="This page slipped through the cracks."
      description="The page you are looking for was moved, renamed, or never existed. The tools are still here."
    >
      <Button asChild>
        <Link href="/">
          <Home className="mr-2 h-4 w-4" />
          Back home
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/tools">
          Browse all tools
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </MdtStatusPage>
  )
}
