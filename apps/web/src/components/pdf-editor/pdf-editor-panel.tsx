"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getDocument,
  GlobalWorkerOptions,
  version,
} from "pdfjs-dist";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import {
  EncryptedPDFError,
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Download,
  FileText,
  Highlighter,
  MessageSquareText,
  MousePointer2,
  Square,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

let workerSrcSet = false;

function ensurePdfWorker() {
  if (workerSrcSet || typeof window === "undefined") return;
  GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
  workerSrcSet = true;
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

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace(/^#/, "").trim();
  if (h.length === 3) {
    const r = parseInt(h[0]! + h[0]!, 16) / 255;
    const g = parseInt(h[1]! + h[1]!, 16) / 255;
    const b = parseInt(h[2]! + h[2]!, 16) / 255;
    return { r, g, b };
  }
  if (h.length !== 6 || !/^[0-9a-fA-F]+$/.test(h)) {
    return { r: 0.2, g: 0.45, b: 0.95 };
  }
  const n = parseInt(h, 16);
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255,
  };
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export type EditorTool = "select" | "highlight" | "rect" | "text" | "comment";

type Annotation =
  | {
      id: string;
      kind: "highlight";
      pageIndex: number;
      nx: number;
      ny: number;
      nw: number;
      nh: number;
      colorHex: string;
    }
  | {
      id: string;
      kind: "rect";
      pageIndex: number;
      nx: number;
      ny: number;
      nw: number;
      nh: number;
      strokeHex: string;
    }
  | {
      id: string;
      kind: "text";
      pageIndex: number;
      nx: number;
      ny: number;
      text: string;
      fontSize: number;
      colorHex: string;
    }
  | {
      id: string;
      kind: "comment";
      pageIndex: number;
      nx: number;
      ny: number;
      nw: number;
      nh: number;
      text: string;
    };

type DraftRect = { nx: number; ny: number; nw: number; nh: number };

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function normalizeRect(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  cw: number,
  ch: number
): { nx: number; ny: number; nw: number; nh: number } {
  const nx = clamp01(Math.min(x0, x1) / cw);
  const ny = clamp01(Math.min(y0, y1) / ch);
  const nw = clamp01(Math.abs(x1 - x0) / cw);
  const nh = clamp01(Math.abs(y1 - y0) / ch);
  return { nx, ny, nw, nh };
}

function hitTest(px: number, py: number, a: Annotation, cw: number, ch: number): boolean {
  if (a.kind === "text") {
    const x = a.nx * cw;
    const y = a.ny * ch;
    const fs = Math.max(10, a.fontSize);
    const tw = Math.min(cw - x, Math.max(40, a.text.length * fs * 0.55));
    const th = fs * 1.2;
    return px >= x && px <= x + tw && py >= y && py <= y + th;
  }
  const x = a.nx * cw;
  const y = a.ny * ch;
  const w = a.nw * cw;
  const h = a.nh * ch;
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

async function exportAnnotatedPdf(
  sourceBytes: Uint8Array,
  annotations: Annotation[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(sourceBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const drawOrder = (k: Annotation["kind"]) =>
    k === "highlight" ? 0 : k === "rect" ? 1 : k === "comment" ? 2 : 3;

  const sorted = [...annotations].sort((a, b) => drawOrder(a.kind) - drawOrder(b.kind));

  for (const ann of sorted) {
    const page = pdfDoc.getPage(ann.pageIndex);
    const { width: W, height: H } = page.getSize();

    if (ann.kind === "highlight") {
      const x = ann.nx * W;
      const w = ann.nw * W;
      const h = ann.nh * H;
      const y = H - (ann.ny + ann.nh) * H;
      const c = parseHexColor(ann.colorHex);
      page.drawRectangle({
        x,
        y,
        width: w,
        height: h,
        color: rgb(c.r, c.g, c.b),
        opacity: 0.45,
        borderWidth: 0,
      });
    } else if (ann.kind === "rect") {
      const x = ann.nx * W;
      const w = ann.nw * W;
      const h = ann.nh * H;
      const y = H - (ann.ny + ann.nh) * H;
      const c = parseHexColor(ann.strokeHex);
      page.drawRectangle({
        x,
        y,
        width: w,
        height: h,
        borderColor: rgb(c.r, c.g, c.b),
        borderWidth: 2,
        opacity: 1,
      });
    } else if (ann.kind === "comment") {
      const x = ann.nx * W;
      const w = ann.nw * W;
      const h = ann.nh * H;
      const y = H - (ann.ny + ann.nh) * H;
      page.drawRectangle({
        x,
        y,
        width: w,
        height: h,
        color: rgb(1, 0.96, 0.78),
        opacity: 1,
        borderColor: rgb(0.85, 0.7, 0.25),
        borderWidth: 1,
      });
      const body = ann.text.trim().slice(0, 800);
      const size = Math.max(7, Math.min(11, h / 6));
      const pad = 4;
      const maxW = w - pad * 2;
      const words = body.split(/\s+/).filter(Boolean);
      const lines: string[] = [];
      let cur = "";
      for (const w0 of words) {
        const trial = cur ? `${cur} ${w0}` : w0;
        if (font.widthOfTextAtSize(trial, size) <= maxW) cur = trial;
        else {
          if (cur) lines.push(cur);
          cur = w0;
        }
      }
      if (cur) lines.push(cur);
      const lineH = size * 1.15;
      let ly = y + h - pad - size * 0.85;
      const maxLines = Math.max(1, Math.floor((h - pad * 2) / lineH));
      for (const line of lines.slice(0, maxLines)) {
        if (ly < y + pad) break;
        page.drawText(line, {
          x: x + pad,
          y: ly,
          size,
          font,
          color: rgb(0.15, 0.15, 0.18),
        });
        ly -= lineH;
      }
    } else if (ann.kind === "text") {
      const x = ann.nx * W;
      const c = parseHexColor(ann.colorHex);
      const fs = ann.fontSize;
      const lines = ann.text.replace(/\r\n/g, "\n").split("\n");
      const lineH = fs * 1.2;
      let i = 0;
      for (const line of lines) {
        const baseline = H - ann.ny * H - fs * 0.85 - i * lineH;
        if (baseline < 0) break;
        page.drawText(line.slice(0, 500), {
          x,
          y: baseline,
          size: fs,
          font,
          color: rgb(c.r, c.g, c.b),
        });
        i += 1;
      }
    }
  }

  return pdfDoc.save();
}

export function PdfEditorPanel() {
  const t = useTranslations("PdfEditor");
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [scale, setScale] = useState(1.15);
  const [viewportPx, setViewportPx] = useState({ w: 0, h: 0 });
  const [renderTick, setRenderTick] = useState(0);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [tool, setTool] = useState<EditorTool>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftRect | null>(null);
  const [drag, setDrag] = useState<{ sx: number; sy: number; active: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const [textDialog, setTextDialog] = useState<{
    open: boolean;
    mode: "text" | "comment";
    nx: number;
    ny: number;
    value: string;
  }>({ open: false, mode: "text", nx: 0, ny: 0, value: "" });

  const [highlightHex, setHighlightHex] = useState("#fef08a");
  const [strokeHex, setStrokeHex] = useState("#2563eb");
  const [textHex, setTextHex] = useState("#0f172a");

  const pageAnnotations = useMemo(
    () => annotations.filter((a) => a.pageIndex === pageIndex),
    [annotations, pageIndex]
  );

  const closePdf = useCallback(async () => {
    if (pdfRef.current) {
      try {
        await pdfRef.current.destroy();
      } catch {
        /* ignore */
      }
      pdfRef.current = null;
    }
  }, []);

  const reset = useCallback(async () => {
    await closePdf();
    setFileName(null);
    setPdfBytes(null);
    setNumPages(0);
    setPageIndex(0);
    setAnnotations([]);
    setSelectedId(null);
    setDraft(null);
    setDrag(null);
    setViewportPx({ w: 0, h: 0 });
    if (inputRef.current) inputRef.current.value = "";
  }, [closePdf]);

  const loadPdfJs = useCallback(async (bytes: Uint8Array) => {
    ensurePdfWorker();
    await closePdf();
    const data = bytes.slice();
    const pdf = await getDocument({ data }).promise;
    pdfRef.current = pdf;
    setNumPages(pdf.numPages);
    setPageIndex(0);
    setRenderTick((n) => n + 1);
  }, [closePdf]);

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (inputRef.current) inputRef.current.value = "";
      if (!file || !looksLikePdf(file)) {
        if (file) toast.error(t("invalidPdf"));
        return;
      }
      try {
        const buf = new Uint8Array(await file.arrayBuffer());
        await PDFDocument.load(buf);
        setPdfBytes(buf);
        setFileName(file.name);
        setAnnotations([]);
        setSelectedId(null);
        await loadPdfJs(buf);
      } catch (err) {
        if (err instanceof EncryptedPDFError) {
          toast.error(t("encryptedPdf"));
        } else {
          toast.error(t("invalidPdf"));
        }
        await reset();
      }
    },
    [loadPdfJs, reset, t]
  );

  useEffect(() => {
    return () => {
      void closePdf();
    };
  }, [closePdf]);

  useEffect(() => {
    if (!pdfBytes || !pdfRef.current) return;

    let cancelled = false;
    const run = async () => {
      const pdf = pdfRef.current;
      if (!pdf) return;
      const pageNo = pageIndex + 1;
      let page: PDFPageProxy;
      try {
        page = await pdf.getPage(pageNo);
      } catch {
        return;
      }
      if (cancelled) {
        try {
          page.cleanup();
        } catch {
          /* ignore */
        }
        return;
      }
      const vp = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) {
        try {
          page.cleanup();
        } catch {
          /* ignore */
        }
        return;
      }
      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);
      setViewportPx({ w: canvas.width, h: canvas.height });
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        try {
          page.cleanup();
        } catch {
          /* ignore */
        }
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      try {
        page.cleanup();
      } catch {
        /* ignore */
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [pdfBytes, pageIndex, scale, renderTick]);

  const pointerToNorm = useCallback(
    (clientX: number, clientY: number) => {
      const wrap = wrapRef.current;
      if (!wrap) return null;
      const r = wrap.getBoundingClientRect();
      const x = clientX - r.left;
      const y = clientY - r.top;
      const { w, h } = viewportPx;
      if (w <= 0 || h <= 0) return null;
      return { x, y, w, h };
    },
    [viewportPx]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!pdfBytes || viewportPx.w <= 0) return;
      const pt = pointerToNorm(e.clientX, e.clientY);
      if (!pt) return;

      if (tool === "select") {
        const ordered = [...pageAnnotations].reverse();
        for (const a of ordered) {
          if (hitTest(pt.x, pt.y, a, pt.w, pt.h)) {
            setSelectedId(a.id);
            return;
          }
        }
        setSelectedId(null);
        return;
      }

      if (tool === "highlight" || tool === "rect") {
        setDrag({ sx: pt.x, sy: pt.y, active: true });
        setDraft({ nx: pt.x / pt.w, ny: pt.y / pt.h, nw: 0, nh: 0 });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }

      if (tool === "text" || tool === "comment") {
        setTextDialog({
          open: true,
          mode: tool,
          nx: clamp01(pt.x / pt.w),
          ny: clamp01(pt.y / pt.h),
          value: "",
        });
      }
    },
    [pdfBytes, pointerToNorm, pageAnnotations, tool, viewportPx.w]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag?.active || !viewportPx.w) return;
      const pt = pointerToNorm(e.clientX, e.clientY);
      if (!pt) return;
      const { nx, ny, nw, nh } = normalizeRect(drag.sx, drag.sy, pt.x, pt.y, pt.w, pt.h);
      setDraft({ nx, ny, nw, nh });
    },
    [drag, pointerToNorm, viewportPx.w]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!drag?.active) return;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      const pt = pointerToNorm(e.clientX, e.clientY);
      setDrag(null);
      setDraft(null);
      if (!pt || !pdfBytes) return;
      const { nx, ny, nw, nh } = normalizeRect(drag.sx, drag.sy, pt.x, pt.y, pt.w, pt.h);
      if (nw <= 0.008 && nh <= 0.008) return;
      if (tool === "highlight") {
        setAnnotations((prev) => [
          ...prev,
          {
            id: newId(),
            kind: "highlight",
            pageIndex,
            nx,
            ny,
            nw,
            nh,
            colorHex: highlightHex,
          },
        ]);
      } else if (tool === "rect") {
        setAnnotations((prev) => [
          ...prev,
          {
            id: newId(),
            kind: "rect",
            pageIndex,
            nx,
            ny,
            nw: Math.max(nw, 0.01),
            nh: Math.max(nh, 0.01),
            strokeHex,
          },
        ]);
      }
    },
    [drag, pointerToNorm, pdfBytes, pageIndex, tool, highlightHex, strokeHex]
  );

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    setAnnotations((prev) => prev.filter((a) => a.id !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  const clearCurrentPage = useCallback(() => {
    setAnnotations((prev) => prev.filter((a) => a.pageIndex !== pageIndex));
    setSelectedId(null);
  }, [pageIndex]);

  const onExport = useCallback(async () => {
    if (!pdfBytes) return;
    setBusy(true);
    try {
      const out = await exportAnnotatedPdf(pdfBytes, annotations);
      const stem = (fileName ?? "document").replace(/\.pdf$/i, "");
      downloadBlob(new Blob([new Uint8Array(out)], { type: "application/pdf" }), `${stem}-edited.pdf`);
      toast.success(t("exportSuccess"));
    } catch {
      toast.error(t("exportError"));
    } finally {
      setBusy(false);
    }
  }, [pdfBytes, annotations, fileName, t]);

  const submitTextDialog = useCallback(() => {
    const v = textDialog.value.trim();
    if (!v) {
      setTextDialog((d) => ({ ...d, open: false }));
      return;
    }
    if (textDialog.mode === "text") {
      setAnnotations((prev) => [
        ...prev,
        {
          id: newId(),
          kind: "text",
          pageIndex,
          nx: textDialog.nx,
          ny: textDialog.ny,
          text: v.slice(0, 2000),
          fontSize: 12,
          colorHex: textHex,
        },
      ]);
    } else {
      let nx = textDialog.nx;
      let ny = textDialog.ny;
      const nw = 0.38;
      const nh = 0.16;
      nx = Math.min(nx, 1 - nw);
      ny = Math.min(ny, 1 - nh);
      setAnnotations((prev) => [
        ...prev,
        {
          id: newId(),
          kind: "comment",
          pageIndex,
          nx,
          ny,
          nw,
          nh,
          text: v.slice(0, 2000),
        },
      ]);
    }
    setTextDialog({ open: false, mode: "text", nx: 0, ny: 0, value: "" });
  }, [textDialog, pageIndex, textHex]);

  const overlayRects = useMemo(() => {
    const { w, h } = viewportPx;
    if (w <= 0) return null;
    const items: React.ReactNode[] = [];

    for (const a of pageAnnotations) {
      const sel = a.id === selectedId;
      if (a.kind === "highlight") {
        items.push(
          <div
            key={a.id}
            className={cn(
              "pointer-events-none absolute rounded-sm",
              sel && "ring-2 ring-primary ring-offset-1 ring-offset-background"
            )}
            style={{
              left: a.nx * w,
              top: a.ny * h,
              width: a.nw * w,
              height: a.nh * h,
              backgroundColor: a.colorHex,
              opacity: 0.5,
            }}
          />
        );
      } else if (a.kind === "rect") {
        items.push(
          <div
            key={a.id}
            className={cn(
              "pointer-events-none absolute rounded-sm border-2 bg-transparent",
              sel && "ring-2 ring-primary ring-offset-1 ring-offset-background"
            )}
            style={{
              left: a.nx * w,
              top: a.ny * h,
              width: a.nw * w,
              height: a.nh * h,
              borderColor: a.strokeHex,
            }}
          />
        );
      } else if (a.kind === "comment") {
        items.push(
          <div
            key={a.id}
            className={cn(
              "pointer-events-none absolute rounded-md border border-amber-600/40 bg-amber-100/90 p-1.5 text-[10px] leading-snug text-foreground shadow-sm dark:bg-amber-950/80 dark:text-amber-50",
              sel && "ring-2 ring-primary ring-offset-1 ring-offset-background"
            )}
            style={{
              left: a.nx * w,
              top: a.ny * h,
              width: a.nw * w,
              height: a.nh * h,
            }}
          >
            <span className="line-clamp-6 break-words">{a.text}</span>
          </div>
        );
      } else {
        items.push(
          <div
            key={a.id}
            className={cn(
              "pointer-events-none absolute text-xs font-medium leading-tight whitespace-pre-wrap break-words",
              sel && "ring-2 ring-primary ring-offset-1 ring-offset-background rounded-sm"
            )}
            style={{
              left: a.nx * w,
              top: a.ny * h,
              maxWidth: w - a.nx * w,
              color: a.colorHex,
              fontSize: Math.max(10, a.fontSize * 0.95),
            }}
          >
            {a.text}
          </div>
        );
      }
    }

    if (draft && (draft.nw > 0 || draft.nh > 0)) {
      items.push(
        <div
          key="draft"
          className="pointer-events-none absolute border-2 border-dashed border-primary/70 bg-primary/10"
          style={{
            left: draft.nx * w,
            top: draft.ny * h,
            width: Math.max(draft.nw * w, 2),
            height: Math.max(draft.nh * h, 2),
          }}
        />
      );
    }

    return items;
  }, [pageAnnotations, viewportPx, selectedId, draft]);

  return (
    <div className="flex w-full max-w-5xl flex-col gap-4 px-3 md:px-0">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        <p className="mt-2 text-xs text-muted-foreground">{t("privacyNote")}</p>
      </div>

      <Card className="p-4 flex flex-col gap-4">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={onFileChange}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1.5" />
            {t("chooseFile")}
          </Button>
          {fileName ? (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <FileText className="h-4 w-4 shrink-0" />
              <span className="break-all font-medium text-foreground">{fileName}</span>
            </span>
          ) : null}
        </div>

        {!pdfBytes ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{t("emptyState")}</p>
        ) : (
          <>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Label className="text-xs text-muted-foreground sr-only">{t("toolsLabel")}</Label>
                <ToggleGroup
                  type="single"
                  value={tool}
                  onValueChange={(v) => v && setTool(v as EditorTool)}
                  className="justify-start flex-wrap gap-1"
                >
                  <ToggleGroupItem value="select" aria-label={t("toolSelect")} className="gap-1.5 px-2.5">
                    <MousePointer2 className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("toolSelect")}</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="highlight" aria-label={t("toolHighlight")} className="gap-1.5 px-2.5">
                    <Highlighter className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("toolHighlight")}</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="rect" aria-label={t("toolRect")} className="gap-1.5 px-2.5">
                    <Square className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("toolRect")}</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="text" aria-label={t("toolText")} className="gap-1.5 px-2.5">
                    <Type className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("toolText")}</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="comment" aria-label={t("toolComment")} className="gap-1.5 px-2.5">
                    <MessageSquareText className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("toolComment")}</span>
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!selectedId}
                  onClick={deleteSelected}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  {t("deleteSelected")}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={clearCurrentPage}>
                  {t("clearPage")}
                </Button>
              </div>
            </div>

            {(tool === "highlight" || tool === "rect") && (
              <div className="flex flex-wrap items-center gap-4">
                {tool === "highlight" ? (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="hl-color" className="text-xs shrink-0">
                      {t("highlightColor")}
                    </Label>
                    <Input
                      id="hl-color"
                      type="color"
                      className="h-8 w-12 cursor-pointer p-0 border-0 bg-transparent"
                      value={highlightHex}
                      onChange={(e) => setHighlightHex(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="st-color" className="text-xs shrink-0">
                      {t("strokeColor")}
                    </Label>
                    <Input
                      id="st-color"
                      type="color"
                      className="h-8 w-12 cursor-pointer p-0 border-0 bg-transparent"
                      value={strokeHex}
                      onChange={(e) => setStrokeHex(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            {tool === "text" && (
              <div className="flex items-center gap-2">
                <Label htmlFor="tx-color" className="text-xs shrink-0">
                  {t("textColor")}
                </Label>
                <Input
                  id="tx-color"
                  type="color"
                  className="h-8 w-12 cursor-pointer p-0 border-0 bg-transparent"
                  value={textHex}
                  onChange={(e) => setTextHex(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2 max-w-md">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("zoomLabel")}</span>
                <span className="tabular-nums">{scale.toFixed(2)}×</span>
              </div>
              <Slider
                value={[scale]}
                min={0.6}
                max={2.2}
                step={0.05}
                onValueChange={(v) => setScale(v[0] ?? 1)}
              />
              <p className="text-[11px] text-muted-foreground">{t("zoomHint")}</p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-y border-border/60 py-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pageIndex <= 0}
                  onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                >
                  {t("pagePrev")}
                </Button>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {t("pageLabel", { current: pageIndex + 1, total: numPages })}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pageIndex >= numPages - 1}
                  onClick={() => setPageIndex((p) => Math.min(numPages - 1, p + 1))}
                >
                  {t("pageNext")}
                </Button>
              </div>
              <Button type="button" size="sm" disabled={busy} onClick={onExport}>
                <Download className="h-4 w-4 mr-1.5" />
                {busy ? t("busy") : t("download")}
              </Button>
            </div>

            <div className="mx-auto w-fit max-w-full overflow-auto rounded-md border bg-muted/20 p-2">
              <div
                ref={wrapRef}
                className={cn(
                  "relative block shadow-sm",
                  tool === "highlight" || tool === "rect" ? "cursor-crosshair" : "",
                  tool === "text" || tool === "comment" ? "cursor-text" : "",
                  tool === "select" ? "cursor-default" : ""
                )}
                style={
                  viewportPx.w > 0
                    ? { width: viewportPx.w, height: viewportPx.h }
                    : { minHeight: 120 }
                }
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                <canvas ref={canvasRef} className="block h-auto max-w-full" />
                {viewportPx.w > 0 ? (
                  <div
                    className="pointer-events-none absolute left-0 top-0 overflow-hidden rounded-sm"
                    style={{ width: viewportPx.w, height: viewportPx.h }}
                  >
                    {overlayRects}
                  </div>
                ) : null}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">{t("hintTools")}</p>

            <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => void reset()}>
              {t("anotherFile")}
            </Button>
          </>
        )}
      </Card>

      <Dialog
        open={textDialog.open}
        onOpenChange={(open) => {
          if (!open) setTextDialog({ open: false, mode: "text", nx: 0, ny: 0, value: "" });
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {textDialog.mode === "text" ? t("dialogTextTitle") : t("dialogCommentTitle")}
            </DialogTitle>
          </DialogHeader>
          {textDialog.mode === "text" ? (
            <Textarea
              value={textDialog.value}
              onChange={(e) => setTextDialog((d) => ({ ...d, value: e.target.value }))}
              placeholder={t("dialogTextPlaceholder")}
              rows={4}
              className="resize-y"
            />
          ) : (
            <Textarea
              value={textDialog.value}
              onChange={(e) => setTextDialog((d) => ({ ...d, value: e.target.value }))}
              placeholder={t("dialogCommentPlaceholder")}
              rows={5}
              className="resize-y"
            />
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setTextDialog({ open: false, mode: "text", nx: 0, ny: 0, value: "" })}>
              {t("dialogCancel")}
            </Button>
            <Button type="button" onClick={submitTextDialog}>
              {t("dialogSave")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
