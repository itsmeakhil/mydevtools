import { permanentRedirect } from 'next/navigation'

// Pricing/open-source positioning was removed from the marketing site.
// Slug kept alive (never rename URLs) — 308 to the download page.
export default function PricingPage() {
  permanentRedirect('/download')
}
