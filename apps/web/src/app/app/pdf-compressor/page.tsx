import { generateToolMetadata } from "@/lib/metadata";
import { PdfCompressorPanelLazy } from "@/components/app-tools/client-only-tool-loaders";

export const metadata = generateToolMetadata("pdf-compressor");

export default function PdfCompressorPage() {
  return (
    <div className="flex min-h-0 w-full justify-center py-6">
      <PdfCompressorPanelLazy />
    </div>
  );
}
