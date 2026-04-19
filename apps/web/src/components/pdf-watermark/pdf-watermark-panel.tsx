"use client";

import { useCallback, useRef, useState } from "react";
import {
  EncryptedPDFError,
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
  type PDFFont,
  type PDFImage,
} from "pdf-lib";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Upload, Download, FileText, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function looksLikePdf(file: File): boolean {
  const n = file.name.toLowerCase();
  return file.type === "application/pdf" || n.endsWith(".pdf");
}

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace(/^#/, "").trim();
  if (h.length === 3) {
    const r = parseInt(h[0]! + h[0]!, 16) / 255;
    const g = parseInt(h[1]! + h[1]!, 16) / 255;
    const b = parseInt(h[2]! + h[2]!, 16) / 255;
    return { r, g, b };
  }
  if (h.length !== 6 || !/^[0-9a-fA-F]+$/.test(h)) {
    return { r: 0.45, g: 0.45, b: 0.45 };
  }
  const n = parseInt(h, 16);
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255,
  };
}

type PositionKey = "center" | "tl" | "tr" | "bl" | "br";

type FontKey = "helvetica" | "helveticaBold" | "times" | "courier";

async function embedWatermarkFont(
  pdf: PDFDocument,
  key: FontKey
): Promise<PDFFont> {
  const map: Record<FontKey, keyof typeof StandardFonts> = {
    helvetica: "Helvetica",
    helveticaBold: "HelveticaBold",
    times: "TimesRoman",
    courier: "Courier",
  };
  return pdf.embedFont(StandardFonts[map[key]]);
}

function looksLikeRasterImage(file: File): boolean {
  const n = file.name.toLowerCase();
  return (
    file.type === "image/png" ||
    file.type === "image/jpeg" ||
    n.endsWith(".png") ||
    n.endsWith(".jpg") ||
    n.endsWith(".jpeg") ||
    n.endsWith(".jpe")
  );
}

async function embedRaster(pdf: PDFDocument, bytes: Uint8Array): Promise<PDFImage> {
  const isPng =
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;
  if (isPng) return pdf.embedPng(bytes);
  return pdf.embedJpg(bytes);
}

function textPosition(
  w: number,
  h: number,
  pos: PositionKey,
  textWidth: number,
  fontSize: number,
  margin: number
): { x: number; y: number } {
  const cap = fontSize * 0.85;
  switch (pos) {
    case "tl":
      return { x: margin, y: h - margin - cap };
    case "tr":
      return { x: w - margin - textWidth, y: h - margin - cap };
    case "bl":
      return { x: margin, y: margin + fontSize * 0.25 };
    case "br":
      return { x: w - margin - textWidth, y: margin + fontSize * 0.25 };
    default:
      return {
        x: w / 2 - textWidth / 2,
        y: h / 2 - fontSize / 3,
      };
  }
}

function imagePosition(
  w: number,
  h: number,
  pos: PositionKey,
  iw: number,
  ih: number,
  margin: number
): { x: number; y: number } {
  switch (pos) {
    case "tl":
      return { x: margin, y: h - margin - ih };
    case "tr":
      return { x: w - margin - iw, y: h - margin - ih };
    case "bl":
      return { x: margin, y: margin };
    case "br":
      return { x: w - margin - iw, y: margin };
    default:
      return { x: w / 2 - iw / 2, y: h / 2 - ih / 2 };
  }
}

