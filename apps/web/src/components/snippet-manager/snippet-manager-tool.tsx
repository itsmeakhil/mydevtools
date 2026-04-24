"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useTranslations } from "next-intl";
import debounce from "lodash/debounce";
import { auth } from "@/database/firebase";
import {
  createCodeSnippetApi,
  deleteCodeSnippetApi,
  isSnippetDuplicateError,
  listCodeSnippetsApi,
  patchCodeSnippetApi,
} from "@/lib/code-snippets-api";
import {
  IconPlus,
  IconTrash,
  IconCopy,
  IconCheck,
  IconEye,
  IconSparkles,
  IconSearch,
  IconMenu2,
  IconPencil,
  IconCode,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { useIsMobile } from "@/components/hooks/use-mobile";
import {
  useSnippetManagerStore,
  type CodeSnippet,
} from "@/store/snippet-manager-store";
import {
  resolveEditorLanguage,
  SNIPPET_LANGUAGE_AUTO,
  SNIPPET_MONACO_LANGUAGES,
} from "@/lib/snippet-language";
import { ToolPinButton } from "@/components/tools/tool-header";
import { ToolWrapper } from "@/components/tools/tool-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import {
  SnippetMonaco,
  type SnippetMonacoHandle,
} from "./snippet-monaco";

type EditorMode = "view" | "edit";

// ── Language color dots ───────────────────────────────────────────────────────

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

function LangDot({ lang }: { lang: string }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        LANG_COLORS[lang] ?? "bg-muted-foreground"
      )}
    />
  );
}

// ── Snippet list item ─────────────────────────────────────────────────────────

