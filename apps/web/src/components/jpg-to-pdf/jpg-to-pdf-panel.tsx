"use client";

import { useCallback, useRef, useState } from "react";
import type { PDFDocument } from "pdf-lib";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Upload,
  Download,
  Image as ImageIcon,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MM_TO_PT = 72 / 25.4;

type JpgItem = {
  id: string;
  name: string;
  bytes: Uint8Array;
};

function looksLikeJpeg(file: File): boolean {
  const n = file.name.toLowerCase();
  return (
    file.type === "image/jpeg" ||
    n.endsWith(".jpg") ||
    n.endsWith(".jpeg") ||
    n.endsWith(".jpe")
  );
}

function normalizeRotation(deg: number): 0 | 90 | 180 | 270 {
  const r = ((deg % 360) + 360) % 360;
  if (r === 90 || r === 180 || r === 270) return r as 0 | 90 | 180 | 270;
  return 0;
}

async function appendJpgPage(
  pdf: PDFDocument,
  jpgBytes: Uint8Array,
  rotationDeg: number,
  marginPt: number
): Promise<void> {
  const { degrees } = await import("pdf-lib");
  const jpg = await pdf.embedJpg(jpgBytes);
  const iw = jpg.width;
  const ih = jpg.height;
  const m = marginPt;
  const r = normalizeRotation(rotationDeg);
  const swap = r === 90 || r === 270;
  const boxW = swap ? ih : iw;
  const boxH = swap ? iw : ih;
  const page = pdf.addPage([boxW + 2 * m, boxH + 2 * m]);

  if (r === 0) {
    page.drawImage(jpg, { x: m, y: m, width: iw, height: ih });
  } else if (r === 90) {
    page.drawImage(jpg, {
      x: m + ih,
      y: m,
      width: iw,
      height: ih,
      rotate: degrees(90),
    });
  } else if (r === 180) {
    page.drawImage(jpg, {
      x: m + iw,
      y: m + ih,
      width: iw,
      height: ih,
      rotate: degrees(180),
    });
  } else {
    page.drawImage(jpg, {
      x: m,
      y: m + iw,
      width: iw,
      height: ih,
      rotate: degrees(270),
    });
  }
}

export function JpgToPdfPanel() {
  const t = useTranslations("JpgToPdf");
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<JpgItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [rotation, setRotation] = useState<string>("0");
  const [marginMm, setMarginMm] = useState<number>(10);

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
        const { PDFDocument } = await import("pdf-lib");
        const appended: JpgItem[] = [];
        const probe = await PDFDocument.create();
        for (const file of Array.from(list)) {
          if (!looksLikeJpeg(file)) {
            toast.error(t("invalidJpeg"));
            continue;
          }
          try {
            const bytes = new Uint8Array(await file.arrayBuffer());
            await probe.embedJpg(bytes);
            appended.push({
              id: crypto.randomUUID(),
              name: file.name,
              bytes,
            });
          } catch {
            toast.error(t("invalidJpeg"));
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

  const buildAndDownload = useCallback(async () => {
    if (items.length < 1) {
      toast.error(t("minOneJpeg"));
      return;
    }

    setBusy(true);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const pdf = await PDFDocument.create();
      const rot = Number(rotation);
      const marginPt = marginMm * MM_TO_PT;
      for (const item of items) {
        await appendJpgPage(pdf, item.bytes, rot, marginPt);
      }
      const raw = await pdf.save();
      const out = new Uint8Array(raw.length);
      out.set(raw);
      const pdfBytes = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "images.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("buildFailed"));
    } finally {
      setBusy(false);
    }
  }, [items, marginMm, rotation, t]);

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 p-4">
      <p className="text-sm font-medium text-foreground">{t("intro")}</p>
      <p className="text-sm text-muted-foreground">{t("privacyNote")}</p>
      <p className="text-xs text-muted-foreground">{t("orderHint")}</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,.jpg,.jpeg,.jpe"
        multiple
        className="hidden"
        onChange={onFileChange}
      />

      <div className="space-y-3 rounded-md border border-border bg-card p-4">
        <div className="space-y-2">
          <Label htmlFor="jpg-pdf-rotation">{t("rotationLabel")}</Label>
          <Select value={rotation} onValueChange={setRotation}>
            <SelectTrigger id="jpg-pdf-rotation" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">{t("rotation0")}</SelectItem>
              <SelectItem value="90">{t("rotation90")}</SelectItem>
              <SelectItem value="180">{t("rotation180")}</SelectItem>
              <SelectItem value="270">{t("rotation270")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="jpg-pdf-margin">{t("marginLabel")}</Label>
            <span className="text-xs tabular-nums text-muted-foreground">
              {t("marginValue", { mm: marginMm })}
            </span>
          </div>
          <Slider
            id="jpg-pdf-margin"
            min={0}
            max={30}
            step={1}
            value={[marginMm]}
            onValueChange={(v) => setMarginMm(v[0] ?? 0)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="default" disabled={busy} onClick={onPickFiles}>
          <Upload className="mr-2 size-4" />
          {t("addImages")}
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
                <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="truncate font-medium">{item.name}</div>
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
          disabled={busy || items.length < 1}
          onClick={() => void buildAndDownload()}
        >
          <Download className="mr-2 size-4" />
          {busy ? t("building") : t("downloadPdf")}
        </Button>
      </div>
    </div>
  );
}
