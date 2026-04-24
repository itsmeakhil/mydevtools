import { generateToolMetadata } from "@/lib/metadata";
import { JpgToPdfPanelLazy } from "@/components/app-tools/client-only-tool-loaders";

export const metadata = generateToolMetadata("jpg-to-pdf");

export default function JpgToPdfPage() {
  return (
    <div className="flex min-h-0 w-full justify-center py-6">
      <JpgToPdfPanelLazy />
    </div>
  );
}
