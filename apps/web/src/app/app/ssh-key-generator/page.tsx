import { SshKeyGeneratorLayout } from '@/components/ssh-key-generator/ssh-key-generator-layout';
import { generateToolMetadata } from '@/lib/metadata';

export const metadata = generateToolMetadata('ssh-key-generator');

export default function SshKeyGeneratorPage() {
  return (
    <div className="h-full w-full min-h-0 p-2 md:p-4">
      <SshKeyGeneratorLayout />
    </div>
  );
}
