import dynamic from "next/dynamic";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata("pdf-to-jpg");

const PdfToJpgPanel = dynamic(
  () => import("@/components/pdf-to-jpg/pdf-to-jpg-panel").then(m => m.PdfToJpgPanel),
  { ssr: false, loading: () => <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" /> }
);

export default function PdfToJpgPage() {
  return (
    <div className="w-full min-h-0 flex justify-center py-6">
      <PdfToJpgPanel />
    </div>
  );
}
