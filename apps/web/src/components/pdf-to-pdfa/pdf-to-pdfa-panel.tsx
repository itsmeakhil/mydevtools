"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Upload, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  applyPdfADeclaration,
  saveOptionsForPdfALevel,
  type PdfALevel,
} from "@/lib/pdf-a/apply-pdfa-declaration";

function looksLikePdf(file: File): boolean {
  const n = file.name.toLowerCase();
  return file.type === "application/pdf" || n.endsWith(".pdf");
}

const LEVEL_ORDER: PdfALevel[] = ["1b", "2b", "2u", "3b", "3u"];

export function PdfToPdfaPanel() {
  const t = useTranslations("PdfToPdfA");
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [originalBytes, setOriginalBytes] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [level, setLevel] = useState<PdfALevel>("2b");

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

      const { PDFDocument, EncryptedPDFError } = await import("pdf-lib");
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

  const convertAndDownload = useCallback(async () => {
    if (!originalBytes || !fileName) return;

    const { PDFDocument, EncryptedPDFError } = await import("pdf-lib");
    setBusy(true);
    try {
      const src = await PDFDocument.load(originalBytes, { ignoreEncryption: false });
      const out = await PDFDocument.create();
      const indices = src.getPageIndices();
      const pages = await out.copyPages(src, indices);
      pages.forEach((p) => out.addPage(p));

      out.setProducer("MyDevTools (PDF to PDF/A)");
      out.setCreator("MyDevTools");

      applyPdfADeclaration(out, level);

      const raw = await out.save(saveOptionsForPdfALevel(level));
      const bytes = new Uint8Array(raw);

      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const base = fileName.replace(/\.pdf$/i, "");
      a.download = `${base}-pdfa-${level}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("done"));
    } catch (err) {
      if (err instanceof EncryptedPDFError) {
        toast.error(t("encryptedPdf"));
      } else {
        toast.error(t("convertFailed"));
      }
    } finally {
      setBusy(false);
    }
  }, [fileName, level, originalBytes, t]);

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 p-4">
      <p className="text-sm font-medium text-foreground">{t("intro")}</p>
      <p className="text-sm text-muted-foreground">{t("privacyNote")}</p>
      <p className="text-xs text-muted-foreground">{t("disclaimer")}</p>

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

          <div className="space-y-2">
            <Label>{t("levelLabel")}</Label>
            <Select value={level} onValueChange={(v) => setLevel(v as PdfALevel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVEL_ORDER.map((k) => (
                  <SelectItem key={k} value={k}>
                    {t(`level.${k}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t("levelHint")}</p>
          </div>

          <Button type="button" disabled={busy} onClick={() => void convertAndDownload()}>
            <Download className="mr-2 size-4" />
            {busy ? t("working") : t("download")}
          </Button>
        </div>
      )}
    </div>
  );
}
