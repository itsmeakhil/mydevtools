import { generateToolMetadata } from "@/lib/metadata";
import { PdfLockerPanelLazy } from "@/components/app-tools/client-only-tool-loaders";

export const metadata = generateToolMetadata("pdf-locker");

export default function PdfLockerPage() {
  return (
    <div className="w-full min-h-0 flex justify-center py-6">
      <PdfLockerPanelLazy />
    </div>
  );
}
