import { PdfMergePanel } from "@/components/pdf-merge/pdf-merge-panel";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata("pdf-merge");

export default function PdfMergePage() {
  return (
    <div className="w-full min-h-0 flex justify-center py-6">
      <PdfMergePanel />
    </div>
  );
}
