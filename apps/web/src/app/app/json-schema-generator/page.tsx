import { JsonSchemaGeneratorLayout } from '@/components/json-schema-generator/json-schema-generator-layout';

export const metadata = {
  title: 'JSON Schema Generator | MyDevTools',
  description:
    'Paste JSON and generate JSON Schema or typed models for Python, TypeScript, Go, Rust, Java, C#, Dart, and Swift.',
};

export default function JsonSchemaGeneratorPage() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <JsonSchemaGeneratorLayout />
    </div>
  );
}
