export type RequestMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS"

/** Persisted in localStorage; translate in UI with ApiClient.defaults */
export const API_CLIENT_DEFAULT_TAB_NAME = "New Request"
export const API_CLIENT_IMPORTED_TAB_NAME = "Imported Request"
/** Stored on failed requests; translate in UI via responsePanel.errorStatusLabel */
export const API_CLIENT_ERROR_STATUS_TEXT = "Error"

export interface KeyValueItem {
    id: string
    key: string
    value: string
    active: boolean
}

export interface RequestBody {
    type: "json" | "text" | "none"
    content: string
}

export interface RequestAuth {
    type: "none" | "bearer" | "basic" | "api-key"
    token?: string
    username?: string
    password?: string
    apiKeyKey?: string
    apiKeyValue?: string
    apiKeyLocation?: "header" | "query"
}

export interface ApiResponse {
    status: number
    statusText: string
    headers: Record<string, string>
    body: string
    isBase64?: boolean
    time: number
    size: number
    error?: string
}

export interface ApiRequestState {
    id: string
    name: string
    method: RequestMethod
    url: string
    params: KeyValueItem[]
    headers: KeyValueItem[]
    body: RequestBody
    auth: RequestAuth
    response: ApiResponse | null
    isLoading: boolean
}

export interface CollectionRequest extends Omit<ApiRequestState, "response" | "isLoading"> {
    id: string
    name: string
}

export interface CollectionFolder {
    id: string
    name: string
    type: "folder"
    items: (CollectionFolder | CollectionRequest)[]
    isOpen?: boolean
}

export interface Collection {
    id: string
    name: string
    items: (CollectionFolder | CollectionRequest)[]
}

export interface HistoryRequest extends CollectionRequest {
    timestamp: number
    status?: number
}
