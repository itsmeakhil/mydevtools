import { PdfLockerPanel } from "@/components/pdf-locker/pdf-locker-panel";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata("pdf-locker");

export default function PdfLockerPage() {
  return (
    <div className="w-full min-h-0 flex justify-center py-6">
      <PdfLockerPanel />
    </div>
  );
}
