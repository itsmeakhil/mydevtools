import dynamic from "next/dynamic";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata("html-to-pdf");

const HtmlToPdfPanel = dynamic(
  () => import("@/components/html-to-pdf/html-to-pdf-panel").then(m => m.HtmlToPdfPanel),
  { ssr: false, loading: () => <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" /> }
);

export default function HtmlToPdfPage() {
  return (
    <div className="w-full min-h-0 flex flex-col py-6 px-2">
      <HtmlToPdfPanel />
    </div>
  );
}
