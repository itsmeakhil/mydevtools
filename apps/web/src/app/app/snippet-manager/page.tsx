import { SnippetManagerTool } from "@/components/snippet-manager/snippet-manager-tool";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata("snippet-manager");

export default function SnippetManagerPage() {
  return <SnippetManagerTool />;
}
