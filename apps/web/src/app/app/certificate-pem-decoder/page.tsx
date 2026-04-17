import { PemCertDecoderLayout } from '@/components/pem-cert-decoder/pem-cert-decoder-layout';
import { generateToolMetadata } from '@/lib/metadata';

export const metadata = generateToolMetadata('certificate-pem-decoder');

export default function CertificatePemDecoderPage() {
  return (
    <div className="h-full w-full min-h-0 p-2 md:p-4">
      <PemCertDecoderLayout />
    </div>
  );
}
