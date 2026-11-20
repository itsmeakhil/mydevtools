"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTerminalStore } from "@/store/terminal-store"
import { FONT_SIZE, LINE_HEIGHTS, SCROLLBACK_SIZES, type CursorStyle, type TerminalPrefs } from "@/lib/terminal/util"

function Row({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <Label htmlFor={htmlFor} className="text-[13px]">{label}</Label>
        {hint && <p className="text-[12px] text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ id, label, hint, k }: { id: string; label: string; hint?: string; k: keyof TerminalPrefs }) {
  const on = useTerminalStore((s) => s.prefs[k] as boolean)
  return (
    <Row label={label} htmlFor={id} hint={hint}>
      <Switch id={id} checked={on} onCheckedChange={(v) => useTerminalStore.getState().setPrefs({ [k]: v })} />
    </Row>
  )
}

/** Appearance and notification settings shared by every pane. */
export function TerminalSettings({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useTranslations("Terminal")
  const locale = useLocale()
  const prefs = useTerminalStore((s) => s.prefs)
  const fontSize = useTerminalStore((s) => s.fontSize)
  const optionAsMeta = useTerminalStore((s) => s.optionAsMeta)
  const project = useTerminalStore((s) => s.projects.find((p) => p.id === s.activeProjectId) ?? s.projects[0])
  const st = useTerminalStore.getState
  const num = (n: number) => new Intl.NumberFormat(locale).format(n)
  // Font name commits on blur/Enter so every keystroke doesn't re-render all panes.
  const [font, setFont] = React.useState(prefs.fontFamily)
  const commitFont = () => st().setPrefs({ fontFamily: font })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("settings")}</DialogTitle>
        </DialogHeader>
        <section className="grid gap-3">
          <h3 className="text-[11px] font-semibold text-muted-foreground">{t("settingsAppearance")}</h3>
          <Row label={t("fontFamily")} htmlFor="term-font" hint={t("fontFamilyHint")}>
            <Input
              id="term-font"
              value={font}
              onChange={(e) => setFont(e.target.value)}
              onBlur={commitFont}
              onKeyDown={(e) => e.key === "Enter" && commitFont()}
              placeholder="SF Mono"
              className="h-8 w-40 font-mono text-[13px]"
            />
          </Row>
          <Row label={t("fontSize")} htmlFor="term-size">
            <Select value={String(fontSize)} onValueChange={(v) => st().setFontSize(Number(v))}>
              <SelectTrigger id="term-size" className="h-8 w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: FONT_SIZE.max - FONT_SIZE.min + 1 }, (_, i) => FONT_SIZE.min + i).map((n) => (
                  <SelectItem key={n} value={String(n)}>{num(n)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label={t("lineHeight")} htmlFor="term-lh">
            <Select value={String(prefs.lineHeight)} onValueChange={(v) => st().setPrefs({ lineHeight: Number(v) })}>
              <SelectTrigger id="term-lh" className="h-8 w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LINE_HEIGHTS.map((n) => <SelectItem key={n} value={String(n)}>{num(n)}</SelectItem>)}
              </SelectContent>
            </Select>
          </Row>
          <Row label={t("cursorStyle")} htmlFor="term-cursor">
            <Select value={prefs.cursorStyle} onValueChange={(v) => st().setPrefs({ cursorStyle: v as CursorStyle })}>
              <SelectTrigger id="term-cursor" className="h-8 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="block">{t("cursorBlock")}</SelectItem>
                <SelectItem value="bar">{t("cursorBar")}</SelectItem>
                <SelectItem value="underline">{t("cursorUnderline")}</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Toggle id="term-blink" k="cursorBlink" label={t("cursorBlink")} />
          <Row label={t("scrollbackLines")} htmlFor="term-sb">
            <Select value={String(prefs.scrollback)} onValueChange={(v) => st().setPrefs({ scrollback: Number(v) })}>
              <SelectTrigger id="term-sb" className="h-8 w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SCROLLBACK_SIZES.map((n) => <SelectItem key={n} value={String(n)}>{num(n)}</SelectItem>)}
              </SelectContent>
            </Select>
          </Row>
          <Toggle id="term-copy" k="copyOnSelect" label={t("copyOnSelect")} />
          <Toggle id="term-sr" k="screenReader" label={t("screenReader")} hint={t("screenReaderHint")} />
          <Row label={t("optionAsMeta")} htmlFor="term-meta">
            <Switch id="term-meta" checked={optionAsMeta} onCheckedChange={(v) => st().setOptionAsMeta(v)} />
          </Row>
        </section>
        <section className="grid gap-3 border-t border-border pt-3">
          <h3 className="text-[11px] font-semibold text-muted-foreground">{t("settingsNotifications")}</h3>
          <Toggle id="term-nb" k="notifyBlocked" label={t("notifyBlocked")} />
          <Toggle id="term-nd" k="notifyDone" label={t("notifyDone")} />
          <Toggle id="term-ns" k="notifySound" label={t("notifySound")} />
        </section>
        {project && (
          <section className="grid gap-3 border-t border-border pt-3">
            <h3 className="text-[11px] font-semibold text-muted-foreground">{project.name}</h3>
            <Row label={t("agentsCanSpawn")} htmlFor="term-spawn" hint={t("agentsCanSpawnHint")}>
              <Switch
                id="term-spawn"
                checked={project.agentsCanSpawn === true}
                onCheckedChange={(v) => st().setAgentsCanSpawn(project.id, v)}
              />
            </Row>
          </section>
        )}
      </DialogContent>
    </Dialog>
  )
}
