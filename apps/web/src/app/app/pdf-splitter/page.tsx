import dynamic from "next/dynamic";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata("pdf-splitter");

const PdfSplitterPanel = dynamic(
  () => import("@/components/pdf-splitter/pdf-splitter-panel").then(m => m.PdfSplitterPanel),
  { ssr: false, loading: () => <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" /> }
);

export default function PdfSplitterPage() {
  return (
    <div className="w-full min-h-0 flex justify-center py-6">
      <PdfSplitterPanel />
    </div>
  );
}
