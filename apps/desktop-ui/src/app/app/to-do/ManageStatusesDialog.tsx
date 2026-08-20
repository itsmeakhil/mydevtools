"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useTaskContext } from "./context/TaskContext";
import { ResolvedStatus, saveStatusSettings, useStatuses } from "./hooks/useStatuses";
import {
  BuiltInStatus,
  CustomStatus,
  STATUS_COLORS,
  StatusColorKey,
  customStatusId,
} from "./utils/statusSettings";

const COLOR_KEYS = Object.keys(STATUS_COLORS) as StatusColorKey[];

function SwatchRow({
  value,
  onChange,
  colorAria,
}: {
  value: StatusColorKey;
  onChange: (color: StatusColorKey) => void;
  colorAria: (color: string) => string;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {COLOR_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-label={colorAria(key)}
          aria-pressed={value === key}
          className={cn(
            "h-5 w-5 rounded-full transition-transform hover:scale-110",
            STATUS_COLORS[key].dot,
            value === key && "ring-2 ring-primary ring-offset-2 ring-offset-background"
          )}
        />
      ))}
    </div>
  );
}

export default function ManageStatusesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Tasks.manageStatuses");
  const { settings, statuses } = useStatuses();
  const { reassignStatus, filterStatus, setFilterStatus } = useTaskContext();
  const [newLabel, setNewLabel] = useState("");
  const [pendingDelete, setPendingDelete] = useState<CustomStatus | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const builtIns = statuses.filter((s): s is ResolvedStatus & { builtIn: true } => s.builtIn);
  const notStartedLabel = builtIns[0]?.label ?? "Not Started";

  const setBuiltInColor = (id: BuiltInStatus, color: StatusColorKey) =>
    saveStatusSettings({ ...settings, colors: { ...settings.colors, [id]: color } });

  const updateCustom = (id: string, patch: Partial<CustomStatus>) =>
    saveStatusSettings({
      ...settings,
      custom: settings.custom.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });

  const addCustom = () => {
    const label = newLabel.trim();
    if (!label) return;
    const id = customStatusId(label, settings.custom.map((c) => c.id));
    saveStatusSettings({ ...settings, custom: [...settings.custom, { id, label, color: "purple" }] });
    setNewLabel("");
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await reassignStatus(pendingDelete.id);
      saveStatusSettings({
        ...settings,
        custom: settings.custom.filter((c) => c.id !== pendingDelete.id),
      });
      if (filterStatus === pendingDelete.id) setFilterStatus("all");
      setPendingDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Built-in statuses: color only */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("defaults")}
              </p>
              {builtIns.map((status) => (
                <div key={status.id} className="flex items-center justify-between gap-3">
                  <span className={cn("text-sm font-medium min-w-24", status.color)}>
                    {status.label}
                  </span>
                  <SwatchRow
                    value={status.colorKey}
                    onChange={(color) => setBuiltInColor(status.id as BuiltInStatus, color)}
                    colorAria={(color) => t("colorAria", { color })}
                  />
                </div>
              ))}
            </div>

            {/* Custom statuses: label + color + delete */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("custom")}
              </p>
              {settings.custom.map((custom) => (
                <div key={custom.id} className="flex items-center gap-3">
                  <Input
                    value={custom.label}
                    onChange={(e) => updateCustom(custom.id, { label: e.target.value })}
                    className="h-8 text-sm flex-1 min-w-24"
                  />
                  <SwatchRow
                    value={custom.color}
                    onChange={(color) => updateCustom(custom.id, { color })}
                    colorAria={(color) => t("colorAria", { color })}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => setPendingDelete(custom)}
                    aria-label={t("deleteAria", { label: custom.label })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustom()}
                  placeholder={t("addPlaceholder")}
                  className="h-8 text-sm flex-1"
                />
                <Button size="sm" className="h-8 gap-1" onClick={addCustom} disabled={!newLabel.trim()}>
                  <Plus className="h-3.5 w-3.5" />
                  {t("add")}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("deleteConfirmTitle", { label: pendingDelete?.label ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirmBody", { fallback: notStartedLabel })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
