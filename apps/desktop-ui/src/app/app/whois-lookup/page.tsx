import { WhoisLookupLayout } from '@/components/whois-lookup/whois-lookup-layout'
import { DesktopOnlineGate } from '@/components/desktop/desktop-online-gate'
export default function WhoisLookupPage() {
  return (
    <DesktopOnlineGate toolName="Whois Lookup">
      <div className="h-full w-full min-h-0 p-2 md:p-4">
        <WhoisLookupLayout />
      </div>
    </DesktopOnlineGate>
  )
}
