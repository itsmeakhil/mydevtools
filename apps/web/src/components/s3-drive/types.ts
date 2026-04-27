import type { S3Provider, S3Credentials } from "@/lib/s3-drive-api"

export type { S3Provider, S3Credentials }

export type ConnectionFormValues = {
    name: string
    provider: S3Provider
    accessKey: string
    secretKey: string
    region: string
    bucket: string
    endpoint: string
}
