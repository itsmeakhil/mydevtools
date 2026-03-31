import { JsonFormatterLayout } from '@/components/json-formatter/json-formatter-layout'

export const metadata = {
  title: 'JSON Formatter | MyDevTools',
  description: 'Format, validate, and edit JSON data in text and tree views.',
}

export default function JsonFormatterPage() {
  return (
    <div className="h-[calc(100vh-3.5rem)] p-4">
      <JsonFormatterLayout />
    </div>
  )
}
