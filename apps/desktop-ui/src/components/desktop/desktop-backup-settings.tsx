"use client";

import { useRef, useState } from "react";
import { DownloadCloud, HardDriveDownload, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isDesktop } from "@/lib/desktop/is-desktop";

function todayStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Desktop-only Backup & recovery card. Your data lives only on this Mac, so an
 * encrypted backup file is the safety net against losing the app, the keychain,
 * or the disk. Renders nothing on web.
 */
export function DesktopBackupSettings() {
  const [backupOpen, setBackupOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Backup dialog state
  const [pass1, setPass1] = useState("");
  const [pass2, setPass2] = useState("");

  // Restore dialog state
  const [restorePass, setRestorePass] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  if (!isDesktop()) return null;

  const resetBackup = () => {
    setPass1("");
    setPass2("");
  };
  const resetRestore = () => {
    setRestorePass("");
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
  };

  const doBackup = async () => {
    if (pass1 !== pass2) {
      toast.error("The two passphrases don't match");
      return;
    }
    setBusy(true);
    try {
      const { exportBackup } = await import("@/lib/desktop/backup");
      const blob = await exportBackup(pass1);
      saveBlob(blob, `mydevtools-backup-${todayStamp()}.json`);
      toast.success("Backup downloaded. Store it somewhere safe.");
      setBackupOpen(false);
      resetBackup();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backup failed");
    } finally {
      setBusy(false);
    }
  };

  const doRestore = async () => {
    if (!file) {
      toast.error("Choose a backup file first");
      return;
    }
    setBusy(true);
    try {
      const text = await file.text();
      const { importBackup, hasConfiguredVault } = await import("@/lib/desktop/backup");
      if (await hasConfiguredVault()) {
        const ok = window.confirm(
          "This Mac already has a master password set up. Restoring keeps your " +
            "current master password — entries from the backup will only open if " +
            "they were encrypted with that same password. Continue?"
        );
        if (!ok) {
          setBusy(false);
          return;
        }
      }
      const { imported } = await importBackup(restorePass, text);
      toast.success(`Restored ${imported} item${imported === 1 ? "" : "s"}.`);
      setRestoreOpen(false);
      resetRestore();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="rounded-2xl border border-border/60 bg-card/60 shadow-sm backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5">
          <HardDriveDownload className="h-5 w-5" />
          Backup &amp; recovery
        </CardTitle>
        <CardDescription>
          Your data lives only on this Mac. Download an encrypted backup so you
          can recover it on a new machine — or if this one is lost, reset, or its
          keychain is wiped. The backup is protected by its own passphrase and
          works even without Cloud Sync.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2.5">
        <Button onClick={() => setBackupOpen(true)}>
          <DownloadCloud className="mr-2 h-4 w-4" />
          Download a backup
        </Button>
        <Button variant="outline" onClick={() => setRestoreOpen(true)}>
          <HardDriveDownload className="mr-2 h-4 w-4" />
          Restore from a backup
        </Button>
      </CardContent>

      {/* Backup dialog */}
      <Dialog
        open={backupOpen}
        onOpenChange={(o) => {
          setBackupOpen(o);
          if (!o) resetBackup();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Download a backup</DialogTitle>
            <DialogDescription>
              Choose a passphrase to encrypt this backup. You&apos;ll need it to
              restore — it can&apos;t be recovered if you forget it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="backup-pass1">Backup passphrase</Label>
              <Input
                id="backup-pass1"
                type="password"
                autoComplete="new-password"
                value={pass1}
                onChange={(e) => setPass1(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="backup-pass2">Confirm passphrase</Label>
              <Input
                id="backup-pass2"
                type="password"
                autoComplete="new-password"
                value={pass2}
                onChange={(e) => setPass2(e.target.value)}
              />
            </div>
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              Anyone with this file and its passphrase can read your data. Store
              both safely.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => void doBackup()}
              disabled={busy || pass1.length < 8 || pass2.length < 8}
            >
              {busy ? "Encrypting…" : "Download"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore dialog */}
      <Dialog
        open={restoreOpen}
        onOpenChange={(o) => {
          setRestoreOpen(o);
          if (!o) resetRestore();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore from a backup</DialogTitle>
            <DialogDescription>
              Pick a backup file and enter the passphrase it was created with.
              Restored items merge into what&apos;s already here.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="restore-file">Backup file</Label>
              <Input
                id="restore-file"
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="restore-pass">Backup passphrase</Label>
              <Input
                id="restore-pass"
                type="password"
                autoComplete="off"
                value={restorePass}
                onChange={(e) => setRestorePass(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => void doRestore()}
              disabled={busy || !file || restorePass.length < 8}
            >
              {busy ? "Restoring…" : "Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
