"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getDocument,
  GlobalWorkerOptions,
  version,
} from "pdfjs-dist";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  buildLineDiffRows,
  countDiffRows,
  DIFF_MAX_INPUT_CHARS,
  DIFF_MAX_ROWS,
} from "@/lib/text-diff";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/components/hooks/use-mobile";

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

async function extractTextFromPdf(bytes: Uint8Array): Promise<string> {
  ensurePdfWorker();
  const data = bytes.slice();
  const pdf = await getDocument({ data }).promise;
  try {
    const chunks: string[] = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const parts: string[] = [];
      for (const item of content.items) {
        if ("str" in item && item.str) {
          parts.push(item.str);
          if (item.hasEOL) parts.push("\n");
        }
      }
      chunks.push(`--- Page ${p} ---\n${parts.join("")}`);
    }
    return chunks.join("\n\n");
  } finally {
    await pdf.destroy();
  }
}

function rowBg(kind: string) {
  if (kind === "removed") return "bg-rose-500/12 dark:bg-rose-500/20";
  if (kind === "added") return "bg-emerald-500/12 dark:bg-emerald-500/20";
  return "bg-transparent";
}

type Slot = { name: string; bytes: Uint8Array } | null;

export function PdfComparePanel() {
  const t = useTranslations("PdfCompare");
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<"files" | "diff">("files");
  const [left, setLeft] = useState<Slot>(null);
  const [right, setRight] = useState<Slot>(null);
  const [leftText, setLeftText] = useState("");
  const [rightText, setRightText] = useState("");
  const [busy, setBusy] = useState(false);
  const leftInputRef = useRef<HTMLInputElement>(null);
  const rightInputRef = useRef<HTMLInputElement>(null);

  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const syncLock = useRef(false);

  const syncScroll = useCallback((source: "left" | "right", scrollTop: number) => {
    if (syncLock.current) return;
    syncLock.current = true;
    const other = source === "left" ? rightScrollRef.current : leftScrollRef.current;
    if (other) other.scrollTop = scrollTop;
    requestAnimationFrame(() => {
      syncLock.current = false;
    });
  }, []);

  useEffect(() => {
    if (!left?.bytes || !right?.bytes) {
      setLeftText("");
      setRightText("");
      return;
    }

    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        const [a, b] = await Promise.all([
          extractTextFromPdf(left.bytes),
          extractTextFromPdf(right.bytes),
        ]);
        if (cancelled) return;
        setLeftText(a);
        setRightText(b);
        const emptyish = (s: string) => s.replace(/\s/g, "").length < 8;
        if (emptyish(a) || emptyish(b)) {
          toast.message(t("noTextHint"));
        }
      } catch (e: unknown) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "";
        if (msg.includes("Password") || msg.includes("password")) {
          toast.error(t("passwordRequired"));
        } else {
          toast.error(t("genericError"));
        }
        setLeftText("");
        setRightText("");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [left, right, t]);

  const overLimit =
    leftText.length > DIFF_MAX_INPUT_CHARS || rightText.length > DIFF_MAX_INPUT_CHARS;

  const { rows, truncated, stats } = useMemo(() => {
    if (!leftText && !rightText) {
      return { rows: [], truncated: false, stats: { added: 0, removed: 0 } };
    }
    if (overLimit) {
      return { rows: [], truncated: false, stats: { added: 0, removed: 0 } };
    }
    const all = buildLineDiffRows(leftText, rightText);
    const statsFull = countDiffRows(all);
    const truncatedInner = all.length > DIFF_MAX_ROWS;
    const slice = truncatedInner ? all.slice(0, DIFF_MAX_ROWS) : all;
    return {
      rows: slice,
      truncated: truncatedInner,
      stats: statsFull,
    };
  }, [leftText, rightText, overLimit]);

  const onFile =
    (side: "left" | "right") =>
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      const input = side === "left" ? leftInputRef.current : rightInputRef.current;
      if (!file) {
        if (input) input.value = "";
        return;
      }
      if (!looksLikePdf(file)) {
        toast.error(t("invalidPdf"));
        if (input) input.value = "";
        return;
      }
      try {
        ensurePdfWorker();
        const bytes = new Uint8Array(await file.arrayBuffer());
        await getDocument({ data: bytes.slice() }).promise;
        const slot = { name: file.name, bytes };
        if (side === "left") setLeft(slot);
        else setRight(slot);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("Password") || msg.includes("password")) {
          toast.error(t("passwordRequired"));
        } else {
          toast.error(t("invalidPdf"));
        }
      }
      if (input) input.value = "";
    };

  const clearAll = () => {
    setLeft(null);
    setRight(null);
    setLeftText("");
    setRightText("");
    if (leftInputRef.current) leftInputRef.current.value = "";
    if (rightInputRef.current) rightInputRef.current.value = "";
  };

  const statsBadge = !overLimit && rows.length > 0 && (
    <span className="text-muted-foreground">
      <span className="text-emerald-600 dark:text-emerald-400 font-medium tabular-nums">
        +{stats.added}
      </span>
      {" · "}
      <span className="text-rose-600 dark:text-rose-400 font-medium tabular-nums">
        −{stats.removed}
      </span>
    </span>
  );

  const diffPanel = (
    <Card className="flex flex-col flex-1 min-h-[280px] overflow-hidden p-0">
      <div className="px-3 py-2 border-b border-border/50 bg-muted/30 shrink-0 flex items-center justify-between gap-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t("comparisonLabel")}
        </Label>
        {statsBadge}
      </div>
      <div className="flex flex-col md:flex-row flex-1 min-h-0 divide-y md:divide-y-0 md:divide-x divide-border">
        <div
          ref={leftScrollRef}
          onScroll={(e) => syncScroll("left", e.currentTarget.scrollTop)}
          className="flex-1 min-w-0 overflow-auto font-mono text-xs leading-5"
        >
          {rows.map((row, i) => (
            <div
              key={`l-${i}`}
              className={cn(
                "flex border-b border-border/30",
                rowBg(row.kind === "added" ? "equal" : row.kind)
              )}
            >
              <span className="w-9 shrink-0 select-none text-right pr-2 py-0.5 text-muted-foreground/60 border-r border-border/30 bg-muted/20 tabular-nums">
                {i + 1}
              </span>
              <pre className="flex-1 py-0.5 pl-2 pr-2 whitespace-pre-wrap break-all m-0 bg-transparent">
                {row.left === "" ? "\u00a0" : row.left}
              </pre>
            </div>
          ))}
          {!overLimit && rows.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">{t("emptyState")}</p>
          )}
        </div>
        <div
          ref={rightScrollRef}
          onScroll={(e) => syncScroll("right", e.currentTarget.scrollTop)}
          className="flex-1 min-w-0 overflow-auto font-mono text-xs leading-5"
        >
          {rows.map((row, i) => (
            <div
              key={`r-${i}`}
              className={cn(
                "flex border-b border-border/30",
                rowBg(row.kind === "removed" ? "equal" : row.kind)
              )}
            >
              <span className="w-9 shrink-0 select-none text-right pr-2 py-0.5 text-muted-foreground/60 border-r border-border/30 bg-muted/20 tabular-nums">
                {i + 1}
              </span>
              <pre className="flex-1 py-0.5 pl-2 pr-2 whitespace-pre-wrap break-all m-0 bg-transparent">
                {row.right === "" ? "\u00a0" : row.right}
              </pre>
            </div>
          ))}
          {!overLimit && rows.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">{t("emptyState")}</p>
          )}
        </div>
      </div>
    </Card>
  );

  const fileSlot = (
    side: "left" | "right",
    label: string,
    slot: Slot,
    inputRef: React.RefObject<HTMLInputElement | null>
  ) => (
    <Card className="flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-border/50 bg-muted/30 flex items-center justify-between gap-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </Label>
        {slot && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              if (side === "left") {
                setLeft(null);
                if (inputRef.current) inputRef.current.value = "";
              } else {
                setRight(null);
                if (inputRef.current) inputRef.current.value = "";
              }
            }}
          >
            {t("removeFile")}
          </Button>
        )}
      </div>
      <div className="p-4 flex flex-col gap-3 min-h-[120px]">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={onFile(side)}
        />
        {slot ? (
          <div className="flex items-start gap-2 text-sm">
            <FileText className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
            <span className="break-all font-medium">{slot.name}</span>
          </div>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit gap-1"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <Upload className="h-3.5 w-3.5" />
          {t("chooseFile")}
        </Button>
      </div>
    </Card>
  );

  return (
    <div className="flex flex-col gap-4 w-full max-w-6xl mx-auto px-2 md:px-0 py-2 min-h-0">
      <p className="text-xs text-muted-foreground">{t("privacyNote")}</p>

      <div className="flex flex-wrap items-center gap-3 text-xs shrink-0">
        {busy && <span className="text-muted-foreground">{t("extracting")}</span>}
        {truncated && (
          <span className="text-amber-600 dark:text-amber-400">
            {t("truncatedWarning", { max: DIFF_MAX_ROWS.toLocaleString() })}
          </span>
        )}
        {overLimit && (
          <span className="text-destructive">
            {t("limitExceeded", { max: DIFF_MAX_INPUT_CHARS.toLocaleString() })}
          </span>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1 ml-auto"
          onClick={clearAll}
        >
          <Trash2 className="h-3 w-3" />
          {t("clearAll")}
        </Button>
      </div>

      {isMobile ? (
        <>
          <div className="flex shrink-0 rounded-lg border bg-muted/40 p-1 gap-1">
            <button
              type="button"
              onClick={() => setMobileTab("files")}
              className={`flex-1 rounded-md px-2 py-2 text-sm font-medium transition-all ${
                mobileTab === "files"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("mobileTabFiles")}
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("diff")}
              className={`flex-1 rounded-md px-2 py-2 text-sm font-medium transition-all ${
                mobileTab === "diff"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("mobileTabDiff")}
            </button>
          </div>
          <div className="flex-1 min-h-0 flex flex-col gap-4">
            {mobileTab === "files" && (
              <div className="grid gap-4">
                {fileSlot("left", t("firstPdf"), left, leftInputRef)}
                {fileSlot("right", t("secondPdf"), right, rightInputRef)}
              </div>
            )}
            {mobileTab === "diff" && diffPanel}
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0">
            {fileSlot("left", t("firstPdf"), left, leftInputRef)}
            {fileSlot("right", t("secondPdf"), right, rightInputRef)}
          </div>
          {diffPanel}
        </>
      )}
    </div>
  );
}
