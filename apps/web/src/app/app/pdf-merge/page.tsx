import { generateToolMetadata } from "@/lib/metadata";
import { PdfMergePanelLazy } from "@/components/app-tools/client-only-tool-loaders";

export const metadata = generateToolMetadata("pdf-merge");

export default function PdfMergePage() {
  return (
    <div className="w-full min-h-0 flex justify-center py-6">
      <PdfMergePanelLazy />
    </div>
  );
}
