"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { IconAlertTriangle, IconFolder } from "@tabler/icons-react"
import { FileIconComp } from "@/components/s3-drive/file-icon"
import { getFileType } from "@/components/s3-drive/file-types"
import { countFolders, fileTypeStats, type FolderNode, type SecureFileEntry } from "@/lib/secure-files"
import type { StorageTotals } from "@/lib/secure-files-api"
import { cn } from "@/lib/utils"

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card/40 px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  )
}

export function Overview({
  files,
  tree,
  totals,
  errorCount,
  dir,
  onOpenFolder,
}: {
  files: SecureFileEntry[]
  tree: FolderNode
  totals: StorageTotals | null
  errorCount: number
  dir: string | null
  onOpenFolder: (path: string) => void
}) {
  const t = useTranslations("SecureFiles")

  const byType = useMemo(() => fileTypeStats(files, getFileType), [files])
  const folders = useMemo(() => countFolders(tree), [tree])
  const largest = useMemo(() => [...files].sort((a, b) => b.size - a.size).slice(0, 5), [files])
  const recent = useMemo(() => [...files].sort((a, b) => b.importedAt - a.importedAt).slice(0, 5), [files])

  const contentSize = totals?.size ?? files.reduce((n, f) => n + f.size, 0)
  const physical = totals?.physical ?? 0
  const overhead = Math.max(0, physical - contentSize)
  const maxCount = byType[0]?.count ?? 1

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h2 className="text-base font-semibold">{t("overview")}</h2>
        <p className="truncate text-xs text-muted-foreground" title={dir ?? ""}>{dir}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("statFiles")} value={String(totals?.count ?? files.length)} />
        <Stat label={t("statFolders")} value={String(folders)} />
        <Stat label={t("statContent")} value={formatBytes(contentSize)} hint={t("statContentHint")} />
        <Stat
          label={t("statOnDisk")}
          value={physical > 0 ? formatBytes(physical) : "—"}
          hint={physical > 0 ? t("statOverhead", { size: formatBytes(overhead) }) : undefined}
        />
      </div>

      {errorCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
          <IconAlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div>
            <div className="font-medium">{t("unreadableCount", { count: errorCount })}</div>
            <div className="text-muted-foreground">{t("unreadableHint")}</div>
          </div>
        </div>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-medium">{t("byType")}</h3>
        {byType.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("emptyTitle")}</p>
        ) : (
          <div className="rounded-lg border">
            {byType.map((s, i) => (
              <div
                key={s.type}
                className={cn("grid grid-cols-[1.5rem_7rem_1fr_5rem_5rem] items-center gap-2 px-3 py-2 text-sm", i > 0 && "border-t")}
              >
                <FileIconComp type={s.type} className="size-4" />
                <span className="truncate text-xs">{t(`types.${s.type}` as never)}</span>
                <span className="h-1.5 rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-primary/70"
                    style={{ width: `${Math.max(2, (s.count / maxCount) * 100)}%` }}
                  />
                </span>
                <span className="text-right text-xs tabular-nums">{t("fileCount", { count: s.count })}</span>
                <span className="text-right text-xs tabular-nums text-muted-foreground">{formatBytes(s.size)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <FileList title={t("largestFiles")} files={largest} onOpenFolder={onOpenFolder} render={(f) => formatBytes(f.size)} />
        <FileList
          title={t("recentlyAdded")}
          files={recent}
          onOpenFolder={onOpenFolder}
          render={(f) => new Date(f.importedAt).toLocaleDateString()}
        />
      </div>
    </div>
  )
}

function FileList({
  title,
  files,
  render,
  onOpenFolder,
}: {
  title: string
  files: SecureFileEntry[]
  render: (f: SecureFileEntry) => string
  onOpenFolder: (path: string) => void
}) {
  const t = useTranslations("SecureFiles")
  if (files.length === 0) return null
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="rounded-lg border">
        {files.map((f, i) => (
          <button
            key={f.id}
            type="button"
            title={t("openContainingFolder")}
            onClick={() => onOpenFolder(f.dir)}
            className={cn("flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50", i > 0 && "border-t")}
          >
            <FileIconComp type={getFileType(f.name)} className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{f.name}</span>
            {f.dir && (
              <span className="hidden min-w-0 max-w-40 shrink items-center gap-1 truncate text-xs text-muted-foreground sm:flex">
                <IconFolder className="size-3 shrink-0" />
                {f.dir}
              </span>
            )}
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{render(f)}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
