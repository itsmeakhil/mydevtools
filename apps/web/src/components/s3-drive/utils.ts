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

export function uploadFileXHR(url: string, file: File, onProgress: (p: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total) }
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`)))
        xhr.onerror = () => reject(new Error("Network error"))
        xhr.open("PUT", url)
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream")
        xhr.send(file)
    })
}
