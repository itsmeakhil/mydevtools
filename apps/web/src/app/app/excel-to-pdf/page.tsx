import { ExcelToPdfPanel } from "@/components/excel-to-pdf/excel-to-pdf-panel";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata("excel-to-pdf");

export default function ExcelToPdfPage() {
  return (
    <div className="flex min-h-0 w-full justify-center py-6">
      <ExcelToPdfPanel />
    </div>
  );
}
