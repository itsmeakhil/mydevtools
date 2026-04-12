import { CsvExcelJsonTool } from "@/components/csv-excel-json/csv-excel-json-tool";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata("csv-excel-json");

export default function CsvExcelJsonPage() {
  return (
    <div className="h-full w-full min-h-0 p-2 md:p-4">
      <CsvExcelJsonTool />
    </div>
  );
}
