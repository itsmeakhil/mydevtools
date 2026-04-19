import { PdfCompressorPanel } from "@/components/pdf-compressor/pdf-compressor-panel";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata("pdf-compressor");

export default function PdfCompressorPage() {
  return (
    <div className="flex min-h-0 w-full justify-center py-6">
      <PdfCompressorPanel />
    </div>
  );
}
