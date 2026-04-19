import { PdfUnlockerPanel } from "@/components/pdf-unlocker/pdf-unlocker-panel";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata("pdf-unlocker");

export default function PdfUnlockerPage() {
  return (
    <div className="w-full min-h-0 flex justify-center py-6">
      <PdfUnlockerPanel />
    </div>
  );
}
