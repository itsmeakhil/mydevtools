import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFString,
  type SaveOptions,
} from "pdf-lib";
import { decodeSrgbIccProfile } from "./srgb-icc";

export type PdfALevel = "1b" | "2b" | "2u" | "3b" | "3u";

function levelToPartAndConformance(
  level: PdfALevel
): { part: 1 | 2 | 3; conformance: "B" | "U" } {
  switch (level) {
    case "1b":
      return { part: 1, conformance: "B" };
    case "2b":
      return { part: 2, conformance: "B" };
    case "2u":
      return { part: 2, conformance: "U" };
    case "3b":
      return { part: 3, conformance: "B" };
    case "3u":
      return { part: 3, conformance: "U" };
    default: {
      const _x: never = level;
      return _x;
    }
  }
}

function buildXmpPacket(part: 1 | 2 | 3, conformance: "B" | "U"): Uint8Array {
  const xml =
    `<?xpacket begin="${"\uFEFF"}" id="W5M0MpCehiHzreSzNTczkc9d"?>\n` +
    `<x:xmpmeta xmlns:x="adobe:ns:meta/">\n` +
    `  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n` +
    `    <rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">\n` +
    `      <pdf:Producer>MyDevTools</pdf:Producer>\n` +
    `    </rdf:Description>\n` +
    `    <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">\n` +
    `      <dc:format>application/pdf</dc:format>\n` +
    `    </rdf:Description>\n` +
    `    <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/" pdfaid:part="${part}" pdfaid:conformance="${conformance}"/>\n` +
    `  </rdf:RDF>\n` +
    `</x:xmpmeta>\n` +
    `<?xpacket end="w"?>\n`;
  return new TextEncoder().encode(xml);
}

/**
 * Adds PDF/A identification metadata (XMP pdfaid), an sRGB output intent (ICC),
 * and Marked=true in MarkInfo. Does not guarantee validation against ISO 19005
 * for arbitrary source PDFs (fonts, transparency, and content may still fail checks).
 */
export function applyPdfADeclaration(pdfDoc: PDFDocument, level: PdfALevel): void {
  const { part, conformance } = levelToPartAndConformance(level);
  const ctx = pdfDoc.context;
  const catalog = pdfDoc.catalog;

  const iccBytes = decodeSrgbIccProfile();
  const iccStream = ctx.flateStream(iccBytes, { N: ctx.obj(3) });
  const iccRef = ctx.register(iccStream);

  const outputIntent = PDFDict.withContext(ctx);
  outputIntent.set(PDFName.of("Type"), PDFName.of("OutputIntent"));
  outputIntent.set(PDFName.of("S"), PDFName.of("GTS_PDFA1"));
  outputIntent.set(PDFName.of("OutputConditionIdentifier"), PDFString.of("sRGB IEC61966-2.1"));
  outputIntent.set(PDFName.of("RegistryName"), PDFString.of("http://www.color.org"));
  outputIntent.set(PDFName.of("Info"), PDFString.of("IEC 61966-2.1 default RGB colour space - sRGB"));
  outputIntent.set(PDFName.of("DestOutputProfile"), iccRef);
  const outputIntentRef = ctx.register(outputIntent);

  const outputIntents = PDFArray.withContext(ctx);
  outputIntents.push(outputIntentRef);
  catalog.set(PDFName.of("OutputIntents"), outputIntents);

  const markInfo = PDFDict.withContext(ctx);
  markInfo.set(PDFName.of("Marked"), ctx.obj(true));
  markInfo.set(PDFName.of("Suspects"), ctx.obj(false));
  catalog.set(PDFName.of("MarkInfo"), markInfo);

  const xmp = buildXmpPacket(part, conformance);
  const metaStream = ctx.flateStream(xmp, {
    Type: "Metadata",
    Subtype: "XML",
  });
  const metaRef = ctx.register(metaStream);
  catalog.set(PDFName.of("Metadata"), metaRef);
}

export function saveOptionsForPdfALevel(level: PdfALevel): SaveOptions {
  return {
    useObjectStreams: level !== "1b",
    addDefaultPage: false,
  };
}
