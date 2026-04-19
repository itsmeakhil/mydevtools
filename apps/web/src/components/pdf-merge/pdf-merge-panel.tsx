"use client";

import { useCallback, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Upload,
  Download,
  FileText,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type PdfItem = {
  id: string;
  name: string;
  bytes: Uint8Array;
  pageCount: number;
};

function looksLikePdf(file: File): boolean {
  const n = file.name.toLowerCase();
  return file.type === "application/pdf" || n.endsWith(".pdf");
}

export function PdfMergePanel() {
  const t = useTranslations("PdfMerge");
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<PdfItem[]>([]);
  const [busy, setBusy] = useState(false);

  const reset = useCallback(() => {
    setItems([]);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const onPickFiles = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files;
      if (!list?.length) return;

      setBusy(true);
      try {
        const appended: PdfItem[] = [];
        for (const file of Array.from(list)) {
          if (!looksLikePdf(file)) {
            toast.error(t("invalidPdf"));
            continue;
          }
          try {
            const bytes = new Uint8Array(await file.arrayBuffer());
            const doc = await PDFDocument.load(bytes);
            appended.push({
              id: crypto.randomUUID(),
              name: file.name,
              bytes,
              pageCount: doc.getPageCount(),
            });
          } catch {
            toast.error(t("invalidPdf"));
          }
        }
        if (appended.length) {
          setItems((prev) => [...prev, ...appended]);
        }
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [t]
  );

  const removeAt = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const move = useCallback((index: number, dir: -1 | 1) => {
    setItems((prev) => {
      const j = index + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[index]!;
      next[index] = next[j]!;
      next[j] = tmp;
      return next;
    });
  }, []);

  const mergeAndDownload = useCallback(async () => {
    if (items.length < 2) {
      toast.error(t("minTwoPdfs"));
      return;
    }

    setBusy(true);
    try {
      const merged = await PDFDocument.create();
      for (const item of items) {
        const src = await PDFDocument.load(item.bytes);
        const indices = src.getPageIndices();
        const pages = await merged.copyPages(src, indices);
        pages.forEach((p) => merged.addPage(p));
      }
      const raw = await merged.save();
      const out = new Uint8Array(raw.length);
      out.set(raw);
      const blob = new Blob([out], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "merged.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("mergeFailed"));
    } finally {
      setBusy(false);
    }
  }, [items, t]);

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 p-4">
      <p className="text-sm font-medium text-foreground">{t("intro")}</p>
      <p className="text-sm text-muted-foreground">{t("privacyNote")}</p>
      <p className="text-xs text-muted-foreground">{t("orderHint")}</p>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={onFileChange}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="default" disabled={busy} onClick={onPickFiles}>
          <Upload className="mr-2 size-4" />
          {t("addPdfs")}
        </Button>
        {items.length > 0 && (
          <Button type="button" variant="outline" disabled={busy} onClick={reset}>
            {t("clearAll")}
          </Button>
        )}
      </div>

      {items.length > 0 && (
        <ul className="space-y-2 rounded-md border border-border bg-card p-3">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-sm border border-border/60 bg-background/80 p-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="truncate font-medium">{item.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("pages", { count: item.pageCount })}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  disabled={busy || index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={t("moveUpAria")}
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  disabled={busy || index === items.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={t("moveDownAria")}
                >
                  <ChevronDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8 text-destructive hover:text-destructive"
                  disabled={busy}
                  onClick={() => removeAt(index)}
                  aria-label={t("removeFileAria")}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          type="button"
          disabled={busy || items.length < 2}
          onClick={() => void mergeAndDownload()}
        >
          <Download className="mr-2 size-4" />
          {busy ? t("merging") : t("mergeDownload")}
        </Button>
      </div>
    </div>
  );
}
