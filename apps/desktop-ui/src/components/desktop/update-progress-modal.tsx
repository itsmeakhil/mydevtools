"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { pctOf, type UpdatePhase } from "@/lib/desktop/updater";
import { useUpdateInstall } from "@/lib/desktop/use-update-install";

function IndeterminateBar() {
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-primary/20">
      <motion.div
        className="absolute inset-y-0 w-1/3 rounded-full bg-primary"
        animate={{ x: ["-100%", "300%"] }}
        transition={{ duration: 1.1, ease: "easeInOut", repeat: Infinity }}
      />
    </div>
  );
}

export function UpdateProgressModal() {
  const t = useTranslations("DesktopUpdate");
  const { status, error, visible, dismiss, reopen, retry, close } = useUpdateInstall();

  if (!status) return null;

  const pct = pctOf(status);
  const phase: UpdatePhase = status.phase;
  const locked = phase === "restarting"; // force-open, non-dismissible
  const open = locked || visible || error != null;

  const label =
    error != null
      ? t("failed")
      : phase === "installing"
        ? t("installing")
        : phase === "restarting"
          ? t("restarting")
          : pct !== null
            ? t("downloadingPct", { pct })
            : t("downloading");

  // Corner pill when the run is active but the modal is dismissed (no error).
  if (!open) {
    return (
      <button
        type="button"
        onClick={reopen}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-medium shadow-lg"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        {pct !== null ? t("pillPct", { pct }) : t("pill")}
      </button>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (locked || error) return; // restart & errors don't backdrop-dismiss
        if (!o) dismiss();
      }}
    >
      <DialogContent className="sm:max-w-[400px]" showCloseButton={!locked && error == null}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        {error != null ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{error}</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={retry}>{t("retry")}</Button>
              <Button size="sm" variant="outline" onClick={close}>{t("close")}</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-1">
            {pct !== null && phase === "downloading" ? (
              <Progress value={pct} />
            ) : (
              <IndeterminateBar />
            )}
            <AnimatePresence mode="wait">
              <motion.p
                key={error != null ? "error" : phase}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="text-sm text-muted-foreground"
              >
                {label}
              </motion.p>
            </AnimatePresence>
            <p className="text-xs text-muted-foreground/70">{t("reassurance")}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
