import { PdfToPdfaPanel } from "@/components/pdf-to-pdfa/pdf-to-pdfa-panel";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata("pdf-to-pdfa");

export default function PdfToPdfaPage() {
  return (
    <div className="flex min-h-0 w-full justify-center py-6">
      <PdfToPdfaPanel />
    </div>
  );
}
