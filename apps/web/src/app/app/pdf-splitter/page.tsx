import { PdfSplitterPanel } from "@/components/pdf-splitter/pdf-splitter-panel";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata("pdf-splitter");

export default function PdfSplitterPage() {
  return (
    <div className="w-full min-h-0 flex justify-center py-6">
      <PdfSplitterPanel />
    </div>
  );
}
