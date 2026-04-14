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
import { ToolHeader } from "@/components/tools/tool-header";
import { ToolWrapper } from "@/components/tools/tool-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  /** Bumps when the snippet list is replaced from the server so drafts re-sync (selectedId may be unchanged). */
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

  const snippetList = (
    <div className="flex h-full min-h-0 flex-col border-border/60 md:border-r md:pr-2">
      <div className="mb-2 flex gap-2">
        <div className="relative flex-1">
          <IconSearch className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-9 pl-8"
            aria-label={t("searchAria")}
          />
        </div>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="h-9 w-9 shrink-0"
          onClick={handleNew}
          aria-label={t("newSnippet")}
        >
          <IconPlus className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1 pr-2">
        <ul className="space-y-1 pb-2">
          {filtered.map((sn) => (
            <li key={sn.id}>
              <button
                type="button"
                onClick={() => {
                  debouncedSaveCode.flush();
                  setSelectedId(sn.id);
                  setListOpen(false);
                }}
                className={cn(
                  "flex w-full flex-col rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  selectedId === sn.id
                    ? "border-primary/50 bg-primary/10"
                    : "border-transparent hover:bg-muted/80"
                )}
              >
                <span className="truncate font-medium">{sn.title}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {sn.language === SNIPPET_LANGUAGE_AUTO
                    ? t("badgeAuto", {
                        lang: t(
                          `languages.${resolveEditorLanguage(SNIPPET_LANGUAGE_AUTO, sn.code)}` as never
                        ),
                      })
                    : t(`languages.${sn.language}` as never)}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("emptySearch")}
          </p>
        )}
      </ScrollArea>
    </div>
  );

  if (!selectedId && snippets.length === 0) {
    return (
      <ToolWrapper toolId="snippet-manager" maxWidth="full" className="p-4">
        <Button onClick={handleNew}>{t("newSnippet")}</Button>
      </ToolWrapper>
    );
  }

  return (
    <ToolWrapper toolId="snippet-manager" maxWidth="full" className="min-h-0">
      <div className="flex h-full min-h-0 flex-1 flex-col gap-3 p-2 md:p-4">
        <ToolHeader
          title={t("title")}
          description={t("subtitle")}
          toolId="snippet-manager"
        />

        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {isMobile ? (
            <div className="flex items-center gap-2 shrink-0">
              {/* Current snippet name + open list button */}
              <Sheet open={listOpen} onOpenChange={setListOpen}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className="flex flex-1 min-w-0 items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-left transition-colors hover:bg-muted"
                  >
                    <IconMenu2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm font-medium">
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
                      className="gap-1.5 h-8"
                      onClick={handleNew}
                    >
                      <IconPlus className="h-3.5 w-3.5" />
                      {t("newSnippet")}
                    </Button>
                  </div>
                  <div className="p-4 h-[calc(75vh-4rem)]">{snippetList}</div>
                </SheetContent>
              </Sheet>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-10 w-10 shrink-0 p-0"
                onClick={handleNew}
                aria-label={t("newSnippet")}
              >
                <IconPlus className="h-4 w-4" />
              </Button>
            </div>
          ) : null}

          {isMobile ? (
            <div className="flex flex-1 min-h-0 flex-col rounded-lg border border-border/50">
              <div className="flex h-full min-h-0 flex-col gap-3 p-3">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="grid min-w-[140px] flex-1 gap-1.5">
                    <Label htmlFor="snippet-title">{t("snippetTitle")}</Label>
                    <Input
                      id="snippet-title"
                      value={draftTitle}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDraftTitle(v);
                        persistTitleLang(v, draftLanguage);
                      }}
                      placeholder={t("snippetTitlePlaceholder")}
                    />
                  </div>
                  <div className="grid w-full min-w-[160px] max-w-xs gap-1.5 sm:w-auto">
                    <Label>{t("language")}</Label>
                    <Select
                      value={draftLanguage}
                      onValueChange={(v) => {
                        setDraftLanguage(v);
                        persistTitleLang(draftTitle, v);
                      }}
                    >
                      <SelectTrigger aria-label={t("language")}>
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
                  </div>
                </div>

                {draftLanguage === SNIPPET_LANGUAGE_AUTO && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <IconSparkles className="h-3.5 w-3.5 shrink-0" />
                    {t("detectedHint", {
                      lang: t(`languages.${effectiveLanguage}` as never),
                    })}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Tabs
                    value={mode}
                    onValueChange={(v) => setMode(v as EditorMode)}
                  >
                    <TabsList className="h-9">
                      <TabsTrigger value="view" className="gap-1.5 px-3">
                        <IconEye className="h-3.5 w-3.5" />
                        {t("modeView")}
                      </TabsTrigger>
                      <TabsTrigger value="edit" className="gap-1.5 px-3">
                        <IconPencil className="h-3.5 w-3.5" />
                        {t("modeEdit")}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <div className="ml-auto flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <IconCheck className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <IconCopy className="h-4 w-4" />
                      )}
                      {copied ? t("copied") : t("copy")}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleFormat}
                      disabled={!draftCode.trim()}
                    >
                      {t("format")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        const sn = snippets.find((s) => s.id === selectedId);
                        if (sn) setDeleteTarget(sn);
                      }}
                    >
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

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
            </div>
          ) : (
            <ResizablePanelGroup
              direction="horizontal"
              className="min-h-[480px] flex-1 rounded-lg border border-border/50"
            >
              <ResizablePanel defaultSize={28} minSize={18} maxSize={40}>
                <div className="h-full p-3">{snippetList}</div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={72} minSize={40}>
                <div className="flex h-full min-h-0 flex-col gap-3 p-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="grid min-w-[140px] flex-1 gap-1.5">
                      <Label htmlFor="snippet-title-d">{t("snippetTitle")}</Label>
                      <Input
                        id="snippet-title-d"
                        value={draftTitle}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDraftTitle(v);
                          persistTitleLang(v, draftLanguage);
                        }}
                        placeholder={t("snippetTitlePlaceholder")}
                      />
                    </div>
                    <div className="grid w-full min-w-[160px] max-w-xs gap-1.5 sm:w-auto">
                      <Label>{t("language")}</Label>
                      <Select
                        value={draftLanguage}
                        onValueChange={(v) => {
                          setDraftLanguage(v);
                          persistTitleLang(draftTitle, v);
                        }}
                      >
                        <SelectTrigger aria-label={t("language")}>
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
                    </div>
                  </div>

                  {draftLanguage === SNIPPET_LANGUAGE_AUTO && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <IconSparkles className="h-3.5 w-3.5 shrink-0" />
                      {t("detectedHint", {
                        lang: t(`languages.${effectiveLanguage}` as never),
                      })}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <Tabs
                      value={mode}
                      onValueChange={(v) => setMode(v as EditorMode)}
                    >
                      <TabsList className="h-9">
                        <TabsTrigger value="view" className="gap-1.5 px-3">
                          <IconEye className="h-3.5 w-3.5" />
                          {t("modeView")}
                        </TabsTrigger>
                        <TabsTrigger value="edit" className="gap-1.5 px-3">
                          <IconPencil className="h-3.5 w-3.5" />
                          {t("modeEdit")}
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <div className="ml-auto flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={handleCopy}
                      >
                        {copied ? (
                          <IconCheck className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <IconCopy className="h-4 w-4" />
                        )}
                        {copied ? t("copied") : t("copy")}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleFormat}
                        disabled={!draftCode.trim()}
                      >
                        {t("format")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          const sn = snippets.find((s) => s.id === selectedId);
                          if (sn) setDeleteTarget(sn);
                        }}
                      >
                        <IconTrash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

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
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </div>
      </div>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription", { title: deleteTarget?.title ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ToolWrapper>
  );
}
