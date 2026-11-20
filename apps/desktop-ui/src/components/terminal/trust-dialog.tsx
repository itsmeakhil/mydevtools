"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { ProjectConfigV1 } from "@/lib/terminal/project-config"

/**
 * Before anything from a repo's `.mydevtools/terminal.json` runs: show everything it can run,
 * verbatim, and trust only this exact content (any later edit asks again).
 */
export function TrustDialog({ path, config, onTrust, onCancel }: {
  path: string; config: ProjectConfigV1; onTrust: () => void; onCancel: () => void
}) {
  const t = useTranslations("Terminal")
  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("trustTitle")}</DialogTitle>
          <DialogDescription>{t("trustBody", { path })}</DialogDescription>
        </DialogHeader>
        <div className="max-h-80 space-y-3 overflow-y-auto text-[13px]">
          {(config.commands ?? []).length > 0 && (
            <ul className="space-y-1">
              {config.commands!.map((c, i) => (
                <li key={i} className="rounded-md border border-border px-2 py-1.5">
                  <span className="block">{c.name}</span>
                  <code className="block break-all font-mono text-[12px] text-muted-foreground">{c.command}</code>
                </li>
              ))}
            </ul>
          )}
          {(config.workspaces ?? []).map((w, i) => (
            <div key={i} className="rounded-md border border-border px-2 py-1.5">
              <span className="block font-medium">{w.name}</span>
              {w.worktree && <span className="block text-[12px] text-muted-foreground">{t("trustWorktree", { name: w.worktree })}</span>}
              {(w.panes ?? []).map((p, j) =>
                p.command || p.env ? (
                  <span key={j} className="block text-[12px]">
                    {p.command && <code className="break-all font-mono">{p.command}</code>}
                    {p.env && <span className="text-muted-foreground"> · {t("trustEnv", { name: p.env })}</span>}
                  </span>
                ) : null,
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>{t("cancel")}</Button>
          <Button onClick={onTrust}>{t("trustAndRun")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
