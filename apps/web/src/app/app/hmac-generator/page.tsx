import { HmacGeneratorLayout } from '@/components/hmac-generator/hmac-generator-layout';
import { generateToolMetadata } from '@/lib/metadata';

export const metadata = generateToolMetadata('hmac-generator');

export default function HmacGeneratorPage() {
  return (
    <div className="h-full w-full min-h-0 p-2 md:p-4">
      <HmacGeneratorLayout />
    </div>
  );
}
