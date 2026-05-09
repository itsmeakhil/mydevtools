import { DnsLookupLayout } from '@/components/dns-lookup/dns-lookup-layout';
import { generateToolMetadata } from '@/lib/metadata';

export const metadata = generateToolMetadata('dns-lookup');

export default function DnsLookupPage() {
  return (
    <div className="h-full w-full min-h-0 p-2 md:p-4">
      <DnsLookupLayout />
    </div>
  );
}
