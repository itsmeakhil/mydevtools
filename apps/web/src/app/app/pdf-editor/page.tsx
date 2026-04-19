import { PdfEditorPanel } from "@/components/pdf-editor/pdf-editor-panel";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata("pdf-editor");

export default function PdfEditorPage() {
  return (
    <div className="flex min-h-0 w-full justify-center py-6">
      <PdfEditorPanel />
    </div>
  );
}
