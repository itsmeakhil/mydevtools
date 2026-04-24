"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocument, PDFImage } from "pdf-lib";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Upload, Download, FileText, ImageIcon, Eraser, Copy } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";

function looksLikePdf(file: File): boolean {
  const n = file.name.toLowerCase();
  return file.type === "application/pdf" || n.endsWith(".pdf");
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

function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("no blob"));
          return;
        }
        void blob.arrayBuffer().then((ab) => resolve(new Uint8Array(ab)));
      },
      "image/png",
      1
    );
  });
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

type PositionKey = "center" | "tl" | "tr" | "bl" | "br";

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

function parsePageRange(
  from: number,
  to: number,
  pageCount: number
): number[] {
  let a = Math.max(1, Math.min(from, pageCount));
  let b = Math.max(1, Math.min(to, pageCount));
  if (a > b) [a, b] = [b, a];
  const out: number[] = [];
  for (let p = a; p <= b; p++) out.push(p - 1);
  return out;
}

type SignMode = "draw" | "type" | "upload";

export function PdfSignPanel() {
  const t = useTranslations("PdfSign");
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);

  const [fileName, setFileName] = useState<string | null>(null);
  const [originalBytes, setOriginalBytes] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [busy, setBusy] = useState(false);

  const [mainTab, setMainTab] = useState<"sign" | "request">("sign");
  const [signMode, setSignMode] = useState<SignMode>("draw");
  const [typedName, setTypedName] = useState("");
  const [uploadBytes, setUploadBytes] = useState<Uint8Array | null>(null);
  const [uploadName, setUploadName] = useState<string | null>(null);

  const [allPages, setAllPages] = useState(true);
  const [pageFrom, setPageFrom] = useState(1);
  const [pageTo, setPageTo] = useState(1);

  const [position, setPosition] = useState<PositionKey>("br");
  const [widthPct, setWidthPct] = useState(28);

  const resetCanvas = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    hasInkRef.current = false;
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.width = 560;
    c.height = 200;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
  }, []);

  const reset = useCallback(() => {
    setFileName(null);
    setOriginalBytes(null);
    setPageCount(0);
    setUploadBytes(null);
    setUploadName(null);
    setTypedName("");
    setAllPages(true);
    setPageFrom(1);
    setPageTo(1);
    resetCanvas();
    if (pdfInputRef.current) pdfInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
  }, [resetCanvas]);

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

      const { PDFDocument, EncryptedPDFError } = await import("pdf-lib");
      setBusy(true);
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: false });
        const n = doc.getPageCount();
        setOriginalBytes(bytes);
        setFileName(file.name);
        setPageCount(n);
        setPageFrom(1);
        setPageTo(n);
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
        const { PDFDocument } = await import("pdf-lib");
        const bytes = new Uint8Array(await file.arrayBuffer());
        await embedRaster(await PDFDocument.create(), bytes);
        setUploadBytes(bytes);
        setUploadName(file.name);
      } catch {
        toast.error(t("invalidImage"));
        setUploadBytes(null);
        setUploadName(null);
      }
    },
    [t]
  );

  const getPointerPos = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const rect = c.getBoundingClientRect();
    const scaleX = c.width / rect.width;
    const scaleY = c.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (signMode !== "draw") return;
      const c = canvasRef.current;
      const ctx = c?.getContext("2d");
      if (!c || !ctx) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      drawingRef.current = true;
      const { x, y } = getPointerPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    },
    [getPointerPos, signMode]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current || signMode !== "draw") return;
      const c = canvasRef.current;
      const ctx = c?.getContext("2d");
      if (!c || !ctx) return;
      const { x, y } = getPointerPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
      hasInkRef.current = true;
    },
    [getPointerPos, signMode]
  );

  const onPointerUp = useCallback(() => {
    drawingRef.current = false;
  }, []);

  const signAndDownload = useCallback(async () => {
    if (!originalBytes || !fileName) return;

    let sigBytes: Uint8Array | null = null;
    if (signMode === "draw") {
      if (!hasInkRef.current) sigBytes = null;
      else {
        const c = canvasRef.current;
        if (c) sigBytes = await canvasToPngBytes(c);
      }
    } else if (signMode === "type") {
      const name = typedName.trim();
      if (name) {
        const w = 520;
        const h = 140;
        const off = document.createElement("canvas");
        off.width = w;
        off.height = h;
        const ctx = off.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = "#0f172a";
          ctx.font = "italic 600 42px ui-serif, Georgia, 'Times New Roman', serif";
          ctx.textBaseline = "middle";
          ctx.fillText(name, w / 2 - ctx.measureText(name).width / 2, h / 2);
          sigBytes = await canvasToPngBytes(off);
        }
      }
    } else {
      sigBytes = uploadBytes;
    }

    if (!sigBytes?.length) {
      if (signMode === "type") toast.error(t("emptyTypeName"));
      else if (signMode === "upload") toast.error(t("needUpload"));
      else toast.error(t("needDrawing"));
      return;
    }

    const { PDFDocument, EncryptedPDFError } = await import("pdf-lib");
    setBusy(true);
    try {
      const src = await PDFDocument.load(originalBytes, { ignoreEncryption: false });
      const embedded = await embedRaster(src, sigBytes);
      const iw0 = embedded.width;
      const ih0 = embedded.height;

      const indices = allPages
        ? src.getPages().map((_, i) => i)
        : parsePageRange(pageFrom, pageTo, pageCount);

      const pages = src.getPages();
      const margin = 24;

      for (const idx of indices) {
        const page = pages[idx];
        if (!page) continue;
        const { width: pw, height: ph } = page.getSize();
        const targetW = (pw * widthPct) / 100;
        const scale = targetW / iw0;
        const iw = targetW;
        const ih = ih0 * scale;
        const { x, y } = imagePosition(pw, ph, position, iw, ih, margin);
        page.drawImage(embedded, { x, y, width: iw, height: ih });
      }

      const out = await src.save();
      const blob = new Blob([new Uint8Array(out)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const base = fileName.replace(/\.pdf$/i, "");
      a.download = `${base}-signed.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("done"));
    } catch (err) {
      if (err instanceof EncryptedPDFError) {
        toast.error(t("encryptedPdf"));
      } else {
        toast.error(t("signFailed"));
      }
    } finally {
      setBusy(false);
    }
  }, [
    allPages,
    fileName,
    originalBytes,
    pageCount,
    pageFrom,
    pageTo,
    position,
    signMode,
    t,
    typedName,
    uploadBytes,
    widthPct,
  ]);

  const copyRequestTemplate = useCallback(async () => {
    const link = `${typeof window !== "undefined" ? window.location.origin : ""}/app/pdf-sign`;
    const text = t("requestTemplate", { link });
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("copiedTemplate"));
    } catch {
      toast.error(t("copyFailed"));
    }
  }, [t]);

  useEffect(() => {
    if (pageCount > 0 && pageTo > pageCount) setPageTo(pageCount);
    if (pageCount > 0 && pageFrom > pageCount) setPageFrom(pageCount);
  }, [pageCount, pageFrom, pageTo]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 p-4">
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

      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "sign" | "request")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sign">{t("mainTabSign")}</TabsTrigger>
          <TabsTrigger value="request">{t("mainTabRequest")}</TabsTrigger>
        </TabsList>

        <TabsContent value="request" className="mt-4 space-y-3 rounded-md border border-border bg-muted/30 p-4 text-sm">
          <p className="font-medium text-foreground">{t("requestTitle")}</p>
          <p className="text-muted-foreground leading-relaxed">{t("requestBody")}</p>
          <Button type="button" variant="secondary" size="sm" onClick={copyRequestTemplate}>
            <Copy className="mr-2 size-4" />
            {t("copyTemplate")}
          </Button>
        </TabsContent>

        <TabsContent value="sign" className="mt-4 space-y-4">
          {fileName && originalBytes && (
            <>
              <div className="flex items-start gap-2 text-sm rounded-md border border-border bg-card p-3">
                <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="truncate font-medium">{fileName}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("pageCount", { count: pageCount })}
                  </div>
                </div>
              </div>

              <Tabs
                value={signMode}
                onValueChange={(v) => setSignMode(v as SignMode)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="draw">{t("tabDraw")}</TabsTrigger>
                  <TabsTrigger value="type">{t("tabType")}</TabsTrigger>
                  <TabsTrigger value="upload">{t("tabUpload")}</TabsTrigger>
                </TabsList>

                <TabsContent value="draw" className="mt-3 space-y-2">
                  <Label>{t("drawLabel")}</Label>
                  <canvas
                    ref={canvasRef}
                    className="w-full max-w-[560px] touch-none rounded-md border border-border bg-white dark:bg-zinc-950 cursor-crosshair"
                    style={{ height: 200 }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerLeave={onPointerUp}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={resetCanvas}>
                    <Eraser className="mr-2 size-4" />
                    {t("clearDrawing")}
                  </Button>
                </TabsContent>

                <TabsContent value="type" className="mt-3 space-y-2">
                  <div className="space-y-2">
                    <Label htmlFor="sig-name">{t("typeLabel")}</Label>
                    <Input
                      id="sig-name"
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      placeholder={t("typePlaceholder")}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="upload" className="mt-3 space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <ImageIcon className="mr-2 size-4" />
                    {t("chooseImage")}
                  </Button>
                  {uploadName && (
                    <p className="text-xs text-muted-foreground truncate">{uploadName}</p>
                  )}
                </TabsContent>
              </Tabs>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("positionLabel")}</Label>
                  <Select value={position} onValueChange={(v) => setPosition(v as PositionKey)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="br">{t("posBr")}</SelectItem>
                      <SelectItem value="bl">{t("posBl")}</SelectItem>
                      <SelectItem value="tr">{t("posTr")}</SelectItem>
                      <SelectItem value="tl">{t("posTl")}</SelectItem>
                      <SelectItem value="center">{t("posCenter")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("widthLabel", { pct: widthPct })}</Label>
                  <Slider
                    value={[widthPct]}
                    min={12}
                    max={55}
                    step={1}
                    onValueChange={(v) => setWidthPct(v[0] ?? 28)}
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-md border border-border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="all-pages" className="cursor-pointer">
                    {t("pagesAll")}
                  </Label>
                  <Switch id="all-pages" checked={allPages} onCheckedChange={setAllPages} />
                </div>
                {!allPages && (
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="pg-from" className="text-xs">
                        {t("pagesFrom")}
                      </Label>
                      <Input
                        id="pg-from"
                        type="number"
                        min={1}
                        max={pageCount}
                        className="w-24"
                        value={pageFrom}
                        onChange={(e) => setPageFrom(Number(e.target.value) || 1)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="pg-to" className="text-xs">
                        {t("pagesTo")}
                      </Label>
                      <Input
                        id="pg-to"
                        type="number"
                        min={1}
                        max={pageCount}
                        className="w-24"
                        value={pageTo}
                        onChange={(e) => setPageTo(Number(e.target.value) || 1)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <Button
                type="button"
                className="w-full sm:w-auto"
                disabled={busy}
                onClick={() => void signAndDownload()}
              >
                <Download className="mr-2 size-4" />
                {busy ? t("working") : t("download")}
              </Button>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
