"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { IconPin, IconPinFilled } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { type CodeSnippet } from "@/store/snippet-manager-store";
import { resolveEditorLanguage, SNIPPET_LANGUAGE_AUTO } from "@/lib/snippet-language";

const LANG_COLORS: Record<string, string> = {
  javascript:  "bg-yellow-400",
  typescript:  "bg-blue-400",
  python:      "bg-sky-500",
  json:        "bg-green-400",
  html:        "bg-orange-400",
  css:         "bg-pink-400",
  scss:        "bg-pink-500",
  less:        "bg-indigo-300",
  shell:       "bg-slate-400",
  sql:         "bg-indigo-400",
  markdown:    "bg-slate-400",
  yaml:        "bg-purple-400",
  xml:         "bg-orange-500",
  go:          "bg-cyan-400",
  rust:        "bg-orange-600",
  java:        "bg-red-500",
  php:         "bg-violet-400",
  csharp:      "bg-purple-500",
  dockerfile:  "bg-sky-400",
  ini:         "bg-stone-400",
  plaintext:   "bg-muted-foreground",
};

export function LangDot({ lang }: { lang: string }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        LANG_COLORS[lang] ?? "bg-muted-foreground"
      )}
    />
  );
}

export const SnippetListItem = memo(function SnippetListItem({
  sn,
  selected,
  onClick,
  onPin,
  t,
}: {
  sn: CodeSnippet;
  selected: boolean;
  onClick: () => void;
  onPin?: () => void;
  t: ReturnType<typeof useTranslations<"SnippetManager">>;
}) {
  const lang = resolveEditorLanguage(sn.language, sn.code);
  const firstLine = sn.code.split("\n").find((l) => l.trim()) ?? "";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group/item flex w-full flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition-all duration-150",
        selected
          ? "border-primary/30 bg-primary/8 dark:bg-primary/10"
          : "border-transparent hover:border-border/60 hover:bg-muted/60"
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <LangDot lang={lang} />
        <span className="flex-1 truncate text-sm font-medium leading-tight">
          {sn.title}
        </span>
        {onPin && (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); onPin(); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onPin(); } }}
            className={cn(
              "shrink-0 rounded p-0.5 text-muted-foreground transition-all hover:text-foreground",
              sn.pinned ? "opacity-100 text-primary/70" : "opacity-0 group-hover/item:opacity-100"
            )}
            title={sn.pinned ? "Unpin" : "Pin to top"}
          >
            {sn.pinned ? <IconPinFilled className="h-3 w-3" /> : <IconPin className="h-3 w-3" />}
          </span>
        )}
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {sn.language === SNIPPET_LANGUAGE_AUTO
            ? t("badgeAuto", { lang: t(`languages.${lang}` as never) })
            : t(`languages.${sn.language}` as never)}
        </span>
      </div>
      {firstLine && (
        <p className="truncate pl-4 font-mono text-[11px] leading-tight text-muted-foreground/55">
          {firstLine}
        </p>
      )}
      {sn.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 pl-4">
          {sn.tags.map((tag) => (
            <span key={tag} className="rounded bg-muted px-1.5 py-0 text-[10px] text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}
    </button>
  );
});
