"use client"

import { useTranslations } from "next-intl"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

/** Every Terminal shortcut in one place (⌘/). ⌘W/⌘C/⌘V come from the menu bar and the pane itself. */
export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useTranslations("Terminal")
  const rows: [string, string][] = [
    ["⌘T", t("newTab")],
    ["⌘D", t("splitRight")],
    ["⌘⇧D", t("splitDown")],
    ["⌘W", t("closePane")],
    ["⌘⇧↵", t("maximizePane")],
    ["⌘⌥ ← → ↑ ↓", t("scFocusPane")],
    ["⌘⇧[  ⌘⇧]", t("scNextPrevTab")],
    ["⌘1 – ⌘9", t("scGoToTab")],
    ["⌘J", t("nextWaitingHint")],
    ["⌘F", t("find")],
    ["⌘K", t("clear")],
    ["⌘↑  ⌘↓", t("scPromptJump")],
    ["⌘+  ⌘−  ⌘0", t("scFontSize")],
    ["⌘/", t("shortcutsTitle")],
  ]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("shortcutsTitle")}</DialogTitle>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-[13px]">
          {rows.map(([keys, label]) => (
            <div key={keys} className="contents">
              <dt><kbd className="font-sans text-[12px] text-muted-foreground">{keys}</kbd></dt>
              <dd>{label}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  )
}
