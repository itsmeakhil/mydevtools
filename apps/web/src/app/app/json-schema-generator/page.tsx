import { JsonSchemaGeneratorLayout } from '@/components/json-schema-generator/json-schema-generator-layout';
import { generateToolMetadata } from '@/lib/metadata';

export const metadata = generateToolMetadata('json-schema-generator')

export default function JsonSchemaGeneratorPage() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <JsonSchemaGeneratorLayout />
    </div>
  );
}
