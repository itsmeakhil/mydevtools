"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download, FileImage, FileText, Image as ImageIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

let _pdfjsLib: typeof import("pdfjs-dist") | null = null;

async function getPdfjsLib() {
  if (!_pdfjsLib) {
    const lib = await import("pdfjs-dist");
    lib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${lib.version}/build/pdf.worker.min.mjs`;
    _pdfjsLib = lib;
  }
  return _pdfjsLib;
}

function looksLikePdf(file: File): boolean {
  const n = file.name.toLowerCase();
  return file.type === "application/pdf" || n.endsWith(".pdf");
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function getObjWithCallback(
  objs: PDFPageProxy["objs"],
  id: string
): Promise<unknown | null> {
  return new Promise((resolve) => {
    try {
      objs.get(id, (data: unknown) => {
        resolve(data ?? null);
      });
    } catch {
      resolve(null);
    }
  });
}

async function resolveXObjectImage(page: PDFPageProxy, objId: string): Promise<unknown | null> {
  const fromPage = await getObjWithCallback(page.objs, objId);
  if (fromPage) return fromPage;
  return getObjWithCallback(page.commonObjs, objId);
}

async function inlineImageToJpeg(
  imgData: Record<string, unknown>,
  quality: number
): Promise<Blob | null> {
  const width = imgData.width as number | undefined;
  const height = imgData.height as undefined | number;
  if (!width || !height) return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const bitmap = imgData.bitmap as ImageBitmap | undefined;
  if (bitmap) {
    ctx.drawImage(bitmap, 0, 0);
  } else {
    const data = imgData.data as Uint8ClampedArray | Uint8Array | undefined;
    const kind = imgData.kind as number | undefined;
    if (!data || kind === undefined) return null;

    if (kind === _pdfjsLib!.ImageKind.RGBA_32BPP) {
      const src = data instanceof Uint8ClampedArray ? data : new Uint8ClampedArray(data);
      const rgba = new Uint8ClampedArray(width * height * 4);
      rgba.set(src);
      ctx.putImageData(new ImageData(rgba, width, height), 0, 0);
    } else if (kind === _pdfjsLib!.ImageKind.RGB_24BPP) {
      const src = data instanceof Uint8Array ? data : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      const rgba = new Uint8ClampedArray(width * height * 4);
      let o = 0;
      for (let p = 0; p < width * height; p++) {
        rgba[o++] = src[p * 3];
        rgba[o++] = src[p * 3 + 1];
        rgba[o++] = src[p * 3 + 2];
        rgba[o++] = 255;
      }
      ctx.putImageData(new ImageData(rgba, width, height), 0, 0);
    } else {
      return null;
    }
  }

  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
  });
}

async function renderPageToJpeg(
  page: PDFPageProxy,
  scale: number,
  quality: number
): Promise<Blob | null> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  await page
    .render({
      canvasContext: ctx,
      viewport,
      background: "rgb(255,255,255)",
    })
    .promise;
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
  });
}

async function extractEmbeddedJpegsFromPage(
  page: PDFPageProxy,
  pageNum: number,
  baseStem: string,
  quality: number,
  seenXObjectIds: Set<string>
): Promise<number> {
  const opList = await page.getOperatorList();
  const { fnArray, argsArray } = opList;
  let count = 0;
  let inlineSeq = 0;

  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];
    const args = argsArray[i] as unknown[];

    if (fn === _pdfjsLib!.OPS.paintImageXObject || fn === _pdfjsLib!.OPS.paintImageXObjectRepeat) {
      const objId = args[0] as string;
      if (!objId || seenXObjectIds.has(objId)) continue;
      seenXObjectIds.add(objId);
      const raw = await resolveXObjectImage(page, objId);
      if (!raw || typeof raw !== "object") continue;
      const blob = await inlineImageToJpeg(raw as Record<string, unknown>, quality);
      if (!blob) continue;
      count += 1;
      downloadBlob(blob, `${baseStem}-p${pageNum}-img-${count}.jpg`);
      await new Promise((r) => setTimeout(r, 120));
    } else if (fn === _pdfjsLib!.OPS.paintInlineImageXObject) {
      const raw = args[0];
      if (!raw || typeof raw !== "object") continue;
      inlineSeq += 1;
      const blob = await inlineImageToJpeg(raw as Record<string, unknown>, quality);
      if (!blob) continue;
      count += 1;
      downloadBlob(blob, `${baseStem}-p${pageNum}-inline-${inlineSeq}.jpg`);
      await new Promise((r) => setTimeout(r, 120));
    }
  }

  return count;
}

export function PdfToJpgPanel() {
  const t = useTranslations("PdfToJpg");
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [sourceCopy, setSourceCopy] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [qualityPct, setQualityPct] = useState(88);
  const [scale, setScale] = useState(1.75);

  useEffect(() => {
    void getPdfjsLib();
  }, []);

  const reset = useCallback(() => {
    setFileName(null);
    setSourceCopy(null);
    setPageCount(0);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const onPickFile = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (inputRef.current) inputRef.current.value = "";
      if (!file) return;

      if (!looksLikePdf(file)) {
        toast.error(t("invalidPdf"));
        return;
      }

      setBusy(true);
      try {
        const pdfjs = await getPdfjsLib();
        const raw = new Uint8Array(await file.arrayBuffer());
        const dataCopy = new Uint8Array(raw);
        const loadingTask = pdfjs.getDocument({ data: dataCopy });
        const pdf = await loadingTask.promise;
        setFileName(file.name);
        setSourceCopy(raw);
        setPageCount(pdf.numPages);
        await pdf.cleanup();
        setProgress(null);
      } catch (err: unknown) {
        const name =
          err && typeof err === "object" && "name" in err
            ? String((err as { name: string }).name)
            : "";
        if (name === "PasswordException") {
          toast.error(t("passwordRequired"));
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

  const quality = qualityPct / 100;

  const exportPages = useCallback(async () => {
    if (!sourceCopy || !fileName) return;
    setBusy(true);
    const stem = fileName.replace(/\.pdf$/i, "");
    let pdf: PDFDocumentProxy | null = null;
    try {
      const pdfjs = await getPdfjsLib();
      const dataCopy = new Uint8Array(sourceCopy);
      pdf = await pdfjs.getDocument({ data: dataCopy }).promise;
      const n = pdf.numPages;
      for (let p = 1; p <= n; p++) {
        setProgress(t("progressPage", { current: p, total: n }));
        const page = await pdf.getPage(p);
        const blob = await renderPageToJpeg(page, scale, quality);
        page.cleanup();
        if (!blob) continue;
        const pad = String(p).padStart(String(n).length, "0");
        downloadBlob(blob, `${stem}-page${pad}.jpg`);
        await new Promise((r) => setTimeout(r, 150));
      }
      toast.success(t("pagesSuccess", { count: n }));
    } catch {
      toast.error(t("genericError"));
    } finally {
      if (pdf) await pdf.cleanup().catch(() => {});
      setBusy(false);
      setProgress(null);
    }
  }, [fileName, quality, scale, sourceCopy, t]);

  const exportEmbedded = useCallback(async () => {
    if (!sourceCopy || !fileName) return;
    setBusy(true);
    const stem = fileName.replace(/\.pdf$/i, "");
    let pdf: PDFDocumentProxy | null = null;
    try {
      const pdfjs = await getPdfjsLib();
      const dataCopy = new Uint8Array(sourceCopy);
      pdf = await pdfjs.getDocument({ data: dataCopy }).promise;
      const n = pdf.numPages;
      const seen = new Set<string>();
      let total = 0;
      for (let p = 1; p <= n; p++) {
        setProgress(t("progressPage", { current: p, total: n }));
        const page = await pdf.getPage(p);
        const c = await extractEmbeddedJpegsFromPage(page, p, stem, quality, seen);
        page.cleanup();
        total += c;
      }
      if (total === 0) {
        toast.message(t("noEmbeddedImages"));
      } else {
        toast.success(t("embeddedSuccess", { count: total }));
      }
    } catch {
      toast.error(t("genericError"));
    } finally {
      if (pdf) await pdf.cleanup().catch(() => {});
      setBusy(false);
      setProgress(null);
    }
  }, [fileName, quality, sourceCopy, t]);

  return (
    <div className="mx-auto w-full max-w-lg space-y-5 p-4">
      <p className="text-sm text-muted-foreground">{t("privacyNote")}</p>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={onFileChange}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="button" variant="default" disabled={busy} onClick={onPickFile}>
          <Upload className="mr-2 size-4" />
          {t("chooseFile")}
        </Button>
        {fileName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
            <FileText className="size-4 shrink-0" />
            <span className="truncate">{fileName}</span>
            {pageCount > 0 && (
              <span className="shrink-0 text-xs">({t("pageCount", { count: pageCount })})</span>
            )}
          </div>
        )}
      </div>

      {sourceCopy && pageCount > 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>{t("qualityLabel")}</Label>
              <span className="text-xs text-muted-foreground tabular-nums">{qualityPct}%</span>
            </div>
            <Slider
              value={[qualityPct]}
              min={40}
              max={100}
              step={1}
              disabled={busy}
              onValueChange={(v) => setQualityPct(v[0] ?? 88)}
            />
          </div>

          <Tabs defaultValue="pages" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="pages" className="flex-1 gap-2">
                <FileImage className="size-3.5" />
                {t("tabPages")}
              </TabsTrigger>
              <TabsTrigger value="embedded" className="flex-1 gap-2">
                <ImageIcon className="size-3.5" />
                {t("tabEmbedded")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pages" className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">{t("pagesHint")}</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>{t("scaleLabel")}</Label>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {scale.toFixed(2)}×
                  </span>
                </div>
                <Slider
                  value={[Math.round(scale * 100)]}
                  min={100}
                  max={300}
                  step={5}
                  disabled={busy}
                  onValueChange={(v) => setScale((v[0] ?? 175) / 100)}
                />
              </div>
              {progress && <p className="text-sm text-muted-foreground">{progress}</p>}
              <div className="flex flex-wrap gap-2">
                <Button type="button" disabled={busy} onClick={() => void exportPages()}>
                  <Download className="mr-2 size-4" />
                  {busy ? t("processing") : t("downloadPages")}
                </Button>
                <Button type="button" variant="outline" disabled={busy} onClick={reset}>
                  {t("reset")}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="embedded" className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">{t("embeddedHint")}</p>
              {progress && <p className="text-sm text-muted-foreground">{progress}</p>}
              <div className="flex flex-wrap gap-2">
                <Button type="button" disabled={busy} onClick={() => void exportEmbedded()}>
                  <Download className="mr-2 size-4" />
                  {busy ? t("processing") : t("downloadEmbedded")}
                </Button>
                <Button type="button" variant="outline" disabled={busy} onClick={reset}>
                  {t("reset")}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
