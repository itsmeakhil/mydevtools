import { MarkdownPreviewLayout } from '@/components/markdown-preview-html/markdown-preview-html-layout';
import { generateToolMetadata } from '@/lib/metadata';

export const metadata = generateToolMetadata('markdown-preview-html');

export default function MarkdownPreviewPage() {
  return (
    <div className="h-full w-full min-h-0 p-2 md:p-4">
      <MarkdownPreviewLayout />
    </div>
  );
}
