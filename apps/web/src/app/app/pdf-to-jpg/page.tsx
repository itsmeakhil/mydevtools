import { generateToolMetadata } from "@/lib/metadata";
import { PdfToJpgPanelLazy } from "@/components/app-tools/client-only-tool-loaders";

export const metadata = generateToolMetadata("pdf-to-jpg");

export default function PdfToJpgPage() {
  return (
    <div className="w-full min-h-0 flex justify-center py-6">
      <PdfToJpgPanelLazy />
    </div>
  );
}
