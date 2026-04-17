import { NumberBaseConverterLayout } from '@/components/number-base-converter/number-base-converter-layout';
import { generateToolMetadata } from '@/lib/metadata';

export const metadata = generateToolMetadata('number-base-converter');

export default function NumberBaseConverterPage() {
  return (
    <div className="h-full w-full min-h-0 p-2 md:p-4">
      <NumberBaseConverterLayout />
    </div>
  );
}

