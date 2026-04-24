import dynamic from "next/dynamic";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata("pdf-locker");

const PdfLockerPanel = dynamic(
  () => import("@/components/pdf-locker/pdf-locker-panel").then(m => m.PdfLockerPanel),
  { ssr: false, loading: () => <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" /> }
);

export default function PdfLockerPage() {
  return (
    <div className="w-full min-h-0 flex justify-center py-6">
      <PdfLockerPanel />
    </div>
  );
}
