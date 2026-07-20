import { typeCellInput } from "@/lib/sql-cell"

describe("typeCellInput", () => {
    it("auto-types null, booleans and numbers like the nosql grid", () => {
        expect(typeCellInput("null")).toBeNull()
        expect(typeCellInput("NULL")).toBeNull()
        expect(typeCellInput("true")).toBe(true)
        expect(typeCellInput("false")).toBe(false)
        expect(typeCellInput("42")).toBe(42)
        expect(typeCellInput("-3.5")).toBe(-3.5)
    })

    it("keeps everything else as strings", () => {
        expect(typeCellInput("hello")).toBe("hello")
        expect(typeCellInput("42abc")).toBe("42abc")
        expect(typeCellInput("")).toBe("")
        expect(typeCellInput("00:30")).toBe("00:30")
    })
})
