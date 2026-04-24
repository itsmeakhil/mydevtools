import { generateToolMetadata } from "@/lib/metadata";
import { PdfSplitterPanelLazy } from "@/components/app-tools/client-only-tool-loaders";

export const metadata = generateToolMetadata("pdf-splitter");

export default function PdfSplitterPage() {
  return (
    <div className="w-full min-h-0 flex justify-center py-6">
      <PdfSplitterPanelLazy />
    </div>
  );
}
