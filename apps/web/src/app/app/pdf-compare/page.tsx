import { generateToolMetadata } from "@/lib/metadata";
import { PdfComparePanelLazy } from "@/components/app-tools/client-only-tool-loaders";

export const metadata = generateToolMetadata("pdf-compare");

export default function PdfComparePage() {
  return (
    <div className="w-full min-h-0 flex justify-center py-6 overflow-auto">
      <PdfComparePanelLazy />
    </div>
  );
}
