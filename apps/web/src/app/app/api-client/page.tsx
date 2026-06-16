import { ApiClientLazy } from '@/components/app-tools/client-only-tool-loaders'
export default function ApiClientPage() {
  return (
    <div className="h-full w-full p-2 md:p-4">
      <ApiClientLazy />
    </div>
  )
}
