/**
 * Self-contained types for the CLI — deliberately decoupled from the web app so
 * the package can publish standalone. The shape matches what `lib/import/postman.ts`
 * emits, so a Postman v2.1 export round-trips into here.
 */

export type RequestMethod =
    | "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS"

export interface KeyValueItem {
    id: string
    key: string
    value: string
    active: boolean
}

export interface FormDataItem {
    id: string
    key: string
    value: string
    active: boolean
    valueType: "text" | "file"
    fileName?: string
    fileType?: string
    fileContentBase64?: string
}

export interface RequestBody {
    type: "json" | "text" | "none" | "form-data" | "x-www-form-urlencoded" | "graphql"
    content: string
    formData?: FormDataItem[]
    urlEncoded?: KeyValueItem[]
    graphqlVariables?: string
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

export interface CollectionRequest {
    id: string
    name: string
    method: RequestMethod
    url: string
    params: KeyValueItem[]
    headers: KeyValueItem[]
    body: RequestBody
    auth: RequestAuth
    preRequestScript?: string
    testScript?: string
}

export interface CollectionFolder {
    id: string
    name: string
    type: "folder"
    items: (CollectionFolder | CollectionRequest)[]
    defaultHeaders?: KeyValueItem[]
    preRequestScript?: string
    testScript?: string
}

export interface Collection {
    id: string
    name: string
    items: (CollectionFolder | CollectionRequest)[]
}

export interface TestResult {
    name: string
    pass: boolean
    error?: string
}

export interface ScriptLog {
    level: "log" | "warn" | "error"
    args: string[]
}

export interface RequestRunResult {
    iteration: number
    requestId: string
    requestName: string
    method: string
    url: string
    status?: number
    statusText?: string
    time?: number
    size?: number
    tests: TestResult[]
    logs: ScriptLog[]
    errors: string[]
    networkError?: string
}
