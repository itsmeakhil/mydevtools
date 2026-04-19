"use client";

import { useCallback, useRef, useState } from "react";
import { decryptPDF, isEncrypted } from "@pdfsmaller/pdf-decrypt";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Upload, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function looksLikePdf(file: File): boolean {
  const n = file.name.toLowerCase();
  return file.type === "application/pdf" || n.endsWith(".pdf");
}

export function PdfUnlockerPanel() {
  const t = useTranslations("PdfUnlocker");
  const inputRef = useRef<HTMLInputElement>(null);
  const unlockJustSucceededRef = useRef(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pendingBytes, setPendingBytes] = useState<Uint8Array | null>(null);
  const [unlockedBytes, setUnlockedBytes] = useState<Uint8Array | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = useCallback(() => {
    unlockJustSucceededRef.current = false;
    setFileName(null);
    setPendingBytes(null);
    setUnlockedBytes(null);
    setPassword("");
    setPasswordOpen(false);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const onPickFile = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!looksLikePdf(file)) {
        toast.error(t("invalidPdf"));
        return;
      }

      setBusy(true);
      try {
        const buf = new Uint8Array(await file.arrayBuffer());
        const enc = await isEncrypted(buf);
        setFileName(file.name);
        setUnlockedBytes(null);
        setPassword("");
        if (enc.encrypted) {
          setPendingBytes(buf);
          setPasswordOpen(true);
        } else {
          setPendingBytes(null);
          setUnlockedBytes(buf);
        }
      } catch {
        toast.error(t("invalidPdf"));
        reset();
      } finally {
        setBusy(false);
      }
    },
    [reset, t]
  );

  const tryUnlock = useCallback(async () => {
    if (!pendingBytes) return;
    setBusy(true);
    try {
      const out = await decryptPDF(pendingBytes, password);
      unlockJustSucceededRef.current = true;
      setUnlockedBytes(out);
      setPendingBytes(null);
      setPasswordOpen(false);
      setPassword("");
    } catch {
      toast.error(t("wrongPassword"));
    } finally {
      setBusy(false);
    }
  }, [pendingBytes, password, t]);

  const download = useCallback(() => {
    if (!unlockedBytes || !fileName) return;
    const base = fileName.replace(/\.pdf$/i, "");
    const outName = `${base}-unlocked.pdf`;
    const blob = new Blob([new Uint8Array(unlockedBytes)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = outName;
    a.click();
    URL.revokeObjectURL(url);
  }, [unlockedBytes, fileName]);

  return (
    <div className="mx-auto w-full max-w-md space-y-4 p-4">
      <p className="text-sm text-muted-foreground">{t("privacyNote")}</p>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={onFileChange}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="button" variant="default" disabled={busy} onClick={onPickFile}>
          <Upload className="mr-2 size-4" />
          {t("chooseFile")}
        </Button>
        {fileName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
            <FileText className="size-4 shrink-0" />
            <span className="truncate">{fileName}</span>
          </div>
        )}
      </div>

      {unlockedBytes && fileName && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="button" onClick={download}>
            <Download className="mr-2 size-4" />
            {t("download")}
          </Button>
          <Button type="button" variant="outline" onClick={reset}>
            {t("reset")}
          </Button>
        </div>
      )}

      <Dialog
        open={passwordOpen}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setPasswordOpen(false);
            setPassword("");
            if (unlockJustSucceededRef.current) {
              unlockJustSucceededRef.current = false;
              return;
            }
            setPendingBytes(null);
            setFileName(null);
            if (inputRef.current) inputRef.current.value = "";
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!busy}>
          <DialogHeader>
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
            <DialogDescription>{t("dialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label htmlFor="pdf-unlock-password">{t("passwordLabel")}</Label>
            <Input
              id="pdf-unlock-password"
              type="password"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !busy) void tryUnlock();
              }}
              placeholder={t("passwordPlaceholder")}
              disabled={busy}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setPasswordOpen(false);
                setPendingBytes(null);
                setPassword("");
                if (inputRef.current) inputRef.current.value = "";
                setFileName(null);
              }}
            >
              {t("cancel")}
            </Button>
            <Button type="button" disabled={busy} onClick={() => void tryUnlock()}>
              {busy ? t("processing") : t("unlock")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
