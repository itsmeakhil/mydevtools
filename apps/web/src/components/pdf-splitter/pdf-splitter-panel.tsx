"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Upload, Download, FileText, Scissors, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function looksLikePdf(file: File): boolean {
  const n = file.name.toLowerCase();
  return file.type === "application/pdf" || n.endsWith(".pdf");
}

function parsePageRanges(input: string, totalPages: number): number[] {
  const pages = new Set<number>();
  for (const part of input.split(",")) {
    const t = part.trim();
    if (!t) continue;
    const dash = t.indexOf("-");
    if (dash > 0) {
      const start = parseInt(t.slice(0, dash).trim(), 10);
      const end = parseInt(t.slice(dash + 1).trim(), 10);
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          if (i >= 1 && i <= totalPages) pages.add(i);
        }
      }
    } else {
      const p = parseInt(t, 10);
      if (!isNaN(p) && p >= 1 && p <= totalPages) pages.add(p);
    }
  }
  return [...pages].sort((a, b) => a - b);
}

async function buildPdf(srcBytes: Uint8Array, pageNums: number[]): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const src = await PDFDocument.load(srcBytes);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, pageNums.map((n) => n - 1));
  copied.forEach((p) => out.addPage(p));
  return out.save();
}

function downloadBytes(bytes: Uint8Array, name: string) {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  const blob = new Blob([copy], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function PdfSplitterPanel() {
  const t = useTranslations("PdfSplitter");
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [sourceBytes, setSourceBytes] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [rangeInput, setRangeInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [splitProgress, setSplitProgress] = useState<number | null>(null);

  const reset = useCallback(() => {
    setFileName(null);
    setSourceBytes(null);
    setPageCount(0);
    setRangeInput("");
    setSplitProgress(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const onPickFile = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!looksLikePdf(file)) {
        toast.error(t("invalidPdf"));
        return;
      }
      setBusy(true);
      try {
        const { PDFDocument } = await import("pdf-lib");
        const buf = new Uint8Array(await file.arrayBuffer());
        const doc = await PDFDocument.load(buf);
        setFileName(file.name);
        setSourceBytes(buf);
        setPageCount(doc.getPageCount());
        setRangeInput("");
        setSplitProgress(null);
      } catch {
        toast.error(t("invalidPdf"));
        reset();
      } finally {
        setBusy(false);
      }
    },
    [reset, t]
  );

  const extractRange = useCallback(async () => {
    if (!sourceBytes || !fileName) return;
    const pages = parsePageRanges(rangeInput || `1-${pageCount}`, pageCount);
    if (pages.length === 0) {
      toast.error(t("noValidPages"));
      return;
    }
    setBusy(true);
    try {
      const bytes = await buildPdf(sourceBytes, pages);
      const base = fileName.replace(/\.pdf$/i, "");
      const label = pages.length === pageCount
        ? base
        : pages.length === 1
          ? `${base}-page${pages[0]}`
          : `${base}-pages${pages[0]}-${pages[pages.length - 1]}`;
      downloadBytes(bytes, `${label}.pdf`);
      toast.success(t("extractSuccess", { count: pages.length }));
    } catch {
      toast.error(t("genericError"));
    } finally {
      setBusy(false);
    }
  }, [sourceBytes, fileName, rangeInput, pageCount, t]);

  const splitAll = useCallback(async () => {
    if (!sourceBytes || !fileName) return;
    setBusy(true);
    setSplitProgress(0);
    const base = fileName.replace(/\.pdf$/i, "");
    try {
      for (let i = 1; i <= pageCount; i++) {
        setSplitProgress(i);
        const bytes = await buildPdf(sourceBytes, [i]);
        const pad = String(i).padStart(String(pageCount).length, "0");
        downloadBytes(bytes, `${base}-page${pad}.pdf`);
        await new Promise((r) => setTimeout(r, 150));
      }
      toast.success(t("splitSuccess", { count: pageCount }));
    } catch {
      toast.error(t("genericError"));
    } finally {
      setBusy(false);
      setSplitProgress(null);
    }
  }, [sourceBytes, fileName, pageCount, t]);

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

      {sourceBytes && pageCount > 0 && (
        <Tabs defaultValue="extract" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="extract" className="flex-1 gap-2">
              <Scissors className="size-3.5" />
              {t("tabExtract")}
            </TabsTrigger>
            <TabsTrigger value="split" className="flex-1 gap-2">
              <Layers className="size-3.5" />
              {t("tabSplit")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="extract" className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">{t("extractHint")}</p>
            <div className="space-y-2">
              <Label htmlFor="pdf-range">{t("rangeLabel")}</Label>
              <Input
                id="pdf-range"
                value={rangeInput}
                onChange={(e) => setRangeInput(e.target.value)}
                placeholder={t("rangePlaceholder", { total: pageCount })}
                disabled={busy}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !busy) void extractRange();
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={busy} onClick={() => void extractRange()}>
                <Download className="mr-2 size-4" />
                {busy ? t("processing") : t("extractButton")}
              </Button>
              <Button type="button" variant="outline" disabled={busy} onClick={reset}>
                {t("reset")}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="split" className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {t("splitHint", { count: pageCount })}
            </p>
            {splitProgress !== null && (
              <p className="text-sm text-muted-foreground">
                {t("splitProgress", { current: splitProgress, total: pageCount })}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={busy} onClick={() => void splitAll()}>
                <Download className="mr-2 size-4" />
                {busy ? t("processing") : t("splitButton", { count: pageCount })}
              </Button>
              <Button type="button" variant="outline" disabled={busy} onClick={reset}>
                {t("reset")}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
