import type { RequestBody } from "@/components/api-client/types"

/**
 * `body` with the bytes of every uploaded file — form-data files and the
 * binary body — replaced by `bytes` ("" for storage, undefined to drop the
 * key for comparisons). File names stay so the user can re-pick the file.
 */
export function withoutFileBytes(body: RequestBody, bytes: "" | undefined): RequestBody {
    return {
        ...body,
        ...(body.formData && {
            formData: body.formData.map((f) => (f.valueType === "file" ? { ...f, fileContentBase64: bytes } : f)),
        }),
        ...(body.binaryFile && { binaryFile: { ...body.binaryFile, fileContentBase64: bytes } }),
    }
}
