"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FileText, Eye, EyeOff, Printer, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.Editor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground bg-muted/10 rounded-md">
        Loading editor…
      </div>
    ),
  }
);

const EDITOR_OPTIONS = {
  minimap: { enabled: false },
  fontSize: 13,
  lineNumbers: "on" as const,
  glyphMargin: false,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  insertSpaces: true,
  wordWrap: "on" as const,
};

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body {
      font-family: Georgia, serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 24px;
      color: #1a1a1a;
      line-height: 1.6;
    }
    h1 { font-size: 2rem; border-bottom: 2px solid #333; padding-bottom: 8px; }
    h2 { font-size: 1.4rem; margin-top: 2rem; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
    th { background: #f4f4f4; font-weight: 600; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
    blockquote { border-left: 4px solid #999; margin: 0; padding: 4px 16px; color: #555; }
  </style>
</head>
<body>
  <h1>HTML to PDF Example</h1>
  <p>Edit this HTML on the left and click <strong>Print / Save as PDF</strong> to download.</p>

  <h2>Features</h2>
  <ul>
    <li>Full CSS support — flexbox, grid, custom fonts</li>
    <li>Tables, images, and complex layouts</li>
    <li>Runs entirely in your browser</li>
  </ul>

  <h2>Sample Table</h2>
  <table>
    <thead>
      <tr><th>Name</th><th>Role</th><th>Status</th></tr>
    </thead>
    <tbody>
      <tr><td>Alice</td><td>Engineer</td><td>Active</td></tr>
      <tr><td>Bob</td><td>Designer</td><td>Active</td></tr>
      <tr><td>Carol</td><td>Manager</td><td>On leave</td></tr>
    </tbody>
  </table>

  <blockquote>Tip: use <code>@media print</code> CSS to fine-tune the PDF layout.</blockquote>
</body>
</html>`;

type PageSize = "a4" | "letter" | "legal" | "a3";

const PAGE_SIZES: Record<PageSize, { width: string; height: string }> = {
  a4: { width: "210mm", height: "297mm" },
  letter: { width: "216mm", height: "279mm" },
  legal: { width: "216mm", height: "356mm" },
  a3: { width: "297mm", height: "420mm" },
};

export function HtmlToPdfPanel() {
  const t = useTranslations("HtmlToPdf");
  const { resolvedTheme } = useTheme();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [showPreview, setShowPreview] = useState(true);

  const printAsPdf = useCallback(() => {
    const { width, height } = PAGE_SIZES[pageSize];
    const printStyles = `
      @page { size: ${width} ${height}; margin: 0; }
      @media print { html, body { width: ${width}; } }
    `;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      toast.error(t("popupBlocked"));
      return;
    }
    const injected = html.includes("</head>")
      ? html.replace("</head>", `<style>${printStyles}</style></head>`)
      : `<style>${printStyles}</style>${html}`;
    win.document.write(injected);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 300);
  }, [html, pageSize, t]);

  const reset = useCallback(() => {
    setHtml(DEFAULT_HTML);
    setPageSize("a4");
  }, []);

  return (
    <div className="flex flex-col gap-4 w-full h-full p-4">
      <p className="text-sm text-muted-foreground">{t("hint")}</p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label htmlFor="page-size">{t("pageSizeLabel")}</Label>
          <Select value={pageSize} onValueChange={(v) => setPageSize(v as PageSize)}>
            <SelectTrigger id="page-size" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a4">A4</SelectItem>
              <SelectItem value="letter">Letter</SelectItem>
              <SelectItem value="legal">Legal</SelectItem>
              <SelectItem value="a3">A3</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="button" onClick={printAsPdf}>
          <Printer className="mr-2 size-4" />
          {t("printButton")}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => setShowPreview((p) => !p)}
        >
          {showPreview ? (
            <>
              <EyeOff className="mr-2 size-4" />
              {t("hidePreview")}
            </>
          ) : (
            <>
              <Eye className="mr-2 size-4" />
              {t("showPreview")}
            </>
          )}
        </Button>

        <Button type="button" variant="ghost" size="sm" onClick={reset}>
          <RotateCcw className="mr-2 size-4" />
          {t("reset")}
        </Button>
      </div>

      <div
        className={`grid gap-4 flex-1 min-h-0 ${showPreview ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}
        style={{ height: "calc(100vh - 220px)", minHeight: "400px" }}
      >
        <div className="flex flex-col gap-1 min-h-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <FileText className="size-3.5" />
            {t("editorLabel")}
          </div>
          <div className="flex-1 rounded-md border overflow-hidden">
            <MonacoEditor
              height="100%"
              language="html"
              theme={resolvedTheme === "dark" ? "vs-dark" : "vs"}
              value={html}
              onChange={(v) => setHtml(v ?? "")}
              options={EDITOR_OPTIONS}
            />
          </div>
        </div>

        {showPreview && (
          <div className="flex flex-col gap-1 min-h-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Eye className="size-3.5" />
              {t("previewLabel")}
            </div>
            <iframe
              ref={iframeRef}
              sandbox="allow-same-origin allow-popups"
              className="flex-1 rounded-md border bg-white"
              srcDoc={html}
              title="HTML preview"
            />
          </div>
        )}
      </div>
    </div>
  );
}
