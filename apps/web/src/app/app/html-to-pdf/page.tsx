import { HtmlToPdfPanel } from "@/components/html-to-pdf/html-to-pdf-panel";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata("html-to-pdf");

export default function HtmlToPdfPage() {
  return (
    <div className="w-full min-h-0 flex flex-col py-6 px-2">
      <HtmlToPdfPanel />
    </div>
  );
}
