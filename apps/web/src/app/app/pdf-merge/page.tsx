import dynamic from "next/dynamic";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata("pdf-merge");

const PdfMergePanel = dynamic(
  () => import("@/components/pdf-merge/pdf-merge-panel").then(m => m.PdfMergePanel),
  { ssr: false, loading: () => <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" /> }
);

export default function PdfMergePage() {
  return (
    <div className="w-full min-h-0 flex justify-center py-6">
      <PdfMergePanel />
    </div>
  );
}
