"use client";

import { useCallback, useRef, useState } from "react";
import { encryptPDF } from "@pdfsmaller/pdf-encrypt";
import { isEncrypted } from "@pdfsmaller/pdf-decrypt";
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

export function PdfLockerPanel() {
  const t = useTranslations("PdfLocker");
  const inputRef = useRef<HTMLInputElement>(null);
  const lockJustSucceededRef = useRef(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [sourceBytes, setSourceBytes] = useState<Uint8Array | null>(null);
  const [lockedBytes, setLockedBytes] = useState<Uint8Array | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = useCallback(() => {
    lockJustSucceededRef.current = false;
    setFileName(null);
    setSourceBytes(null);
    setLockedBytes(null);
    setPassword("");
    setConfirmPassword("");
    setDialogOpen(false);
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
        if (enc.encrypted) {
          toast.error(t("alreadyEncrypted"));
          if (inputRef.current) inputRef.current.value = "";
          return;
        }
        setFileName(file.name);
        setLockedBytes(null);
        setPassword("");
        setConfirmPassword("");
        setSourceBytes(buf);
        setDialogOpen(true);
      } catch {
        toast.error(t("invalidPdf"));
        reset();
      } finally {
        setBusy(false);
      }
    },
    [reset, t]
  );

  const tryLock = useCallback(async () => {
    if (!sourceBytes) return;
    const p = password.trim();
    if (!p) {
      toast.error(t("passwordRequired"));
      return;
    }
    if (p !== confirmPassword.trim()) {
      toast.error(t("passwordMismatch"));
      return;
    }

    setBusy(true);
    try {
      const out = await encryptPDF(sourceBytes, p, { algorithm: "AES-256" });
      lockJustSucceededRef.current = true;
      setLockedBytes(out);
      setSourceBytes(null);
      setDialogOpen(false);
      setPassword("");
      setConfirmPassword("");
    } catch {
      toast.error(t("genericError"));
    } finally {
      setBusy(false);
    }
  }, [sourceBytes, password, confirmPassword, t]);

  const download = useCallback(() => {
    if (!lockedBytes || !fileName) return;
    const base = fileName.replace(/\.pdf$/i, "");
    const outName = `${base}-locked.pdf`;
    const blob = new Blob([new Uint8Array(lockedBytes)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = outName;
    a.click();
    URL.revokeObjectURL(url);
  }, [lockedBytes, fileName]);

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

      {lockedBytes && fileName && (
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
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setDialogOpen(false);
            setPassword("");
            setConfirmPassword("");
            if (lockJustSucceededRef.current) {
              lockJustSucceededRef.current = false;
              return;
            }
            setSourceBytes(null);
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
          <div className="space-y-3 py-1">
            <div className="space-y-2">
              <Label htmlFor="pdf-lock-password">{t("passwordLabel")}</Label>
              <Input
                id="pdf-lock-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("passwordPlaceholder")}
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdf-lock-confirm">{t("confirmLabel")}</Label>
              <Input
                id="pdf-lock-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("confirmPlaceholder")}
                disabled={busy}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !busy) void tryLock();
                }}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setDialogOpen(false);
                setSourceBytes(null);
                setPassword("");
                setConfirmPassword("");
                if (inputRef.current) inputRef.current.value = "";
                setFileName(null);
              }}
            >
              {t("cancel")}
            </Button>
            <Button type="button" disabled={busy} onClick={() => void tryLock()}>
              {busy ? t("processing") : t("lock")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
