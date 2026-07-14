import { listObjects, moveObject, type S3Credentials } from "@/lib/s3-drive-api"

export function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B"
    const units = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export async function moveFolderRecursive(credentials: S3Credentials, oldPrefix: string, newPrefix: string) {
    let token: string | undefined
    do {
        const res = await listObjects(credentials, oldPrefix, token, "")
        await Promise.all(
            res.objects.map((obj) =>
                moveObject(credentials, obj.key, newPrefix + obj.key.slice(oldPrefix.length)),
            ),
        )
        token = res.nextContinuationToken
    } while (token)
}
