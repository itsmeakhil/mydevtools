import { ImageCompressorLayout } from '@/components/image-compressor/image-compressor-layout';
import { generateToolMetadata } from '@/lib/metadata';

export const metadata = generateToolMetadata('image-compressor');

export default function ImageCompressorPage() {
  return (
    <div className="h-full w-full min-h-0 p-2 md:p-4">
      <ImageCompressorLayout />
    </div>
  );
}
