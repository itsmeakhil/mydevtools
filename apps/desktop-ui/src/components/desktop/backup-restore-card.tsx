"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { DatabaseBackup } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { downloadBackup, importBackup } from "@/lib/desktop/backup";
import { isDesktop } from "@/lib/desktop/is-desktop";

/**
 * Backup & restore card for the settings page: export the local store as an
 * encrypted file, or merge a previously exported backup back in. Restored
 * vault entries stay encrypted under the master password in use when the
 * backup was made. Desktop-only — renders nothing on web.
 */
export function BackupRestoreCard() {
  const t = useTranslations("SettingsPage.backup");
  const [exportPassphrase, setExportPassphrase] = useState("");
  const [exporting, setExporting] = useState(false);
  const [restorePassphrase, setRestorePassphrase] = useState("");
  const [fileText, setFileText] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [restoring, setRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isDesktop()) return null;

  const handleExport = async () => {
    if (exportPassphrase.length < 8) {
      toast.error(t("passphraseTooShort"));
      return;
    }
    setExporting(true);
    try {
      await downloadBackup(exportPassphrase);
      toast.success(t("exportSuccess"));
    } catch {
      toast.error(t("exportError"));
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setFileText(await file.text());
      setFileName(file.name);
    } catch {
      toast.error(t("restoreError"));
    }
  };

  const handleRestore = async () => {
    if (!fileText) return;
    setRestoring(true);
    try {
      await importBackup(restorePassphrase, fileText);
      toast.success(t("restoreSuccess"));
      // Reload so every store re-fetches the merged data.
      setTimeout(() => window.location.reload(), 800);
    } catch {
      toast.error(t("restoreError"));
      setRestoring(false);
    }
  };

  return (
    <Card className="rounded-2xl border border-border/60 bg-card/60 shadow-sm backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-violet-500/10 text-primary ring-1 ring-inset ring-border/50">
            <DatabaseBackup className="h-4 w-4" />
          </span>
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{t("exportHint")}</p>
          <div className="flex gap-2">
            <Input
              type="password"
              value={exportPassphrase}
              onChange={(e) => setExportPassphrase(e.target.value)}
              placeholder={t("passphrasePlaceholder")}
              disabled={exporting}
            />
            <Button
              variant="secondary"
              onClick={handleExport}
              disabled={exporting}
              className="shrink-0"
            >
              {t("exportButton")}
            </Button>
          </div>
        </div>

        <div className="space-y-2 border-t border-border/60 pt-4">
          <p className="text-xs text-muted-foreground">{t("restoreHint")}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleFileSelect}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={restoring}
              className="shrink-0"
            >
              {fileName || t("chooseFile")}
            </Button>
            <Input
              type="password"
              value={restorePassphrase}
              onChange={(e) => setRestorePassphrase(e.target.value)}
              placeholder={t("passphrasePlaceholder")}
              disabled={restoring}
              className="min-w-40 flex-1"
            />
            <Button
              onClick={handleRestore}
              disabled={!fileText || !restorePassphrase || restoring}
              className="shrink-0"
            >
              {restoring ? t("restoring") : t("restoreButton")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
