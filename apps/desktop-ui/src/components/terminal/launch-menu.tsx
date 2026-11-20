"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { IconChevronDown, IconGitBranch, IconKey, IconLock, IconTrash } from "@tabler/icons-react"
import { useCipherKey } from "@/lib/use-cipher-key"
import { envSetName, loadEnvSets, type EnvSet } from "@/lib/terminal/env-sets"
import { needsTrust, needsUnlock, planWorkspace } from "@/lib/terminal/workspace"
import type { ProjectConfigV1, Workspace } from "@/lib/terminal/project-config"
import { envVarOk, toPaneEnv } from "@/lib/terminal/env-vars"
import { defaultVarName, loadVaultSecrets, maskEntries, type SecretChoice, type VaultSecret } from "@/lib/terminal/secrets"
import { Checkbox } from "@/components/ui/checkbox"
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
import { LAYOUT_PRESETS, type SplitNode } from "@/lib/terminal/layout"
import { projectView, useTerminalStore, type TerminalProject } from "@/store/terminal-store"
import { TrustDialog } from "./trust-dialog"

const S = () => useTerminalStore.getState()
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))
type T = ReturnType<typeof useTranslations<"Terminal">>

/** The pane's mask for `env` (see `maskEntries`); warns, by name only, about values it can't mask. */
function maskOrWarn(env: Record<string, string>, all: boolean, t: T) {
  const { mask, tooLong, tooMany } = maskEntries(env, { all })
  const names = [...tooLong, ...tooMany]
  if (names.length) toast.warning(t("secretsNotMasked", { names: names.join(", ") }))
  return mask
}

/** A workspace tab: its layout, each pane's command and environment (by set name), optionally in a worktree. */
async function openWorkspace(project: TerminalProject, ws: Workspace, key: CryptoKey | null, t: T) {
  try {
    const plan = planWorkspace(ws)
    // Running those panes' commands without their environment could hit the wrong target.
    if (needsUnlock(plan, !!key)) return void toast.error(t("envLocked"))
    const sets: EnvSet[] = key && plan.some((p) => p.envName) ? await loadEnvSets(key) : []
    const panes = plan.map((p) => {
      if (!p.envName) return { run: p.run }
      const set = sets.find((s) => envSetName(s) === p.envName)
      if (!set) {
        toast.warning(t("envSetMissing", { name: p.envName }))
        return { run: p.run }
      }
      const { env, skipped } = toPaneEnv(set.variables)
      if (skipped.length) toast.warning(t("envSkipped", { names: skipped.join(", ") }))
      return { run: p.run, env, mask: maskOrWarn(env, false, t) }
    })
    const worktree = ws.worktree ? await terminalWorktreeAdd(project.path, ws.worktree) : undefined
    S().newTab(project.id, ws.name, { layout: ws.layout, panes, worktree })
  } catch (e) {
    toast.error(errMsg(e))
  }
}

const PRESETS = [
  ["layoutColumns2", LAYOUT_PRESETS.columns2],
  ["layoutRows2", LAYOUT_PRESETS.rows2],
  ["layoutColumns3", LAYOUT_PRESETS.columns3],
  ["layoutGrid", LAYOUT_PRESETS.grid],
] as const

