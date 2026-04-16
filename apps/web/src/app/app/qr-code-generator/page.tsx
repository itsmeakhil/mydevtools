import { QrCodeGeneratorLayout } from '@/components/qr-code-generator/qr-code-generator-layout';
import { generateToolMetadata } from '@/lib/metadata';

export const metadata = generateToolMetadata('qr-code-generator');

export default function QrCodeGeneratorPage() {
  return (
    <div className="h-full w-full min-h-0 p-2 md:p-4">
      <QrCodeGeneratorLayout />
    </div>
  );
}
