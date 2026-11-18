import { withoutFileBytes } from "../body-files"
import type { RequestBody } from "@/components/api-client/types"

describe("withoutFileBytes", () => {
    const body: RequestBody = {
        type: "form-data",
        content: "",
        formData: [
            { id: "1", key: "f", value: "", active: true, valueType: "file", fileName: "a.png", fileContentBase64: "AAAA" },
            { id: "2", key: "t", value: "hi", active: true, valueType: "text" },
        ],
        binaryFile: { fileName: "b.bin", fileType: "application/octet-stream", fileContentBase64: "BBBB" },
    }

    it("blanks form-data files and the binary body, keeping names and text fields", () => {
        const out = withoutFileBytes(body, "")
        expect(out.formData![0]).toMatchObject({ fileName: "a.png", fileContentBase64: "" })
        expect(out.formData![1]).toBe(body.formData![1])
        expect(out.binaryFile).toEqual({ fileName: "b.bin", fileType: "application/octet-stream", fileContentBase64: "" })
        expect(body.binaryFile!.fileContentBase64).toBe("BBBB")
    })

    it("adds no keys to bodies without files", () => {
        expect(withoutFileBytes({ type: "json", content: "{}" }, undefined)).toEqual({ type: "json", content: "{}" })
    })
})
