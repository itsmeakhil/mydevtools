import JSZip from "jszip"

import { docxToText, xlsxToRows } from "../office-preview"

async function zipOf(files: Record<string, string>): Promise<Uint8Array> {
  const zip = new JSZip()
  for (const [path, body] of Object.entries(files)) zip.file(path, body)
  return new Uint8Array(await zip.generateAsync({ type: "uint8array" }))
}

describe("docxToText", () => {
  it("flattens paragraphs, runs, tabs and entities", async () => {
    const bytes = await zipOf({
      "word/document.xml": `<?xml version="1.0"?><w:document><w:body>
        <w:p><w:r><w:t>Hello</w:t></w:r><w:r><w:t xml:space="preserve"> world</w:t></w:r></w:p>
        <w:p><w:r><w:t>A</w:t></w:r><w:tab/><w:r><w:t>Tom &amp; Jerry</w:t></w:r></w:p>
      </w:body></w:document>`,
    })
    expect(await docxToText(bytes)).toBe("Hello world\nA\tTom & Jerry")
  })

  it("rejects a zip that is not a docx", async () => {
    await expect(docxToText(await zipOf({ "a.txt": "hi" }))).rejects.toThrow("Not a .docx file")
  })
})

describe("xlsxToRows", () => {
  it("resolves shared strings and pads gaps from cell refs", async () => {
    const bytes = await zipOf({
      "xl/workbook.xml": `<workbook><sheets><sheet name="Budget" sheetId="1"/></sheets></workbook>`,
      "xl/sharedStrings.xml": `<sst><si><t>Name</t></si><si><t>Cost</t></si><si><t>Rent</t></si></sst>`,
      "xl/worksheets/sheet1.xml": `<worksheet><sheetData>
        <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>
        <row r="2"><c r="A2" t="s"><v>2</v></c><c r="C2"><v>1200</v></c></row>
      </sheetData></worksheet>`,
    })
    expect(await xlsxToRows(bytes)).toEqual({
      name: "Budget",
      // B2 is absent in the XML — the C2 ref has to keep the column aligned.
      rows: [
        ["Name", "Cost", ""],
        ["Rent", "", "1200"],
      ],
    })
  })

  it("reads inline strings", async () => {
    const bytes = await zipOf({
      "xl/worksheets/sheet1.xml": `<worksheet><sheetData>
        <row r="1"><c r="A1" t="inlineStr"><is><t>Inline</t></is></c></row>
      </sheetData></worksheet>`,
    })
    expect((await xlsxToRows(bytes)).rows).toEqual([["Inline"]])
  })
})
