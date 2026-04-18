import { EncryptionPlaygroundLayout } from '@/components/encryption-playground/encryption-playground-layout';
import { generateToolMetadata } from '@/lib/metadata';

export const metadata = generateToolMetadata('encryption-playground');

export default function EncryptionPlaygroundPage() {
  return (
    <div className="h-full w-full min-h-0 p-2 md:p-4">
      <EncryptionPlaygroundLayout />
    </div>
  );
}
