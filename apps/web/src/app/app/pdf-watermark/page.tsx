import { generateToolMetadata } from "@/lib/metadata";
import { PdfWatermarkPanelLazy } from "@/components/app-tools/client-only-tool-loaders";

export const metadata = generateToolMetadata("pdf-watermark");

export default function PdfWatermarkPage() {
  return (
    <div className="flex min-h-0 w-full justify-center py-6">
      <PdfWatermarkPanelLazy />
    </div>
  );
}
