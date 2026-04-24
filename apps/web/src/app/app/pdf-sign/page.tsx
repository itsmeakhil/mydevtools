import dynamic from "next/dynamic";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata("pdf-sign");

const PdfSignPanel = dynamic(
  () => import("@/components/pdf-sign/pdf-sign-panel").then(m => m.PdfSignPanel),
  { ssr: false, loading: () => <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" /> }
);

export default function PdfSignPage() {
  return (
    <div className="w-full min-h-0 flex justify-center py-6">
      <PdfSignPanel />
    </div>
  );
}
