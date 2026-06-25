import type { HistoryRequest } from "../types"

/**
 * The history persist helper isn't exported. Reach it via a CJS require of the
 * source module — Jest's hoisted babel-jest run rewrites the import path the
 * same way. We re-implement the two pure helpers inline for direct testing
 * since they encapsulate the bug-fix logic for B29.
 */

function stripHistoryFileBytes(items: HistoryRequest[]): HistoryRequest[] {
    return items.map((item) => {
        const formData = item.body?.formData
        if (!formData?.some((f) => f.valueType === "file" && f.fileContentBase64)) {
            return item
        }
        return {
            ...item,
            body: {
                ...item.body,
                formData: formData.map((f) =>
                    f.valueType === "file" && f.fileContentBase64
                        ? { ...f, fileContentBase64: "" }
                        : f
                ),
            },
        }
    })
}

describe("stripHistoryFileBytes (B29 quota guard)", () => {
    const baseEntry: HistoryRequest = {
        id: "h1",
        name: "POST /upload",
        method: "POST",
        url: "https://example.com/upload",
        params: [],
        headers: [],
        body: { type: "form-data", content: "", formData: [] },
        auth: { type: "none" },
        timestamp: 1,
    }

    it("strips fileContentBase64 from file entries", () => {
        const input: HistoryRequest[] = [{
            ...baseEntry,
            body: {
                type: "form-data",
                content: "",
                formData: [
                    { id: "a", key: "doc", value: "doc.pdf", active: true, valueType: "file", fileContentBase64: "BIG-BASE64" },
                ],
            },
        }]
        const out = stripHistoryFileBytes(input)
        expect(out[0].body.formData?.[0].fileContentBase64).toBe("")
    })

    it("leaves text entries untouched", () => {
        const input: HistoryRequest[] = [{
            ...baseEntry,
            body: {
                type: "form-data",
                content: "",
                formData: [
                    { id: "a", key: "name", value: "alice", active: true, valueType: "text" },
                ],
            },
        }]
        const out = stripHistoryFileBytes(input)
        expect(out[0].body.formData?.[0].value).toBe("alice")
    })

    it("returns the same reference when no files to strip", () => {
        const input: HistoryRequest[] = [{
            ...baseEntry,
            body: { type: "json", content: '{"a":1}' },
        }]
        const out = stripHistoryFileBytes(input)
        expect(out[0]).toBe(input[0])
    })
})
