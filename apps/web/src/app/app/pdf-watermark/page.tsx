import { PdfWatermarkPanel } from "@/components/pdf-watermark/pdf-watermark-panel";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata("pdf-watermark");

export default function PdfWatermarkPage() {
  return (
    <div className="flex min-h-0 w-full justify-center py-6">
      <PdfWatermarkPanel />
    </div>
  );
}
