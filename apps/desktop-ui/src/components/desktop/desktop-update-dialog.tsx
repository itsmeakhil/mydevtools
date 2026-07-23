"use client";

import { useState } from "react";
import { CheckCircle2, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UpdateInfo } from "@/lib/desktop/updater";

/**
 * "Check for updates" button + modal. Shows the running version and, when a
 * newer signed build exists, installs it in place (the app relaunches; local
 * data is never touched). Desktop-only — callers gate on isDesktop().
 */
export function DesktopUpdateDialog() {
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState("");
  const [checking, setChecking] = useState(false);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);

  const check = async () => {
    setOpen(true);
    setChecking(true);
    try {
      const m = await import("@/lib/desktop/updater");
      if (!version) setVersion(await m.currentAppVersion());
      setUpdate(await m.checkForUpdate());
    } catch {
      toast.error("Couldn't check for updates. Are you online?");
      setOpen(false);
    } finally {
      setChecking(false);
    }
  };

  const install = async () => {
    const { startUpdate } = await import("@/lib/desktop/use-update-install");
    startUpdate();
    setOpen(false); // hand off to the app-wide progress modal
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => void check()} disabled={checking}>
        <RefreshCw className={checking ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
        Check for updates
      </Button>

      <Dialog open={open} onOpenChange={(o) => setOpen(o)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Updates</DialogTitle>
            <DialogDescription>
              MyDevTools updates itself in place — no reinstall, and your
              offline data is never touched.
              {version ? ` You're on version ${version}.` : ""}
            </DialogDescription>
          </DialogHeader>

          {checking ? (
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" /> Checking…
            </div>
          ) : update ? (
            <div className="rounded-xl border border-primary/40 bg-primary/[0.04] px-3.5 py-3">
              <p className="text-sm font-medium">
                Version {update.version} is available.
              </p>
              {update.notes ? (
                <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">
                  {update.notes}
                </p>
              ) : null}
              <Button className="mt-3" size="sm" onClick={() => void install()}>
                <Download className="mr-2 h-4 w-4" />
                Download &amp; install
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" /> You're up to date.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
