import dynamic from "next/dynamic";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata("pdf-compare");

const PdfComparePanel = dynamic(
  () => import("@/components/pdf-compare/pdf-compare-panel").then(m => m.PdfComparePanel),
  { ssr: false, loading: () => <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" /> }
);

export default function PdfComparePage() {
  return (
    <div className="w-full min-h-0 flex justify-center py-6 overflow-auto">
      <PdfComparePanel />
    </div>
  );
}
