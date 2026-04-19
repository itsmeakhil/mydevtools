import { JpgToPdfPanel } from "@/components/jpg-to-pdf/jpg-to-pdf-panel";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata("jpg-to-pdf");

export default function JpgToPdfPage() {
  return (
    <div className="flex min-h-0 w-full justify-center py-6">
      <JpgToPdfPanel />
    </div>
  );
}
