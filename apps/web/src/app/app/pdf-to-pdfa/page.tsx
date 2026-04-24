import { generateToolMetadata } from "@/lib/metadata";
import { PdfToPdfaPanelLazy } from "@/components/app-tools/client-only-tool-loaders";

export const metadata = generateToolMetadata("pdf-to-pdfa");

export default function PdfToPdfaPage() {
  return (
    <div className="flex min-h-0 w-full justify-center py-6">
      <PdfToPdfaPanelLazy />
    </div>
  );
}
