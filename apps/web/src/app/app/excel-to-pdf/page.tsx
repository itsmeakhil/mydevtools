import dynamic from "next/dynamic";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata("excel-to-pdf");

const ExcelToPdfPanel = dynamic(
  () => import("@/components/excel-to-pdf/excel-to-pdf-panel").then(m => m.ExcelToPdfPanel),
  { ssr: false, loading: () => <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" /> }
);

export default function ExcelToPdfPage() {
  return (
    <div className="flex min-h-0 w-full justify-center py-6">
      <ExcelToPdfPanel />
    </div>
  );
}
