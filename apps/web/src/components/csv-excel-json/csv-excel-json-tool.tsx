"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  IconCopy,
  IconDownload,
  IconFileSpreadsheet,
  IconFileTypeCsv,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ToolHeader } from "@/components/tools/tool-header";
import { ToolWrapper } from "@/components/tools/tool-wrapper";
import { cn } from "@/lib/utils";
import {
  csvTextToRows,
  excelBufferToRows,
  parseJsonToRows,
  rowsToCSV,
  rowsToXlsxFile,
  triggerDownload,
} from "@/lib/csv-excel-json-utils";

const SAMPLE_JSON = `[
  { "name": "Ada", "role": "Engineer", "joined": "2024-01-15" },
  { "name": "Lin", "role": "Designer", "joined": "2024-06-01" }
]`;

export function CsvExcelJsonTool() {
  const t = useTranslations("CsvExcelJson");
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const applyRows = useCallback((rows: Record<string, unknown>[]) => {
    setJsonText(JSON.stringify(rows, null, 2));
    setError(null);
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      const name = file.name.toLowerCase();
      try {
        if (name.endsWith(".csv")) {
          const text = await file.text();
          const rows = csvTextToRows(text);
          applyRows(rows);
          toast.success(t("toastLoadedCsv"));
          return;
        }
        if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
          const buf = await file.arrayBuffer();
          const rows = await excelBufferToRows(buf);
          applyRows(rows);
          toast.success(t("toastLoadedExcel"));
          return;
        }
        toast.error(t("errors.unsupportedFile"));
      } catch (e) {
        const msg = e instanceof Error ? e.message : t("errors.parseFailed");
        setError(msg);
        toast.error(msg);
      }
    },
    [applyRows, t]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) void handleFile(f);
    },
    [handleFile]
  );

  const formatJson = () => {
    setError(null);
    try {
      const rows = parseJsonToRows(jsonText);
      setJsonText(JSON.stringify(rows, null, 2));
      toast.success(t("toastFormatted"));
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("errors.invalidJson");
      setError(msg);
      toast.error(msg);
    }
  };

  const downloadCsv = async () => {
    setError(null);
    try {
      const rows = parseJsonToRows(jsonText);
      const csv = rowsToCSV(rows);
      triggerDownload(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
        t("filenames.csv")
      );
      toast.success(t("toastExportedCsv"));
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("errors.exportFailed");
      setError(msg);
      toast.error(msg);
    }
  };

  const downloadXlsx = async () => {
    setError(null);
    try {
      const rows = parseJsonToRows(jsonText);
      await rowsToXlsxFile(rows, t("sheetName"), t("filenames.xlsx"));
      toast.success(t("toastExportedXlsx"));
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("errors.exportFailed");
      setError(msg);
      toast.error(msg);
    }
  };

  const copyJson = async () => {
    if (!jsonText.trim()) return;
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(t("toastCopied"));
    } catch {
      toast.error(t("errors.copyFailed"));
    }
  };

  const loadSample = () => {
    setJsonText(SAMPLE_JSON);
    setError(null);
  };

  return (
    <ToolWrapper toolId="csv-excel-json" maxWidth="5xl">
      <Card className="border-border/60 shadow-sm">
        <ToolHeader
          title={t("title")}
          description={t("subtitle")}
          toolId="csv-excel-json"
        />
        <CardContent className="space-y-6 pt-2">
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileRef.current?.click();
              }
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragOver(false);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className={cn(
              "rounded-xl border-2 border-dashed p-8 text-center transition-colors",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 bg-muted/20"
            )}
          >
            <IconFileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium mb-1">{t("dropTitle")}</p>
            <p className="text-xs text-muted-foreground mb-4">
              {t("dropHint")}
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              onClick={() => fileRef.current?.click()}
            >
              <IconUpload className="h-4 w-4" />
              {t("chooseFile")}
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="csv-json-textarea">{t("jsonLabel")}</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={loadSample}
              >
                {t("loadSample")}
              </Button>
            </div>
            <Textarea
              id="csv-json-textarea"
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setError(null);
              }}
              placeholder={t("jsonPlaceholder")}
              className="min-h-[220px] font-mono text-sm"
              spellCheck={false}
            />
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={formatJson}>
              {t("actions.format")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setJsonText("");
                setError(null);
              }}
            >
              <IconTrash className="h-4 w-4 mr-1.5" />
              {t("actions.clear")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={copyJson}>
              <IconCopy className="h-4 w-4 mr-1.5" />
              {copied ? t("actions.copied") : t("actions.copy")}
            </Button>
            <Button type="button" variant="default" size="sm" onClick={downloadCsv}>
              <IconFileTypeCsv className="h-4 w-4 mr-1.5" />
              {t("actions.downloadCsv")}
            </Button>
            <Button type="button" variant="default" size="sm" onClick={downloadXlsx}>
              <IconDownload className="h-4 w-4 mr-1.5" />
              {t("actions.downloadXlsx")}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {t("footnote")}
          </p>
        </CardContent>
      </Card>
    </ToolWrapper>
  );
}
