import { PdfComparePanel } from "@/components/pdf-compare/pdf-compare-panel";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata("pdf-compare");

export default function PdfComparePage() {
  return (
    <div className="w-full min-h-0 flex justify-center py-6 overflow-auto">
      <PdfComparePanel />
    </div>
  );
}
