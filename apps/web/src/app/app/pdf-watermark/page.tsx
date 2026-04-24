import dynamic from "next/dynamic";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata("pdf-watermark");

const PdfWatermarkPanel = dynamic(
  () => import("@/components/pdf-watermark/pdf-watermark-panel").then(m => m.PdfWatermarkPanel),
  { ssr: false, loading: () => <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" /> }
);

export default function PdfWatermarkPage() {
  return (
    <div className="flex min-h-0 w-full justify-center py-6">
      <PdfWatermarkPanel />
    </div>
  );
}
