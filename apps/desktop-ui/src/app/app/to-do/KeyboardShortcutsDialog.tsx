"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

interface KeyboardShortcut {
  key: string;
  description: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
}

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts: KeyboardShortcut[] = [
  { key: "N", description: "Create new task" },
  { key: "/", description: "Focus search bar" },
  { key: "Esc", description: "Clear search / Close dialogs" },
  { key: "K", description: "Toggle Kanban/List view" },
  { key: "?", shift: true, description: "Show keyboard shortcuts" },
  { key: "A", description: "Show all tasks" },
  { key: "1", description: "Filter: Not Started tasks" },
  { key: "2", description: "Filter: Ongoing tasks" },
  { key: "3", description: "Filter: Completed tasks" },
];

export default function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate and manage your tasks quickly
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3">
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/50 hover:bg-muted transition-colors"
              >
                <span className="text-sm text-muted-foreground">
                  {shortcut.description}
                </span>
                <div className="flex items-center gap-1">
                  {shortcut.ctrl && (
                    <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-background border border-border rounded">
                      Ctrl
                    </kbd>
                  )}
                  {shortcut.shift && (
                    <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-background border border-border rounded">
                      Shift
                    </kbd>
                  )}
                  {shortcut.alt && (
                    <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-background border border-border rounded">
                      Alt
                    </kbd>
                  )}
                  <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-background border border-border rounded min-w-[32px] text-center">
                    {shortcut.key}
                  </kbd>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Tip:</strong> Press{" "}
              <kbd className="px-1.5 py-0.5 text-xs font-semibold text-foreground bg-background border border-border rounded">
                ?
              </kbd>{" "}
              anytime to view this help dialog
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

