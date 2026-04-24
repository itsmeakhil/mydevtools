import dynamic from "next/dynamic";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata("pdf-to-pdfa");

const PdfToPdfaPanel = dynamic(
  () => import("@/components/pdf-to-pdfa/pdf-to-pdfa-panel").then(m => m.PdfToPdfaPanel),
  { ssr: false, loading: () => <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" /> }
);

export default function PdfToPdfaPage() {
  return (
    <div className="flex min-h-0 w-full justify-center py-6">
      <PdfToPdfaPanel />
    </div>
  );
}
