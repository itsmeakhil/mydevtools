import dynamic from "next/dynamic";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata("pdf-unlocker");

const PdfUnlockerPanel = dynamic(
  () => import("@/components/pdf-unlocker/pdf-unlocker-panel").then(m => m.PdfUnlockerPanel),
  { ssr: false, loading: () => <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" /> }
);

export default function PdfUnlockerPage() {
  return (
    <div className="w-full min-h-0 flex justify-center py-6">
      <PdfUnlockerPanel />
    </div>
  );
}
