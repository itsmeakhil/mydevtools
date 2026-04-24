import { generateToolMetadata } from "@/lib/metadata";
import { PdfUnlockerPanelLazy } from "@/components/app-tools/client-only-tool-loaders";

export const metadata = generateToolMetadata("pdf-unlocker");

export default function PdfUnlockerPage() {
  return (
    <div className="w-full min-h-0 flex justify-center py-6">
      <PdfUnlockerPanelLazy />
    </div>
  );
}
