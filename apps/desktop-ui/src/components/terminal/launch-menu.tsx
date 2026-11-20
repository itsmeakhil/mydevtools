"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { IconChevronDown, IconGitBranch, IconTrash } from "@tabler/icons-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { agentName, LAUNCH_AGENTS } from "@/lib/terminal/agents"
import { terminalWorktreeAdd } from "@/lib/desktop/terminal-bridge"
import { useTerminalStore, type TerminalProject } from "@/store/terminal-store"

/** "New tab with…": a coding agent or one of the project's saved commands. */
export function LaunchMenu({ project, isRepo }: { project: TerminalProject; isRepo: boolean }) {
  const t = useTranslations("Terminal")
  const [editing, setEditing] = React.useState(false)
  const [worktree, setWorktree] = React.useState(false)
  const launch = (name: string, command: string) => useTerminalStore.getState().newTab(project.id, name, { run: command })
  const commands = project.commands ?? []

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-5 shrink-0" aria-label={t("launch")} title={t("launch")}>
            <IconChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-48">
          {isRepo && (
            <>
              <DropdownMenuItem onSelect={() => setWorktree(true)}>
                <IconGitBranch className="h-4 w-4" aria-hidden />
                {t("newWorktreeTask")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuLabel>{t("agents")}</DropdownMenuLabel>
          {LAUNCH_AGENTS.map((a) => (
            <DropdownMenuItem key={a} onSelect={() => launch(agentName(a), a)}>
              {agentName(a)}
              <span className="ml-auto font-mono text-[11px] text-muted-foreground">{a}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>{t("projectCommands")}</DropdownMenuLabel>
          {commands.map((c, i) => (
            <DropdownMenuItem key={i} onSelect={() => launch(c.name, c.command)} title={c.command}>
              <span className="min-w-0 truncate">{c.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onSelect={() => setEditing(true)} className="text-muted-foreground">
            {t("editCommands")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CommandsDialog project={project} open={editing} onOpenChange={setEditing} />
      <WorktreeDialog project={project} open={worktree} onOpenChange={setWorktree} />
    </>
  )
}

function CommandsDialog({ project, open, onOpenChange }: { project: TerminalProject; open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useTranslations("Terminal")
  const [name, setName] = React.useState("")
  const [command, setCommand] = React.useState("")
  const commands = project.commands ?? []
  const add = (e: React.FormEvent) => {
    e.preventDefault()
    if (!command.trim()) return
    useTerminalStore.getState().addCommand(project.id, { name, command })
    setName("")
    setCommand("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("commandsTitle", { name: project.name })}</DialogTitle>
          <DialogDescription>{t("commandsBody")}</DialogDescription>
        </DialogHeader>
        {commands.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">{t("noCommands")}</p>
        ) : (
          <ul className="space-y-1">
            {commands.map((c, i) => (
              <li key={i} className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-[13px]">
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{c.name}</span>
                  <span className="block truncate font-mono text-[12px] text-muted-foreground">{c.command}</span>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  aria-label={t("removeCommand", { name: c.name })}
                  title={t("removeCommand", { name: c.name })}
                  onClick={() => useTerminalStore.getState().removeCommand(project.id, i)}
                >
                  <IconTrash className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={add} className="grid gap-3 border-t border-border pt-3">
          <div className="grid gap-1.5">
            <Label htmlFor="cmd-name">{t("commandName")}</Label>
            <Input id="cmd-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("commandNamePlaceholder")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cmd-line">{t("commandLine")}</Label>
            <Input id="cmd-line" value={command} onChange={(e) => setCommand(e.target.value)} placeholder="npm run dev" className="font-mono" />
          </div>
          <Button type="submit" size="sm" disabled={!command.trim()} className="justify-self-end">{t("addCommand")}</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** New task = new branch + its own checkout, so parallel agents never edit the same files. */
function WorktreeDialog({ project, open, onOpenChange }: { project: TerminalProject; open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useTranslations("Terminal")
  const [name, setName] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      const wt = await terminalWorktreeAdd(project.path, name)
      useTerminalStore.getState().newTab(project.id, name.trim(), { worktree: wt })
      setName("")
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("worktreeTitle")}</DialogTitle>
          <DialogDescription>{t("worktreeBody")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={create} className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="wt-name">{t("taskName")}</Label>
            <Input id="wt-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t("taskNamePlaceholder")} />
          </div>
          <Button type="submit" size="sm" disabled={!name.trim() || busy} className="justify-self-end">{t("createTask")}</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
