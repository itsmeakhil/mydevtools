"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function cellToString(v: unknown): string {
  if (v == null || v === "") return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function sheetToStringMatrix(ws: import("xlsx").WorkSheet, XLSX: typeof import("xlsx")): string[][] {
  const data = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    raw: false,
    defval: "",
  }) as unknown[][];

  if (!data.length) return [];

  const maxCols = Math.max(
    1,
    ...data.map((r) => (Array.isArray(r) ? r.length : 0))
  );

  const rows = data
    .filter(Array.isArray)
    .map((r) =>
      Array.from({ length: maxCols }, (_, i) =>
        cellToString((r as unknown[])[i])
      )
    );

  while (rows.length && rows[rows.length - 1]!.every((c) => !c.trim())) {
    rows.pop();
  }

  if (!rows.length) return [];

  let colEnd = maxCols;
  while (colEnd > 0 && rows.every((r) => !String(r[colEnd - 1]).trim())) {
    colEnd -= 1;
  }
  if (colEnd < maxCols) {
    return rows.map((r) => r.slice(0, colEnd));
  }
  return rows;
}

function looksLikeExcel(file: File): boolean {
  const n = file.name.toLowerCase();
  return (
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel" ||
    n.endsWith(".xlsx") ||
    n.endsWith(".xls")
  );
}

function baseName(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}

export function ExcelToPdfPanel() {
  const t = useTranslations("ExcelToPdf");
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sheetMode, setSheetMode] = useState<string>("all");
  const [busy, setBusy] = useState(false);

  const onPick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (inputRef.current) inputRef.current.value = "";
      if (!f) return;
      if (!looksLikeExcel(f)) {
        toast.error(t("unsupportedFile"));
        return;
      }
      setFile(f);
    },
    [t]
  );

  const clearFile = useCallback(() => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const buildAndDownload = useCallback(async () => {
    if (!file) {
      toast.error(t("noFile"));
      return;
    }

    setBusy(true);
    try {
      const [XLSX, { jsPDF }, { default: autoTable }] = await Promise.all([
        import("xlsx"),
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const buf = await file.arrayBuffer();
      let wb: import("xlsx").WorkBook;
      try {
        wb = XLSX.read(buf, { type: "array", cellDates: true });
      } catch {
        toast.error(t("readFailed"));
        return;
      }

      const names =
        sheetMode === "first"
          ? wb.SheetNames.slice(0, 1)
          : [...wb.SheetNames];

      if (!names.length) {
        toast.error(t("emptyWorkbook"));
        return;
      }

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      let firstPage = true;
      let anyTable = false;

      for (const sheetName of names) {
        const ws = wb.Sheets[sheetName];
        if (!ws) continue;
        const matrix = sheetToStringMatrix(ws, XLSX);
        if (!matrix.length) continue;

        const headRow = matrix[0] ?? [];
        const bodyRows = matrix.slice(1);

        if (!firstPage) doc.addPage();
        firstPage = false;

        doc.setFontSize(11);
        doc.text(t("sheetHeading", { name: sheetName }), 14, 12);

        autoTable(doc, {
          startY: 16,
          head: [headRow],
          body: bodyRows.length ? bodyRows : [],
          theme: "grid",
          styles: { fontSize: 7, cellPadding: 1.2, overflow: "linebreak" },
          headStyles: { fillColor: [55, 55, 55], fontStyle: "bold" },
          showHead: "everyPage",
          horizontalPageBreak: true,
          margin: { top: 16, right: 10, bottom: 12, left: 10 },
        });
        anyTable = true;
      }

      if (!anyTable) {
        toast.error(t("emptyWorkbook"));
        return;
      }

      const out = doc.output("arraybuffer");
      const bytes = new Uint8Array(out);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${baseName(file.name)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("buildFailed"));
    } finally {
      setBusy(false);
    }
  }, [file, sheetMode, t]);

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 p-4">
      <p className="text-sm font-medium text-foreground">{t("intro")}</p>
      <p className="text-sm text-muted-foreground">{t("privacyNote")}</p>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={onFileChange}
      />

      <div className="space-y-3 rounded-md border border-border bg-card p-4">
        <div className="space-y-2">
          <Label htmlFor="excel-pdf-sheets">{t("includeSheets")}</Label>
          <Select value={sheetMode} onValueChange={setSheetMode}>
            <SelectTrigger id="excel-pdf-sheets" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allSheets")}</SelectItem>
              <SelectItem value="first">{t("firstSheetOnly")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="default" disabled={busy} onClick={onPick}>
          <Upload className="mr-2 size-4" />
          {t("chooseFile")}
        </Button>
        {file && (
          <Button type="button" variant="outline" disabled={busy} onClick={clearFile}>
            {t("clearFile")}
          </Button>
        )}
      </div>

      {file && (
        <div className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-card p-3 text-sm">
          <FileSpreadsheet className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">{file.name}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          type="button"
          disabled={busy || !file}
          onClick={() => void buildAndDownload()}
        >
          <Download className="mr-2 size-4" />
          {busy ? t("building") : t("downloadPdf")}
        </Button>
      </div>
    </div>
  );
}
