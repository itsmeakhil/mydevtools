import dynamic from "next/dynamic";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata("pdf-editor");

const PdfEditorPanel = dynamic(
  () => import("@/components/pdf-editor/pdf-editor-panel").then(m => m.PdfEditorPanel),
  { ssr: false, loading: () => <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" /> }
);

export default function PdfEditorPage() {
  return (
    <div className="flex min-h-0 w-full justify-center py-6">
      <PdfEditorPanel />
    </div>
  );
}
