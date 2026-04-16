import { HashGeneratorLayout } from '@/components/hash-generator/hash-generator-layout';
import { generateToolMetadata } from '@/lib/metadata';

export const metadata = generateToolMetadata('hash-generator');

export default function HashGeneratorPage() {
  return (
    <div className="h-full w-full min-h-0 p-2 md:p-4">
      <HashGeneratorLayout />
    </div>
  );
}
