import { generateToolMetadata } from "@/lib/metadata";
import { HtmlToPdfPanelLazy } from "@/components/app-tools/client-only-tool-loaders";

export const metadata = generateToolMetadata("html-to-pdf");

export default function HtmlToPdfPage() {
  return (
    <div className="w-full min-h-0 flex flex-col py-6 px-2">
      <HtmlToPdfPanelLazy />
    </div>
  );
}
