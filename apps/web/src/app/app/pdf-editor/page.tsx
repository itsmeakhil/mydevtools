import { generateToolMetadata } from "@/lib/metadata";
import { PdfEditorPanelLazy } from "@/components/app-tools/client-only-tool-loaders";

export const metadata = generateToolMetadata("pdf-editor");

export default function PdfEditorPage() {
  return (
    <div className="flex min-h-0 w-full justify-center py-6">
      <PdfEditorPanelLazy />
    </div>
  );
}
