"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { downloadBackup } from "@/lib/desktop/backup";
import { localApi } from "@/lib/desktop/bridge";
import { isDesktop } from "@/lib/desktop/is-desktop";

/**
 * Webview databases that may exist even when `indexedDB.databases()` is
 * unsupported; the reset deletes the union of this list and whatever the
 * browser enumerates.
 */
const KNOWN_IDB_NAMES = ["PasswordManagerDB", "MasterKeyDB", "mdt-api-client-cache", "todo-app"];

function deleteIdb(name: string): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
}

/**
 * Best-effort webview cleanup before relaunch. Raced against a short timeout
 * so a blocked IndexedDB delete can never hang the restart — leftovers are
 * orphaned cache anyway (their backing rows are already gone).
 */
async function clearWebviewStorage(): Promise<void> {
  localStorage.clear();
  sessionStorage.clear();
  document.cookie = "NEXT_LOCALE=; path=/; max-age=0";
  let names = KNOWN_IDB_NAMES;
  try {
    const dbs = await indexedDB.databases?.();
    if (dbs) {
      const found = dbs.map((d) => d.name).filter((n): n is string => Boolean(n));
      names = [...new Set([...KNOWN_IDB_NAMES, ...found])];
    }
  } catch {
    // enumeration unsupported — the fixed list covers everything we create
  }
  await Promise.race([
    Promise.all(names.map(deleteIdb)),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);
}

/**
 * Danger-zone card for the settings page: factory data reset. Wipes the local
 * store (Rust side: DB files + Keychain device key), clears webview storage,
 * and relaunches into a fresh onboarding. Desktop-only — renders nothing on web.
 */
export function FactoryResetCard() {
  const t = useTranslations("SettingsPage.dangerZone");
  const [open, setOpen] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!isDesktop()) return null;

  const handleExport = async () => {
    if (passphrase.length < 8) {
      toast.error(t("passphraseTooShort"));
      return;
    }
    setExporting(true);
    try {
      await downloadBackup(passphrase);
      toast.success(t("exportSuccess"));
    } catch {
      toast.error(t("exportError"));
    } finally {
      setExporting(false);
    }
  };

  const handleReset = async () => {
    setBusy(true);
    try {
      const res = await localApi("POST", "/desktop/factory-reset");
      if (res.status !== 200) throw new Error(`factory reset failed (${res.status})`);
      await clearWebviewStorage();
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch {
      toast.error(t("resetError"));
      setBusy(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (busy) return;
    setOpen(next);
    if (!next) {
      setPassphrase("");
      setAcknowledged(false);
    }
  };

  return (
    <Card className="rounded-2xl border border-destructive/50 bg-destructive/5 shadow-sm backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/30">
            <TriangleAlert className="h-4 w-4" />
          </span>
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          {t("resetButton")}
        </Button>

        <AlertDialog open={open} onOpenChange={handleOpenChange}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("dialogTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("dialogWarning")}</AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4">
              <div className="space-y-2 rounded-lg border border-border/60 bg-card/60 p-3">
                <p className="text-xs text-muted-foreground">{t("exportHint")}</p>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder={t("passphrasePlaceholder")}
                    disabled={exporting || busy}
                  />
                  <Button
                    variant="secondary"
                    onClick={handleExport}
                    disabled={exporting || busy}
                    className="shrink-0"
                  >
                    {t("exportButton")}
                  </Button>
                </div>
              </div>

              <label className="flex items-start gap-2.5 text-sm">
                <Checkbox
                  checked={acknowledged}
                  onCheckedChange={(v) => setAcknowledged(v === true)}
                  disabled={busy}
                  className="mt-0.5"
                />
                <span>{t("confirmCheckbox")}</span>
              </label>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>{t("cancel")}</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={handleReset}
                disabled={!acknowledged || busy}
              >
                {busy ? t("resetting") : t("confirmButton")}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
