import { generateToolMetadata } from "@/lib/metadata";
import { PdfSignPanelLazy } from "@/components/app-tools/client-only-tool-loaders";

export const metadata = generateToolMetadata("pdf-sign");

export default function PdfSignPage() {
  return (
    <div className="w-full min-h-0 flex justify-center py-6">
      <PdfSignPanelLazy />
    </div>
  );
}