export function PdfWatermarkPanel() {
  const t = useTranslations("PdfWatermark");
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [originalBytes, setOriginalBytes] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [busy, setBusy] = useState(false);

  const [mode, setMode] = useState<"text" | "image">("text");
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
  const [fontKey, setFontKey] = useState<FontKey>("helveticaBold");
  const [fontSize, setFontSize] = useState(36);
  const [textColor, setTextColor] = useState("#6b7280");
  const [textRotation, setTextRotation] = useState(-35);

  const [imageBytes, setImageBytes] = useState<Uint8Array | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [imageScalePct, setImageScalePct] = useState(35);

  const [opacityPct, setOpacityPct] = useState(35);
  const [position, setPosition] = useState<PositionKey>("center");

  const opacity = opacityPct / 100;

  const reset = useCallback(() => {
    setFileName(null);
    setOriginalBytes(null);
    setPageCount(0);
    setImageBytes(null);
    setImageName(null);
    if (pdfInputRef.current) pdfInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
  }, []);

  const onPickPdf = useCallback(() => {
    pdfInputRef.current?.click();
  }, []);

  const onPdfChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (pdfInputRef.current) pdfInputRef.current.value = "";
      if (!file) return;

      if (!looksLikePdf(file)) {
        toast.error(t("invalidPdf"));
        return;
      }

      setBusy(true);
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: false });
        setOriginalBytes(bytes);
        setFileName(file.name);
        setPageCount(doc.getPageCount());
      } catch (err) {
        if (err instanceof EncryptedPDFError) {
          toast.error(t("encryptedPdf"));
        } else {
          toast.error(t("invalidPdf"));
        }
        reset();
      } finally {
        setBusy(false);
      }
    },
    [reset, t]
  );

  const onImageChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (!file) return;

      if (!looksLikeRasterImage(file)) {
        toast.error(t("invalidImage"));
        return;
      }

      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        await embedRaster(await PDFDocument.create(), bytes);
        setImageBytes(bytes);
        setImageName(file.name);
      } catch {
        toast.error(t("invalidImage"));
        setImageBytes(null);
        setImageName(null);
      }
    },
    [t]
  );

  const stampAndDownload = useCallback(async () => {
    if (!originalBytes || !fileName) return;
    if (mode === "text" && !watermarkText.trim()) {
      toast.error(t("emptyText"));
      return;
    }
    if (mode === "image" && !imageBytes) {
      toast.error(t("needImage"));
      return;
    }

    setBusy(true);
    try {
      const src = await PDFDocument.load(originalBytes, { ignoreEncryption: false });
      const font =
        mode === "text" ? await embedWatermarkFont(src, fontKey) : null;
      let embeddedImage: PDFImage | null = null;
      if (mode === "image" && imageBytes) {
        embeddedImage = await embedRaster(src, imageBytes);
      }

      const { r, g, b } = parseHexColor(textColor);
      const margin = 28;

      const pages = src.getPages();
      for (const page of pages) {
        const { width: w, height: h } = page.getSize();

        if (mode === "text" && font) {
          const text = watermarkText.trim();
          const tw = font.widthOfTextAtSize(text, fontSize);
          const { x, y } = textPosition(w, h, position, tw, fontSize, margin);
          page.drawText(text, {
            x,
            y,
            size: fontSize,
            font,
            color: rgb(r, g, b),
            opacity,
            rotate: degrees(textRotation),
          });
        } else if (embeddedImage) {
          const iw0 = embeddedImage.width;
          const ih0 = embeddedImage.height;
          const targetW = (w * imageScalePct) / 100;
          const scale = targetW / iw0;
          const iw = targetW;
          const ih = ih0 * scale;
          const { x, y } = imagePosition(w, h, position, iw, ih, margin);
          page.drawImage(embeddedImage, {
            x,
            y,
            width: iw,
            height: ih,
            opacity,
          });
        }
      }

      const out = await src.save();
      const blob = new Blob([new Uint8Array(out)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const base = fileName.replace(/\.pdf$/i, "");
      a.download = `${base}-watermarked.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("done"));
    } catch (err) {
      if (err instanceof EncryptedPDFError) {
        toast.error(t("encryptedPdf"));
      } else {
        toast.error(t("stampFailed"));
      }
    } finally {
      setBusy(false);
    }
  }, [
    fileName,
    fontKey,
    fontSize,
    imageBytes,
    imageScalePct,
    mode,
    opacity,
    originalBytes,
    position,
    t,
    textColor,
    textRotation,
    watermarkText,
  ]);

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 p-4">
      <p className="text-sm font-medium text-foreground">{t("intro")}</p>
      <p className="text-sm text-muted-foreground">{t("privacyNote")}</p>

      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={onPdfChange}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,.png,.jpg,.jpeg"
        className="hidden"
        onChange={onImageChange}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="default" disabled={busy} onClick={onPickPdf}>
          <Upload className="mr-2 size-4" />
          {t("choosePdf")}
        </Button>
        {fileName && (
          <Button type="button" variant="outline" disabled={busy} onClick={reset}>
            {t("reset")}
          </Button>
        )}
      </div>

      {fileName && originalBytes && (
        <div className="space-y-4 rounded-md border border-border bg-card p-3">
          <div className="flex items-start gap-2 text-sm">
            <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <div className="truncate font-medium">{fileName}</div>
              <div className="text-xs text-muted-foreground">
                {t("pageCount", { count: pageCount })}
              </div>
            </div>
          </div>

          <Tabs
            value={mode}
            onValueChange={(v) => setMode(v as "text" | "image")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text">{t("tabText")}</TabsTrigger>
              <TabsTrigger value="image">{t("tabImage")}</TabsTrigger>
            </TabsList>
            <TabsContent value="text" className="mt-3 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="wm-text">{t("textLabel")}</Label>
                <Input
                  id="wm-text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder={t("textPlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("fontLabel")}</Label>
                <Select
                  value={fontKey}
                  onValueChange={(v) => setFontKey(v as FontKey)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="helvetica">{t("fontHelvetica")}</SelectItem>
                    <SelectItem value="helveticaBold">
                      {t("fontHelveticaBold")}
                    </SelectItem>
                    <SelectItem value="times">{t("fontTimes")}</SelectItem>
                    <SelectItem value="courier">{t("fontCourier")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t("sizeLabel")}</span>
                  <span>{fontSize}px</span>
                </div>
                <Slider
                  value={[fontSize]}
                  onValueChange={(v) => setFontSize(v[0] ?? 36)}
                  min={10}
                  max={96}
                  step={1}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t("rotationLabel")}</span>
                  <span>{textRotation}°</span>
                </div>
                <Slider
                  value={[textRotation]}
                  onValueChange={(v) => setTextRotation(v[0] ?? -35)}
                  min={-90}
                  max={90}
                  step={1}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wm-color">{t("colorLabel")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="wm-color"
                    type="color"
                    className="h-9 w-14 cursor-pointer p-1"
                    value={textColor.length === 7 ? textColor : "#6b7280"}
                    onChange={(e) => setTextColor(e.target.value)}
                  />
                  <Input
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="font-mono text-sm"
                    spellCheck={false}
                  />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="image" className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => imageInputRef.current?.click()}
                >
                  <ImageIcon className="mr-2 size-4" />
                  {t("chooseImage")}
                </Button>
                {imageName && (
                  <span className="self-center truncate text-xs text-muted-foreground">
                    {imageName}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{t("imageHint")}</p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t("imageWidthLabel")}</span>
                  <span>{imageScalePct}%</span>
                </div>
                <Slider
                  value={[imageScalePct]}
                  onValueChange={(v) => setImageScalePct(v[0] ?? 35)}
                  min={8}
                  max={85}
                  step={1}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label>{t("positionLabel")}</Label>
            <Select value={position} onValueChange={(v) => setPosition(v as PositionKey)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="center">{t("posCenter")}</SelectItem>
                <SelectItem value="tl">{t("posTl")}</SelectItem>
                <SelectItem value="tr">{t("posTr")}</SelectItem>
                <SelectItem value="bl">{t("posBl")}</SelectItem>
                <SelectItem value="br">{t("posBr")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t("opacityLabel")}</span>
              <span>{opacityPct}%</span>
            </div>
            <Slider
              value={[opacityPct]}
              onValueChange={(v) => setOpacityPct(v[0] ?? 35)}
              min={5}
              max={100}
              step={1}
            />
          </div>

          <Button type="button" disabled={busy} onClick={() => void stampAndDownload()}>
            <Download className="mr-2 size-4" />
            {busy ? t("working") : t("download")}
          </Button>
        </div>
      )}
    </div>
  );
}
