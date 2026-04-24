import dynamic from "next/dynamic";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata("pdf-compressor");

const PdfCompressorPanel = dynamic(
  () => import("@/components/pdf-compressor/pdf-compressor-panel").then(m => m.PdfCompressorPanel),
  { ssr: false, loading: () => <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" /> }
);

export default function PdfCompressorPage() {
  return (
    <div className="flex min-h-0 w-full justify-center py-6">
      <PdfCompressorPanel />
    </div>
  );
}
