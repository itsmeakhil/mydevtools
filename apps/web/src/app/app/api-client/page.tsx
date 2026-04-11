import { ApiClient } from "@/components/api-client/api-client"
import { generateToolMetadata } from "@/lib/metadata"

export const metadata = generateToolMetadata('api-client')

export default function ApiClientPage() {
    return (
        <div className="h-full w-full p-4">
            <ApiClient />
        </div>
    )
}
