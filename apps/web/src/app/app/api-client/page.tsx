import { ApiClient } from "@/components/api-client/api-client"

export const metadata = {
    title: "API Client | MyDevTools",
    description: "A powerful HTTP client for testing APIs",
}

export default function ApiClientPage() {
    return (
        <div className="h-full w-full p-4">
            <ApiClient />
        </div>
    )
}