/** "New tab with…": a coding agent, one of the project's saved commands, or a split layout. */
export function LaunchMenu({ project, isRepo }: { project: TerminalProject; isRepo: boolean }) {
  const t = useTranslations("Terminal")
  const [editing, setEditing] = React.useState(false)
  const [worktree, setWorktree] = React.useState(false)
  const [envOpen, setEnvOpen] = React.useState(false)
  const [secretsOpen, setSecretsOpen] = React.useState(false)
  // Something from the repo file the user asked to run, waiting on trust, with the exact file
  // text it came from: the dialog shows that text's config and trust applies to that text only.
  const [pending, setPending] = React.useState<{ text: string; config: ProjectConfigV1; run: () => void } | null>(null)
  const files = useTerminalStore((s) => s.projectFiles)
  const view = projectView(project, files)
  const renderedText = files[project.id]?.text
  const key = useCipherKey()
  /** Run now, unless it comes from an untrusted repo file: then ask first. */
  const guarded = (run: () => void, needed = true) => {
    if (!view.fromFile || !needed) return run()
    const f = S().projectFiles[project.id]
    // The file changed or went away since this menu rendered: run nothing from the old one.
    if (!f || f.text !== renderedText) return
    if (S().fileRunAllowed(project.id)) return run()
    setPending({ text: f.text, config: f.config, run })
  }
  const runAgent = (name: string, command: string) => S().newTab(project.id, name, { run: command })
  const runCommand = (name: string, command: string) => guarded(() => S().newTab(project.id, name, { run: command }))
  const runWorkspace = (ws: Workspace) => guarded(() => void openWorkspace(project, ws, key, t), needsTrust(ws))
  const activeTab = project.tabs.find((x) => x.id === project.activeTabId)
  const newLayoutTab = (name: string, layout: SplitNode) => S().newTab(project.id, name, { layout })

  return (
    <>
      {/* Opening the menu re-reads the repo file, so edits made on disk show up. */}
      <DropdownMenu onOpenChange={(o) => o && void S().loadProjectFile(project.id)}>
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
          <DropdownMenuItem onSelect={() => setEnvOpen(true)}>
            <IconKey className="h-4 w-4" aria-hidden />
            {t("newEnvTab")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setSecretsOpen(true)}>
            <IconLock className="h-4 w-4" aria-hidden />
            {t("newSecretsTab")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>{t("agents")}</DropdownMenuLabel>
          {LAUNCH_AGENTS.map((a) => (
            <DropdownMenuItem key={a} onSelect={() => runAgent(agentName(a), a)}>
              {agentName(a)}
              <span className="ml-auto font-mono text-[11px] text-muted-foreground">{a}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>
            {t("projectCommands")}
            {view.fromFile && <span className="block text-[11px] font-normal text-muted-foreground">{t("fromRepoFile")}</span>}
          </DropdownMenuLabel>
          {view.commands.map((c, i) => (
            <DropdownMenuItem key={i} onSelect={() => runCommand(c.name, c.command)} title={c.command}>
              <span className="min-w-0 truncate">{c.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onSelect={() => setEditing(true)} className="text-muted-foreground">
            {t("editCommands")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>{t("layouts")}</DropdownMenuLabel>
          {PRESETS.map(([key, layout]) => (
            <DropdownMenuItem key={key} onSelect={() => newLayoutTab(t(key), layout)}>
              {t(key)}
            </DropdownMenuItem>
          ))}
          {view.workspaces.map((w, i) => (
            <DropdownMenuItem key={`saved-${i}`} onSelect={() => runWorkspace(w)}>
              <span className="min-w-0 truncate">{w.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem
            disabled={!activeTab || activeTab.layout.kind === "leaf"}
            onSelect={() => activeTab && useTerminalStore.getState().saveLayout(project.id, activeTab.id)}
            className="text-muted-foreground"
          >
            {t("saveLayout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CommandsDialog project={project} open={editing} onOpenChange={setEditing} />
      <WorktreeDialog project={project} open={worktree} onOpenChange={setWorktree} />
      {envOpen && <EnvDialog project={project} onOpenChange={setEnvOpen} />}
      {secretsOpen && <SecretsDialog project={project} onOpenChange={setSecretsOpen} />}
      {pending && files[project.id]?.text === pending.text && (
        <TrustDialog
          path={`${project.path}/.mydevtools/terminal.json`}
          config={pending.config}
          onCancel={() => setPending(null)}
          onTrust={async () => {
            const { text, run } = pending
            setPending(null)
            const trusted = await S().trustProjectFile(project.id, text)
            if (trusted && S().projectFiles[project.id]?.text === text && S().fileRunAllowed(project.id)) run()
          }}
        />
      )}
    </>
  )
}

function CommandsDialog({ project, open, onOpenChange }: { project: TerminalProject; open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useTranslations("Terminal")
  const [name, setName] = React.useState("")
  const [command, setCommand] = React.useState("")
  const files = useTerminalStore((s) => s.projectFiles)
  const { commands, workspaces, fromFile } = projectView(project, files)
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
        {fromFile ? (
          <p className="text-[12px] text-muted-foreground">{t("fromRepoFile")}</p>
        ) : (
          (commands.length > 0 || workspaces.length > 0) && (
            <Button variant="outline" size="sm" className="justify-self-start" onClick={() => void S().shareProjectConfig(project.id)}>
              {t("shareToRepo")}
            </Button>
          )
        )}
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
        {workspaces.length > 0 && (
          <div className="grid gap-1 border-t border-border pt-3">
            <p className="text-[11px] font-semibold text-muted-foreground">{t("savedLayouts")}</p>
            <ul className="space-y-1">
              {workspaces.map((l, i) => (
                <li key={i} className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-[13px]">
                  <span className="min-w-0 flex-1 truncate">{l.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    aria-label={t("removeCommand", { name: l.name })}
                    title={t("removeCommand", { name: l.name })}
                    onClick={() => useTerminalStore.getState().removeLayout(project.id, i)}
                  >
                    <IconTrash className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
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

/**
 * New tab whose shell gets an Environment Manager set as env vars. Decrypted here, held in memory
 * until the pane spawns, never saved with the terminal and never typed into it.
 */
function EnvDialog({ project, onOpenChange }: { project: TerminalProject; onOpenChange: (o: boolean) => void }) {
  const t = useTranslations("Terminal")
  const key = useCipherKey()
  const [sets, setSets] = React.useState<EnvSet[] | null>(null)
  React.useEffect(() => {
    if (!key) return
    let live = true
    loadEnvSets(key)
      .then((loaded) => live && setSets(loaded))
      .catch((e) => toast.error(errMsg(e)))
    return () => {
      live = false
    }
  }, [key])

  const open = (s: EnvSet) => {
    const { env, skipped } = toPaneEnv(s.variables)
    if (skipped.length) toast.warning(t("envSkipped", { names: skipped.join(", ") }))
    S().newTab(project.id, envSetName(s), { env, mask: maskOrWarn(env, false, t) })
    onOpenChange(false)
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("envTitle")}</DialogTitle>
          <DialogDescription>{t("envBody")}</DialogDescription>
        </DialogHeader>
        {!key ? (
          <p className="text-[13px] text-muted-foreground">{t("envLocked")}</p>
        ) : sets === null ? null : sets.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">{t("noEnvSets")}</p>
        ) : (
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {sets.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => open(s)}
                  className="flex w-full items-center gap-2 rounded-md border border-border px-2.5 py-2 text-left text-[13px] hover:bg-foreground/[0.05]"
                >
                  <span className="min-w-0 flex-1 truncate">{envSetName(s)}</span>
                  <span className="shrink-0 text-[12px] text-muted-foreground">{t("envVarsCount", { count: s.variables.length })}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}

const FIELDS: SecretChoice["field"][] = ["password", "username", "apiKey", "secret"]
const FIELD_LABEL = { password: "secretFieldPassword", username: "secretFieldUsername", apiKey: "secretFieldApiKey", secret: "secretFieldSecret" } as const

/**
 * New tab whose shell gets picked vault passwords / API keys as env vars, every one masked in
 * the tab's output. Decrypted here and held only while the dialog is open and until the pane
 * spawns; never saved with the terminal, never typed into it, never shown.
 */
function SecretsDialog({ project, onOpenChange }: { project: TerminalProject; onOpenChange: (o: boolean) => void }) {
  const t = useTranslations("Terminal")
  const key = useCipherKey()
  const [secrets, setSecrets] = React.useState<VaultSecret[] | null>(null)
  /** `source:id:field` → its env var name, for the picked fields. */
  const [picked, setPicked] = React.useState<Record<string, string>>({})
  React.useEffect(() => {
    if (!key) return
    let live = true
    loadVaultSecrets(key)
      .then((loaded) => live && setSecrets(loaded))
      .catch((e) => toast.error(errMsg(e)))
    return () => {
      live = false
    }
  }, [key])

  const rows = (secrets ?? []).flatMap((s) =>
    FIELDS.flatMap((field) => {
      const value = s.fields[field]
      return value ? [{ k: `${s.source}:${s.id}:${field}`, s, field, value }] : []
    }),
  )
  const chosen = rows.filter((r) => r.k in picked)
  const nameOf = (k: string) => picked[k].trim()
  const invalid = (r: (typeof rows)[number]) =>
    !envVarOk(nameOf(r.k), r.value) || chosen.filter((o) => nameOf(o.k) === nameOf(r.k)).length > 1
  const ready = chosen.length > 0 && !chosen.some(invalid)

  const toggle = (r: (typeof rows)[number], on: boolean) =>
    setPicked(({ [r.k]: _old, ...rest }) => (on ? { ...rest, [r.k]: defaultVarName(r.s.label, r.field) } : rest))

  const open = (e: React.FormEvent) => {
    e.preventDefault()
    if (!ready) return
    const env = Object.fromEntries(chosen.map((r) => [nameOf(r.k), r.value]))
    S().newTab(project.id, t("secretsTabName", { count: chosen.length }), { env, mask: maskOrWarn(env, true, t) })
    onOpenChange(false)
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("secretsTitle")}</DialogTitle>
          <DialogDescription>{t("secretsBody")}</DialogDescription>
        </DialogHeader>
        {!key ? (
          <p className="text-[13px] text-muted-foreground">{t("secretsLocked")}</p>
        ) : secrets === null ? null : rows.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">{t("noSecrets")}</p>
        ) : (
          <form onSubmit={open} className="grid gap-3">
            <ul className="max-h-80 space-y-1 overflow-y-auto">
              {secrets.map((s) => {
                const own = rows.filter((r) => r.s === s)
                if (!own.length) return null
                return (
                  <li key={`${s.source}:${s.id}`} className="rounded-md border border-border px-2.5 py-2 text-[13px]">
                    <p className="truncate font-medium">{s.label || "—"}</p>
                    {own.map((r) => {
                      const on = r.k in picked
                      const field = t(FIELD_LABEL[r.field])
                      return (
                        <div key={r.k} className="mt-1.5 flex items-center gap-2">
                          <Checkbox
                            id={r.k}
                            checked={on}
                            onCheckedChange={(c) => toggle(r, c === true)}
                          />
                          <Label htmlFor={r.k} className="w-20 shrink-0 text-[12px] font-normal text-muted-foreground">{field}</Label>
                          {on && (
                            <Input
                              value={picked[r.k]}
                              onChange={(e) => setPicked((p) => ({ ...p, [r.k]: e.target.value }))}
                              aria-label={t("secretVarName", { field, name: s.label })}
                              aria-invalid={invalid(r)}
                              title={invalid(r) ? t("secretVarInvalid") : undefined}
                              className="h-7 min-w-0 flex-1 px-2 font-mono text-[12px]"
                            />
                          )}
                        </div>
                      )
                    })}
                  </li>
                )
              })}
            </ul>
            {chosen.some(invalid) && <p className="text-[12px] text-destructive">{t("secretVarInvalid")}</p>}
            <Button type="submit" size="sm" disabled={!ready} className="justify-self-end">
              {t("openWithSecrets")}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