function SnippetListItem({
  sn,
  selected,
  onClick,
  t,
}: {
  sn: CodeSnippet;
  selected: boolean;
  onClick: () => void;
  t: ReturnType<typeof useTranslations<"SnippetManager">>;
}) {
  const lang = resolveEditorLanguage(sn.language, sn.code);
  const firstLine = sn.code.split("\n").find((l) => l.trim()) ?? "";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition-all duration-150",
        selected
          ? "border-primary/30 bg-primary/8 dark:bg-primary/10"
          : "border-transparent hover:border-border/60 hover:bg-muted/60"
      )}
    >
      {/* Title row */}
      <div className="flex min-w-0 items-center gap-2">
        <LangDot lang={lang} />
        <span className="flex-1 truncate text-sm font-medium leading-tight">
          {sn.title}
        </span>
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {sn.language === SNIPPET_LANGUAGE_AUTO
            ? t("badgeAuto", { lang: t(`languages.${lang}` as never) })
            : t(`languages.${sn.language}` as never)}
        </span>
      </div>
      {/* Code preview */}
      {firstLine && (
        <p className="truncate pl-4 font-mono text-[11px] leading-tight text-muted-foreground/55">
          {firstLine}
        </p>
      )}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SnippetManagerTool() {
  const t = useTranslations("SnippetManager");
  const [user, authLoading] = useAuthState(auth);
  const userRef = useRef(user);
  userRef.current = user;

  const snippets = useSnippetManagerStore((s) => s.snippets);
  const addSnippet = useSnippetManagerStore((s) => s.addSnippet);
  const updateSnippet = useSnippetManagerStore((s) => s.updateSnippet);
  const removeSnippet = useSnippetManagerStore((s) => s.removeSnippet);
  const importSnippets = useSnippetManagerStore((s) => s.importSnippets);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftLanguage, setDraftLanguage] = useState(SNIPPET_LANGUAGE_AUTO);
  const [draftCode, setDraftCode] = useState("");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<EditorMode>("edit");
  const [copied, setCopied] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CodeSnippet | null>(null);
  const [listOpen, setListOpen] = useState(false);

  const monacoRef = useRef<SnippetMonacoHandle>(null);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const debouncedSaveCode = useMemo(
    () =>
      debounce((code: string) => {
        const id = selectedIdRef.current;
        if (!id) return;
        useSnippetManagerStore.getState().updateSnippet(id, { code });
        const u = userRef.current;
        if (u) {
          void patchCodeSnippetApi(u, id, { code })
            .then((s) =>
              useSnippetManagerStore.getState().mergeSnippetFromRemote(s)
            )
            .catch(() => toast.error(t("toastSyncFailed")));
        }
      }, 450),
    [t]
  );

  useEffect(() => () => debouncedSaveCode.cancel(), [debouncedSaveCode]);

  const [storeHydrated, setStoreHydrated] = useState(() => {
    const p = useSnippetManagerStore.persist;
    return p?.hasHydrated?.() ?? true;
  });
  useEffect(() => {
    if (storeHydrated) return;
    const p = useSnippetManagerStore.persist;
    if (!p?.onFinishHydration) {
      setStoreHydrated(true);
      return;
    }
    return p.onFinishHydration(() => setStoreHydrated(true));
  }, [storeHydrated]);

  const guestBootstrapped = useRef(false);
  const serverBootstrappedUid = useRef<string | null>(null);
  const serverBootstrapInFlight = useRef(false);
  const [remoteListEpoch, setRemoteListEpoch] = useState(0);

  useEffect(() => {
    if (!storeHydrated || authLoading) return;

    if (!user) {
      if (guestBootstrapped.current) return;
      guestBootstrapped.current = true;
      serverBootstrappedUid.current = null;
      serverBootstrapInFlight.current = false;
      const { snippets: list, addSnippet: add } =
        useSnippetManagerStore.getState();
      if (list.length === 0) {
        const id = add({
          title: t("defaultSnippetTitle"),
          code: t("defaultSnippetCode"),
          language: SNIPPET_LANGUAGE_AUTO,
        });
        setSelectedId(id);
      } else {
        setSelectedId(list[0].id);
      }
      return;
    }

    guestBootstrapped.current = false;
    if (serverBootstrappedUid.current === user.uid) return;
    if (serverBootstrapInFlight.current) return;
    serverBootstrapInFlight.current = true;

    let cancelled = false;
    (async () => {
      try {
        const remote = await listCodeSnippetsApi(user);
        if (cancelled) return;
        if (remote.length > 0) {
          importSnippets(remote);
          setRemoteListEpoch((e) => e + 1);
        } else {
          const local = useSnippetManagerStore.getState().snippets;
          for (const sn of local) {
            try {
              await createCodeSnippetApi(user, {
                id: sn.id,
                title: sn.title,
                language: sn.language,
                code: sn.code,
                createdAt: sn.createdAt,
                updatedAt: sn.updatedAt,
              });
            } catch (e) {
              if (!isSnippetDuplicateError(e)) throw e;
            }
          }
          const again = await listCodeSnippetsApi(user);
          if (cancelled) return;
          importSnippets(again.length > 0 ? again : local);
          setRemoteListEpoch((e) => e + 1);
        }

        let list = useSnippetManagerStore.getState().snippets;
        if (list.length === 0) {
          const created = await createCodeSnippetApi(user, {
            title: t("defaultSnippetTitle"),
            language: SNIPPET_LANGUAGE_AUTO,
            code: t("defaultSnippetCode"),
          });
          if (cancelled) return;
          importSnippets([created]);
          setRemoteListEpoch((e) => e + 1);
          list = useSnippetManagerStore.getState().snippets;
        }

        serverBootstrappedUid.current = user.uid;

        setSelectedId((prev) => {
          const hit = list.find((s) => s.id === prev);
          return hit?.id ?? list[0]?.id ?? null;
        });
      } catch {
        if (!cancelled) toast.error(t("toastLoadFailed"));
      } finally {
        serverBootstrapInFlight.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [storeHydrated, authLoading, user, t, importSnippets]);

  useEffect(() => {
    debouncedSaveCode.cancel();
    if (!selectedId) {
      setDraftTitle("");
      setDraftLanguage(SNIPPET_LANGUAGE_AUTO);
      setDraftCode("");
      return;
    }
    const sn = useSnippetManagerStore
      .getState()
      .snippets.find((s) => s.id === selectedId);
    if (!sn) return;
    setDraftTitle(sn.title);
    setDraftLanguage(sn.language);
    setDraftCode(sn.code);
  }, [selectedId, debouncedSaveCode, remoteListEpoch]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return snippets;
    return snippets.filter(
      (s) =>
        s.title.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    );
  }, [snippets, search]);

  const effectiveLanguage = useMemo(
    () => resolveEditorLanguage(draftLanguage, draftCode),
    [draftLanguage, draftCode]
  );

  const onCodeChange = useCallback(
    (code: string) => {
      setDraftCode(code);
      debouncedSaveCode(code);
    },
    [debouncedSaveCode]
  );

  const persistTitleLang = useCallback(
    (title: string, language: string) => {
      if (!selectedId) return;
      updateSnippet(selectedId, { title, language });
      const u = userRef.current;
      if (u) {
        void patchCodeSnippetApi(u, selectedId, { title, language })
          .then((s) =>
            useSnippetManagerStore.getState().mergeSnippetFromRemote(s)
          )
          .catch(() => toast.error(t("toastSyncFailed")));
      }
    },
    [selectedId, updateSnippet, t]
  );

  const handleNew = async () => {
    debouncedSaveCode.flush();
    const u = userRef.current;
    const payload = {
      title: t("newSnippetTitle"),
      code: "",
      language: SNIPPET_LANGUAGE_AUTO,
    };
    if (u) {
      try {
        const created = await createCodeSnippetApi(u, payload);
        useSnippetManagerStore.getState().mergeSnippetFromRemote(created);
        setSelectedId(created.id);
      } catch {
        toast.error(t("toastSyncFailed"));
        return;
      }
    } else {
      const id = addSnippet(payload);
      setSelectedId(id);
    }
    setMode("edit");
    setListOpen(false);
  };

  const handleCopy = async () => {
    if (!draftCode) {
      toast.message(t("toastNothingToCopy"));
      return;
    }
    try {
      await navigator.clipboard.writeText(draftCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(t("toastCopied"));
    } catch {
      toast.error(t("toastCopyFailed"));
    }
  };

  const handleFormat = async () => {
    if (mode === "view") setMode("edit");
    const lang = effectiveLanguage;

    if (lang === "json") {
      try {
        const parsed = JSON.parse(draftCode);
        const next = JSON.stringify(parsed, null, 2);
        setDraftCode(next);
        if (selectedId) {
          updateSnippet(selectedId, { code: next });
          const u = userRef.current;
          if (u) {
            void patchCodeSnippetApi(u, selectedId, { code: next })
              .then((s) =>
                useSnippetManagerStore.getState().mergeSnippetFromRemote(s)
              )
              .catch(() => toast.error(t("toastSyncFailed")));
          }
        }
        toast.success(t("toastFormatted"));
        return;
      } catch {
        toast.error(t("toastFormatJsonInvalid"));
        return;
      }
    }

    if (lang === "sql") {
      try {
        const { format } = await import("sql-formatter");
        const next = format(draftCode, { language: "sql" });
        setDraftCode(next);
        if (selectedId) {
          updateSnippet(selectedId, { code: next });
          const u = userRef.current;
          if (u) {
            void patchCodeSnippetApi(u, selectedId, { code: next })
              .then((s) =>
                useSnippetManagerStore.getState().mergeSnippetFromRemote(s)
              )
              .catch(() => toast.error(t("toastSyncFailed")));
          }
        }
        toast.success(t("toastFormatted"));
        return;
      } catch {
        toast.error(t("toastFormatFailed"));
        return;
      }
    }

    try {
      await monacoRef.current?.formatDocument();
      toast.success(t("toastFormatted"));
    } catch {
      toast.message(t("toastFormatUnsupported"));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    const u = userRef.current;
    if (u) {
      try {
        await deleteCodeSnippetApi(u, id);
      } catch {
        toast.error(t("toastSyncFailed"));
        return;
      }
    }
    removeSnippet(id);
    setDeleteTarget(null);
    if (selectedId === id) {
      const next = useSnippetManagerStore.getState().snippets[0];
      setSelectedId(next?.id ?? null);
    }
    toast.success(t("toastDeleted"));
  };

  const isMobile = useIsMobile();

  // ── Snippet list panel ───────────────────────────────────────────────────────

  const snippetList = (
    <div className="flex h-full min-h-0 flex-col">
      {/* Search + new */}
      <div className="mb-3 flex gap-1.5">
        <div className="relative flex-1">
          <IconSearch className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-8 pl-8 text-xs"
            aria-label={t("searchAria")}
          />
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0 cursor-pointer"
          onClick={handleNew}
          aria-label={t("newSnippet")}
        >
          <IconPlus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* List */}
      <ScrollArea className="min-h-0 flex-1">
        <ul className="space-y-0.5 pb-2 pr-1">
          {filtered.map((sn) => (
            <li key={sn.id}>
              <SnippetListItem
                sn={sn}
                selected={selectedId === sn.id}
                t={t}
                onClick={() => {
                  debouncedSaveCode.flush();
                  setSelectedId(sn.id);
                  setListOpen(false);
                }}
              />
            </li>
          ))}
        </ul>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <IconCode className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">{t("emptySearch")}</p>
          </div>
        )}
      </ScrollArea>

      {/* Count footer */}
      {filtered.length > 0 && (
        <div className="border-t border-border/50 pt-2">
          <p className="text-center text-[11px] text-muted-foreground/60">
            {filtered.length} {filtered.length === 1 ? "snippet" : "snippets"}
          </p>
        </div>
      )}
    </div>
  );

  // ── Editor panel — shared across mobile + desktop ─────────────────────────

  const editorPanel = (
    <div className="flex h-full min-h-0 flex-col">
      {/* Compact single-row toolbar */}
      <div className="flex shrink-0 items-center gap-1.5 border-b border-border/60 px-3 py-1.5">
        {/* Inline title */}
        <Input
          id="snippet-title-d"
          value={draftTitle}
          onChange={(e) => {
            const v = e.target.value;
            setDraftTitle(v);
            persistTitleLang(v, draftLanguage);
          }}
          placeholder={t("snippetTitlePlaceholder")}
          className="h-7 flex-1 border-0 bg-transparent px-1 text-sm font-medium shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          aria-label={t("snippetTitle")}
        />

        {/* Separator */}
        <div className="h-4 w-px shrink-0 bg-border/60" />

        {/* Language select */}
        <Select
          value={draftLanguage}
          onValueChange={(v) => {
            setDraftLanguage(v);
            persistTitleLang(draftTitle, v);
          }}
        >
          <SelectTrigger
            aria-label={t("language")}
            className="h-7 w-auto cursor-pointer gap-1.5 border-0 bg-muted/50 px-2 text-xs shadow-none focus:ring-0 hover:bg-muted [&>span]:max-w-[80px]"
          >
            <LangDot lang={effectiveLanguage} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SNIPPET_LANGUAGE_AUTO}>
              {t("languages.auto")}
            </SelectItem>
            {SNIPPET_MONACO_LANGUAGES.map((id) => (
              <SelectItem key={id} value={id}>
                {t(`languages.${id}` as never)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Auto-detect hint */}
        {draftLanguage === SNIPPET_LANGUAGE_AUTO && (
          <span className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex">
            <IconSparkles className="h-3 w-3 shrink-0" />
            {t(`languages.${effectiveLanguage}` as never)}
          </span>
        )}

        {/* Right-side actions */}
        <div className="ml-auto flex items-center gap-1">
          {/* View / Edit toggle */}
          <Tabs
            value={mode}
            onValueChange={(v) => setMode(v as EditorMode)}
          >
            <TabsList className="h-7">
              <TabsTrigger value="view" className="h-6 gap-1 px-2.5 text-xs">
                <IconEye className="h-3 w-3" />
                <span className="hidden sm:inline">{t("modeView")}</span>
              </TabsTrigger>
              <TabsTrigger value="edit" className="h-6 gap-1 px-2.5 text-xs">
                <IconPencil className="h-3 w-3" />
                <span className="hidden sm:inline">{t("modeEdit")}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="mx-1 h-4 w-px shrink-0 bg-border/60" />

          {/* Format */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 cursor-pointer"
            onClick={handleFormat}
            disabled={!draftCode.trim()}
            title={t("format")}
          >
            <IconSparkles className="h-3.5 w-3.5" />
          </Button>

          {/* Copy */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 cursor-pointer"
            onClick={handleCopy}
            title={copied ? t("copied") : t("copy")}
          >
            {copied ? (
              <IconCheck className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <IconCopy className="h-3.5 w-3.5" />
            )}
          </Button>

          {/* Delete */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-destructive"
            onClick={() => {
              const sn = snippets.find((s) => s.id === selectedId);
              if (sn) setDeleteTarget(sn);
            }}
            title={t("deleteTitle")}
          >
            <IconTrash className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Monaco editor — fills remaining space */}
      <div className="min-h-0 flex-1">
        <SnippetMonaco
          ref={monacoRef}
          value={draftCode}
          onChange={mode === "edit" ? onCodeChange : undefined}
          language={effectiveLanguage}
          readOnly={mode === "view"}
          aria-label={t("editorAria")}
        />
      </div>
    </div>
  );

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!selectedId && snippets.length === 0) {
    return (
      <ToolWrapper toolId="snippet-manager" maxWidth="full" fillMain className="min-h-0">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4">
          <div className="flex items-center gap-2">
            <Button onClick={handleNew}>{t("newSnippet")}</Button>
            <ToolPinButton toolId="snippet-manager" className="h-9 w-9" />
          </div>
        </div>
      </ToolWrapper>
    );
  }

  // ── Mobile layout ─────────────────────────────────────────────────────────

  if (isMobile) {
    return (
      <ToolWrapper toolId="snippet-manager" maxWidth="full" fillMain className="min-h-0">
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          {/* Mobile top bar */}
          <div className="flex shrink-0 items-center gap-1.5">
            <Sheet open={listOpen} onOpenChange={setListOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-left transition-colors hover:bg-muted"
                >
                  <IconMenu2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-sm font-medium">
                    {draftTitle || t("snippets")}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {filtered.length}
                  </span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[75vh] rounded-t-2xl p-0">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <SheetTitle className="text-base">{t("snippets")}</SheetTitle>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-8 gap-1.5"
                    onClick={handleNew}
                  >
                    <IconPlus className="h-3.5 w-3.5" />
                    {t("newSnippet")}
                  </Button>
                </div>
                <div className="h-[calc(75vh-4rem)] p-4">{snippetList}</div>
              </SheetContent>
            </Sheet>
            <ToolPinButton toolId="snippet-manager" className="h-9 w-9 shrink-0" />
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-9 w-9 shrink-0 cursor-pointer"
              onClick={handleNew}
              aria-label={t("newSnippet")}
            >
              <IconPlus className="h-4 w-4" />
            </Button>
          </div>

          {/* Editor card */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/50">
            {editorPanel}
          </div>
        </div>

        <DeleteDialog
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
          t={t}
        />
      </ToolWrapper>
    );
  }

  // ── Desktop layout ────────────────────────────────────────────────────────

  return (
    <ToolWrapper toolId="snippet-manager" maxWidth="full" fillMain className="min-h-0">
      <div className="flex min-h-0 flex-1 flex-col gap-1.5">
        <ResizablePanelGroup
          direction="horizontal"
          className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border/50 md:rounded-xl"
        >
          {/* List panel */}
          <ResizablePanel defaultSize={26} minSize={18} maxSize={38}>
            <div className="flex h-full min-h-0 flex-col border-r border-border/50">
              {/* List header */}
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/50 px-2 py-1.5 sm:px-3 sm:py-2">
                <span className="min-w-0 truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("snippets")}
                </span>
                <div className="flex shrink-0 items-center gap-0.5">
                  <ToolPinButton toolId="snippet-manager" className="h-6 w-6" />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 cursor-pointer"
                    onClick={handleNew}
                    aria-label={t("newSnippet")}
                  >
                    <IconPlus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Search */}
              <div className="shrink-0 px-3 py-2">
                <div className="relative">
                  <IconSearch className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("searchPlaceholder")}
                    className="h-7 pl-8 text-xs"
                    aria-label={t("searchAria")}
                  />
                </div>
              </div>

              {/* List */}
              <ScrollArea className="min-h-0 flex-1 px-2 pb-2">
                <ul className="space-y-0.5">
                  {filtered.map((sn) => (
                    <li key={sn.id}>
                      <SnippetListItem
                        sn={sn}
                        selected={selectedId === sn.id}
                        t={t}
                        onClick={() => {
                          debouncedSaveCode.flush();
                          setSelectedId(sn.id);
                        }}
                      />
                    </li>
                  ))}
                </ul>
                {filtered.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <IconCode className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">{t("emptySearch")}</p>
                  </div>
                )}
              </ScrollArea>

              {/* Count */}
              {filtered.length > 0 && (
                <div className="shrink-0 border-t border-border/50 px-3 py-2">
                  <p className="text-center text-[11px] text-muted-foreground/60">
                    {filtered.length}{" "}
                    {filtered.length === 1 ? "snippet" : "snippets"}
                  </p>
                </div>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Editor panel */}
          <ResizablePanel defaultSize={74} minSize={40}>
            {editorPanel}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <DeleteDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        t={t}
      />
    </ToolWrapper>
  );
}

// ── Delete dialog ─────────────────────────────────────────────────────────────

function DeleteDialog({
  target,
  onClose,
  onConfirm,
  t,
}: {
  target: CodeSnippet | null;
  onClose: () => void;
  onConfirm: () => void;
  t: ReturnType<typeof useTranslations<"SnippetManager">>;
}) {
  return (
    <AlertDialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("deleteDescription", { title: target?.title ?? "" })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t("deleteConfirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
