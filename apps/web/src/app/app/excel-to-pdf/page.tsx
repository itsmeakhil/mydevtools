import { generateToolMetadata } from "@/lib/metadata";
import { ExcelToPdfPanelLazy } from "@/components/app-tools/client-only-tool-loaders";

export const metadata = generateToolMetadata("excel-to-pdf");

export default function ExcelToPdfPage() {
  return (
    <div className="flex min-h-0 w-full justify-center py-6">
      <ExcelToPdfPanelLazy />
    </div>
  );
}
