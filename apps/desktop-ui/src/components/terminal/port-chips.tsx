"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { IconApi, IconCopy, IconExternalLink } from "@tabler/icons-react"
import { openExternal } from "@/lib/desktop/external-links"
import { openInApiClient } from "@/lib/api-client/handoff"
import { useTerminalStore } from "@/store/terminal-store"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const SHOWN = 3
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))

/** Local servers this pane started (listening now): open in the browser or the API client. */
export function PortChips({ id }: { id: string }) {
  const t = useTranslations("Terminal")
  const router = useRouter()
  const ports = useTerminalStore((s) => s.ports[id])
  if (!ports?.length) return null
  const extra = ports.length - SHOWN
  return (
    <span className="flex shrink-0 items-center gap-0.5">
      {ports.slice(0, SHOWN).map(({ port, url }) => (
        <DropdownMenu key={port}>
          <DropdownMenuTrigger
            className="flex items-center gap-1 rounded px-1 font-mono text-[11px] text-foreground hover:bg-foreground/[0.06]"
            title={url}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />:{port}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate font-mono text-[11px] font-normal text-muted-foreground">{url}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void openExternal(url).catch((e) => toast.error(errMsg(e)))}>
              <IconExternalLink className="h-3.5 w-3.5" aria-hidden />
              {t("portOpenBrowser")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => openInApiClient({ name: url.replace(/^https?:\/\//, ""), method: "GET", url }, (p) => router.push(p))}
            >
              <IconApi className="h-3.5 w-3.5" aria-hidden />
              {t("portOpenApiClient")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => navigator.clipboard.writeText(url).then(() => toast.success(t("portUrlCopied")), (e) => toast.error(errMsg(e)))}
            >
              <IconCopy className="h-3.5 w-3.5" aria-hidden />
              {t("portCopyUrl")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ))}
      {extra > 0 && (
        <span className="px-1 text-[11px]" title={ports.slice(SHOWN).map((p) => p.url).join("\n")}>
          {t("portsMore", { count: extra })}
        </span>
      )}
    </span>
  )
}
