import { DnsLookupLayout } from '@/components/dns-lookup/dns-lookup-layout';
import { DesktopOnlineGate } from '@/components/desktop/desktop-online-gate';
export default function DnsLookupPage() {
  return (
    <DesktopOnlineGate toolName="DNS Lookup">
      <div className="h-full w-full min-h-0 p-2 md:p-4">
        <DnsLookupLayout />
      </div>
    </DesktopOnlineGate>
  );
}
