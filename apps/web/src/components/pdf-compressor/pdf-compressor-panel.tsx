"use client";

import { useCallback, useRef, useState } from "react";
import { EncryptedPDFError, PDFDocument } from "pdf-lib";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Upload, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

function looksLikePdf(file: File): boolean {
  const n = file.name.toLowerCase();
  return file.type === "application/pdf" || n.endsWith(".pdf");
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const u = ["KB", "MB", "GB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${u[i]}`;
}

export function PdfCompressorPanel() {
  const t = useTranslations("PdfCompressor");
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [originalBytes, setOriginalBytes] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  const reset = useCallback(() => {
    setFileName(null);
    setOriginalBytes(null);
    setPageCount(0);
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

  const compressAndDownload = useCallback(async () => {
    if (!originalBytes || !fileName) return;

    setBusy(true);
    try {
      const src = await PDFDocument.load(originalBytes, { ignoreEncryption: false });

      const outDoc = await PDFDocument.create();
      const indices = src.getPageIndices();
      const pages = await outDoc.copyPages(src, indices);
      pages.forEach((p) => outDoc.addPage(p));

      const raw = await outDoc.save({ useObjectStreams: true });
      const compressed = new Uint8Array(raw.length);
      compressed.set(raw);

      const before = originalBytes.byteLength;
      const after = compressed.byteLength;
      const saved = before > after ? before - after : 0;
      const pct = before > 0 ? Math.round((saved / before) * 100) : 0;

      if (after >= before) {
        toast.message(t("noSavingsTitle"), { description: t("noSavingsHint") });
      } else {
        toast.success(t("savedToast", { percent: pct, before: formatBytes(before), after: formatBytes(after) }));
      }

      const blob = new Blob([compressed], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const base = fileName.replace(/\.pdf$/i, "");
      a.download = `${base}-compressed.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (err instanceof EncryptedPDFError) {
        toast.error(t("encryptedPdf"));
      } else {
        toast.error(t("compressFailed"));
      }
    } finally {
      setBusy(false);
    }
  }, [fileName, originalBytes, t]);

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 p-4">
      <p className="text-sm font-medium text-foreground">{t("intro")}</p>
      <p className="text-sm text-muted-foreground">{t("privacyNote")}</p>
      <p className="text-xs text-muted-foreground">{t("methodHint")}</p>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={onFileChange}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="default" disabled={busy} onClick={onPickFile}>
          <Upload className="mr-2 size-4" />
          {t("chooseFile")}
        </Button>
        {fileName && (
          <Button type="button" variant="outline" disabled={busy} onClick={reset}>
            {t("reset")}
          </Button>
        )}
      </div>

      {fileName && originalBytes && (
        <div className="space-y-3 rounded-md border border-border bg-card p-3">
          <div className="flex items-start gap-2 text-sm">
            <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <div className="truncate font-medium">{fileName}</div>
              <div className="text-xs text-muted-foreground">
                {t("pageCount", { count: pageCount })} · {t("originalSize", { size: formatBytes(originalBytes.byteLength) })}
              </div>
            </div>
          </div>
          <Button type="button" disabled={busy} onClick={() => void compressAndDownload()}>
            <Download className="mr-2 size-4" />
            {busy ? t("compressing") : t("compressDownload")}
          </Button>
        </div>
      )}
    </div>
  );
}
