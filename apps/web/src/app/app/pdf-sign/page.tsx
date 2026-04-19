import { PdfSignPanel } from "@/components/pdf-sign/pdf-sign-panel";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata("pdf-sign");

export default function PdfSignPage() {
  return (
    <div className="w-full min-h-0 flex justify-center py-6">
      <PdfSignPanel />
    </div>
  );
}
