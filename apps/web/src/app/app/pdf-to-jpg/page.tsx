import { PdfToJpgPanel } from "@/components/pdf-to-jpg/pdf-to-jpg-panel";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata("pdf-to-jpg");

export default function PdfToJpgPage() {
  return (
    <div className="w-full min-h-0 flex justify-center py-6">
      <PdfToJpgPanel />
    </div>
  );
}
