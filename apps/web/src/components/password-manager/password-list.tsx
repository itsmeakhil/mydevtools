"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { usePasswordStore } from "@/store/password-store"
import { useMasterKeyStore } from "@/store/master-key-store"
import { clearMasterKey } from "@/lib/key-storage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Copy, Eye, EyeOff, Trash2, ExternalLink, LayoutGrid, List, Lock, Pencil, MoreVertical, FileJson, Plus, ShieldCheck, AlertTriangle, Repeat, Link2Off, X, ShieldX } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { toast } from "sonner"
import { auth } from "@/database/firebase"
import { deletePasswordEntry } from "@/lib/password-manager-api"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { EditPasswordDialog } from "./edit-password-dialog"
import { AddPasswordDialog } from "./add-password-dialog"
import { PasswordEntry } from "@/store/password-store"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { calculatePasswordStrength, getStrengthColor, getFaviconUrl } from "@/lib/password-utils"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { ImportExportDialog } from "./import-export-dialog"
import { useIsMobile } from "@/components/hooks/use-mobile"
import { PasswordItemSwipeable } from "./password-item-swipeable"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { PasswordCard } from "./password-card"
import { SecurityDashboard } from "./security-dashboard"
import { BreachCheckDialog } from "./breach-check-dialog"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { useTranslations } from "next-intl"
import { checkPasswordsBreached } from "@/lib/hibp"

export function PasswordList() {
    const t = useTranslations("PasswordManager.list")
    const tToast = useTranslations("PasswordManager.toasts")
    const { passwords, deletePassword, clearPasswords, isLoading, breachCounts, breachStatus, setBreachResults, setBreachStatus, setBreachProgress, clearBreachResults } = usePasswordStore()
    const { clearKey: clearMasterKeyStore } = useMasterKeyStore()
    const [searchTerm, setSearchTerm] = useState("")
    const [breachDialogOpen, setBreachDialogOpen] = useState(false)
    const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
    const [quickFilter, setQuickFilter] = useState<"all" | "weak" | "reused" | "no-url">("all")
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [passwordToDelete, setPasswordToDelete] = useState<string | null>(null)
    const [editingPassword, setEditingPassword] = useState<PasswordEntry | null>(null)
    const isMobile = useIsMobile()
    const searchInputRef = useRef<HTMLInputElement>(null)

    const reusedPasswordIds = useMemo(() => {
        const passwordToIds = new Map<string, string[]>()
        passwords.forEach((entry) => {
            const list = passwordToIds.get(entry.password) || []
            list.push(entry.id)
            passwordToIds.set(entry.password, list)
        })

        const reusedIds = new Set<string>()
        passwordToIds.forEach((ids) => {
            if (ids.length > 1) {
                ids.forEach((id) => reusedIds.add(id))
            }
        })
        return reusedIds
    }, [passwords])

    const filteredPasswords = useMemo(() => {
        const bySearch = passwords.filter(p =>
            p.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
        )

        if (quickFilter === "weak") {
            return bySearch.filter((entry) => calculatePasswordStrength(entry.password) <= 2)
        }
        if (quickFilter === "reused") {
            return bySearch.filter((entry) => reusedPasswordIds.has(entry.id))
        }
        if (quickFilter === "no-url") {
            return bySearch.filter((entry) => !entry.url?.trim())
        }
        return bySearch
    }, [passwords, searchTerm, quickFilter, reusedPasswordIds])

    const weakCount = useMemo(
        () => passwords.filter((entry) => calculatePasswordStrength(entry.password) <= 2).length,
        [passwords]
    )
    const noUrlCount = useMemo(
        () => passwords.filter((entry) => !entry.url?.trim()).length,
        [passwords]
    )
    const reusedCount = reusedPasswordIds.size
    const hasActiveQuickFilter = quickFilter !== "all"

    // Auto-run breach check in background when vault unlocks
    useEffect(() => {
        if (passwords.length > 0 && breachStatus === "idle") {
            const run = async () => {
                setBreachStatus("checking")
                try {
                    const results = await checkPasswordsBreached(
                        passwords.map((p) => ({ id: p.id, password: p.password })),
                        (checked, total) => setBreachProgress(checked, total)
                    )
                    setBreachResults(results)
                    setBreachStatus("done")
                } catch {
                    setBreachStatus("error")
                }
            }
            void run()
        }
    }, [passwords.length, breachStatus]) // eslint-disable-line react-hooks/exhaustive-deps

    const breachedCount = breachStatus === "done"
        ? passwords.filter((p) => (breachCounts.get(p.id) ?? 0) > 0).length
        : 0

    // Each scroll context has its own container ref + infinite scroll hook instance.
    // This is required because app-content.tsx uses overflow-hidden on the outer wrapper,
    // so IntersectionObserver needs to use each list's own scrollable div as the root.
    const mobileScrollerRef = useRef<HTMLDivElement>(null)
    const desktopScrollerRef = useRef<HTMLDivElement>(null)

    const {
        displayCount: mobileDisplayCount,
        sentinelRef: mobileSentinelRef,
        hasMore: mobileHasMore,
    } = useInfiniteScroll({
        totalCount: filteredPasswords.length,
        resetKey: `${searchTerm}-${quickFilter}`,
        scrollContainerRef: mobileScrollerRef,
    })

    const {
        displayCount: desktopDisplayCount,
        sentinelRef: desktopSentinelRef,
        hasMore: desktopHasMore,
    } = useInfiniteScroll({
        totalCount: filteredPasswords.length,
        resetKey: `${searchTerm}-${quickFilter}`,
        scrollContainerRef: desktopScrollerRef,
    })

    const mobilePasswords = filteredPasswords.slice(0, mobileDisplayCount)
    const desktopPasswords = filteredPasswords.slice(0, desktopDisplayCount)

    const toggleVisibility = (id: string) => {
        const newVisible = new Set(visiblePasswords)
        if (newVisible.has(id)) {
            newVisible.delete(id)
        } else {
            newVisible.add(id)
        }
        setVisiblePasswords(newVisible)
    }

    const showAllVisible = () => {
        setVisiblePasswords(new Set(filteredPasswords.map((entry) => entry.id)))
    }

    const hideAllVisible = () => {
        setVisiblePasswords(new Set())
    }

    const copyToClipboard = (text: string, type: "Password" | "Username" = "Password") => {
        navigator.clipboard.writeText(text)
        toast.success(type === "Username" ? tToast("copiedUsername") : tToast("copiedPassword"))
    }

    const handleDeleteClick = (id: string) => {
        setPasswordToDelete(id)
        setDeleteConfirmOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!auth.currentUser || !passwordToDelete) return

        try {
            await deletePasswordEntry(passwordToDelete)
            deletePassword(passwordToDelete)
            toast.success(tToast("passwordDeleted"))
        } catch (error) {
            console.error("Error deleting password:", error)
            toast.error(tToast("deleteFailed"))
        } finally {
            setDeleteConfirmOpen(false)
            setPasswordToDelete(null)
        }
    }

    const handleLock = async () => {
        clearPasswords()           // wipe decrypted passwords from memory
        clearMasterKeyStore()      // clear global key from Zustand
        await clearMasterKey()     // clear global key from IndexedDB
        toast.success(tToast("vaultLocked"))
    }

    const clearFilters = () => {
        setSearchTerm("")
        setQuickFilter("all")
    }

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null
            const isTyping =
                target?.tagName === "INPUT" ||
                target?.tagName === "TEXTAREA" ||
                target?.isContentEditable

            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault()
                searchInputRef.current?.focus()
            }

            if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "l") {
                event.preventDefault()
                void handleLock()
            }

            if (event.key === "/" && !isTyping) {
                event.preventDefault()
                searchInputRef.current?.focus()
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [handleLock])

    if (isLoading) {
        return (
            <div className={cn(
                "flex flex-col items-center justify-center text-center space-y-4",
                isMobile ? "min-h-[60vh]" : "py-16"
            )}>
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
                <p className="text-sm text-muted-foreground">{t("loading")}</p>
            </div>
        )
    }

    if (passwords.length === 0 && !searchTerm) {
        return (
            <div className={cn(
                "flex flex-col items-center justify-center text-center space-y-4",
                isMobile
                    ? "min-h-[50vh] px-8"
                    : "py-16 border-2 border-dashed rounded-lg border-muted/50 bg-muted/10"
            )}>
                <div className={cn(
                    "rounded-full flex items-center justify-center",
                    isMobile ? "h-20 w-20 bg-primary/10" : "h-16 w-16 bg-muted"
                )}>
                    <Lock className={cn(
                        "text-muted-foreground",
                        isMobile ? "h-10 w-10 text-primary" : "h-8 w-8"
                    )} />
                </div>
                <div className="space-y-2">
                    <h3 className={cn("font-semibold", isMobile ? "text-xl" : "text-lg")}>{t("emptyTitle")}</h3>
                    <p className="text-muted-foreground text-sm max-w-[280px]">
                        {isMobile
                            ? t("emptyHintMobile")
                            : t("emptyHintDesktop")}
                    </p>
                </div>
                {isMobile && (
                    <AddPasswordDialog>
                        <Button size="lg" className="mt-4 rounded-xl">
                            <Plus className="mr-2 h-5 w-5" /> {t("addPassword")}
                        </Button>
                    </AddPasswordDialog>
                )}
            </div>
        )
    }

    return (
        <div className={cn(
            isMobile ? "flex flex-col h-full" : "flex-1 flex flex-col min-h-0"
        )}>
            {/* Mobile Header */}
            {isMobile && (
                <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b pb-4 pt-2 shrink-0">
                    <div className="flex items-center gap-2 px-4 py-2">
                        <SidebarTrigger className="-ml-2 h-10 w-10 text-muted-foreground/80 hover:bg-transparent hover:text-foreground" />

                        <div className="relative flex-1 h-10">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
                            <Input
                                ref={searchInputRef}
                                placeholder={t("searchPlaceholderMobile")}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 h-10 bg-muted/50 border-transparent rounded-lg focus-visible:ring-1 text-sm placeholder:text-muted-foreground/70"
                            />
                            {searchTerm && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1 h-8 w-8"
                                    onClick={() => setSearchTerm("")}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>

                        <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/20">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-8 w-8",
                                    viewMode === "grid"
                                        ? "bg-background text-primary shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                                onClick={() => setViewMode("grid")}
                                aria-label={t("gridViewAria")}
                            >
                                <LayoutGrid className="h-4.5 w-4.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-8 w-8",
                                    viewMode === "list"
                                        ? "bg-background text-primary shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                                onClick={() => setViewMode("list")}
                                aria-label={t("listViewAria")}
                            >
                                <List className="h-4.5 w-4.5" />
                            </Button>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground/80">
                                    <MoreVertical className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <ImportExportDialog>
                                    <Button variant="ghost" className="w-full justify-start h-9 px-2 font-normal">
                                        <FileJson className="mr-2 h-4 w-4" /> {t("importExport")}
                                    </Button>
                                </ImportExportDialog>
                                <DropdownMenuItem onClick={() => setBreachDialogOpen(true)} className="gap-2">
                                    <ShieldX className="h-4 w-4" />
                                    <span>Breach Check</span>
                                    {breachedCount > 0 && (
                                        <span className="ml-auto h-5 min-w-5 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-bold px-1">
                                            {breachedCount}
                                        </span>
                                    )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleLock}>
                                    <Lock className="mr-2 h-4 w-4" /> {t("lockVault")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="px-4 mt-2 mb-1 flex items-center gap-2">
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("allPasswordsTitle")}</h1>
                            <p className="text-sm text-muted-foreground mt-0.5">{t("passwordCount", { count: passwords.length })}</p>
                        </div>
                        <Drawer>
                            <DrawerTrigger asChild>
                                <Button variant="outline" size="icon" className="h-9 w-9 rounded-full shrink-0 border-muted-foreground/20 text-muted-foreground hover:text-green-600 hover:border-green-600/30 hover:bg-green-500/10 transition-all">
                                    <ShieldCheck className="h-5 w-5" />
                                </Button>
                            </DrawerTrigger>
                            <DrawerContent className="max-h-[85vh]">
                                <DrawerHeader className="border-b pb-4 mb-4">
                                    <DrawerTitle className="text-center font-bold text-lg">{t("vaultHealthDrawerTitle")}</DrawerTitle>
                                </DrawerHeader>
                                <div className="px-4 pb-8 overflow-y-auto">
                                    <SecurityDashboard minimal={false} />
                                </div>
                            </DrawerContent>
                        </Drawer>
                    </div>
                    <div className="px-4 pb-2 flex items-center gap-2 overflow-x-auto scrollbar-hide">
                        <Button size="sm" variant={quickFilter === "all" ? "default" : "outline"} className="h-7 rounded-full text-xs" onClick={() => setQuickFilter("all")}>
                            All
                        </Button>
                        <Button size="sm" variant={quickFilter === "weak" ? "default" : "outline"} className="h-7 rounded-full text-xs gap-1.5" onClick={() => setQuickFilter("weak")}>
                            <AlertTriangle className="h-3 w-3" /> {weakCount}
                        </Button>
                        <Button size="sm" variant={quickFilter === "reused" ? "default" : "outline"} className="h-7 rounded-full text-xs gap-1.5" onClick={() => setQuickFilter("reused")}>
                            <Repeat className="h-3 w-3" /> {reusedCount}
                        </Button>
                        <Button size="sm" variant={quickFilter === "no-url" ? "default" : "outline"} className="h-7 rounded-full text-xs gap-1.5" onClick={() => setQuickFilter("no-url")}>
                            <Link2Off className="h-3 w-3" /> {noUrlCount}
                        </Button>
                    </div>
                </div>
            )}

            {/* Desktop Search Bar */}
            {!isMobile && (
                <div className="flex gap-2 items-center z-40 transition-all duration-200 shrink-0 pb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            ref={searchInputRef}
                            placeholder={t("searchPlaceholderDesktop")}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 h-10 bg-background/50 backdrop-blur-sm"
                        />
                        {searchTerm && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1 h-8 w-8"
                                onClick={() => setSearchTerm("")}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 border rounded-lg p-1 bg-muted/20">
                        <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "grid" | "list")}>
                            <ToggleGroupItem
                                value="grid"
                                size="sm"
                                aria-label={t("gridViewAria")}
                                className="data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm text-muted-foreground"
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </ToggleGroupItem>
                            <ToggleGroupItem
                                value="list"
                                size="sm"
                                aria-label={t("listViewAria")}
                                className="data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm text-muted-foreground"
                            >
                                <List className="h-4 w-4" />
                            </ToggleGroupItem>
                        </ToggleGroup>
                    </div>
                    <ImportExportDialog />
                    <Button variant="outline" size="sm" onClick={visiblePasswords.size > 0 ? hideAllVisible : showAllVisible} className="h-10 text-xs">
                        {visiblePasswords.size > 0 ? <><EyeOff className="h-3.5 w-3.5 mr-1.5" /> Hide all</> : <><Eye className="h-3.5 w-3.5 mr-1.5" /> Show all</>}
                    </Button>
                    <div
                        className="relative inline-flex rounded-md"
                        style={{
                            filter: breachedCount > 0
                                ? "drop-shadow(0 0 4px rgb(239 68 68 / 0.7))"
                                : "drop-shadow(0 0 4px hsl(var(--primary) / 0.6))"
                        }}
                    >
                        <span className="absolute inset-0 rounded-md overflow-hidden pointer-events-none">
                            <span
                                className="absolute -inset-full animate-spin [animation-duration:2s]"
                                style={{
                                    background: breachedCount > 0
                                        ? "conic-gradient(from 0deg, rgb(239 68 68/.2) 0deg, rgb(239 68 68) 45deg, rgb(239 68 68/.15) 90deg, rgb(239 68 68/.1) 180deg, rgb(239 68 68/.2) 270deg, rgb(239 68 68) 315deg, rgb(239 68 68/.2) 360deg)"
                                        : "conic-gradient(from 0deg, hsl(var(--primary)/.2) 0deg, hsl(var(--primary)) 45deg, hsl(var(--primary)/.15) 90deg, hsl(var(--primary)/.1) 180deg, hsl(var(--primary)/.2) 270deg, hsl(var(--primary)) 315deg, hsl(var(--primary)/.2) 360deg)"
                                }}
                            />
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setBreachDialogOpen(true)}
                            title="Check passwords against data breaches"
                            className={cn(
                                "relative z-10 m-[1.5px] h-[calc(2.5rem-3px)] text-xs border-0 bg-background dark:bg-background hover:bg-background dark:hover:bg-background shadow-none rounded-[5px]",
                                breachedCount > 0 && "text-red-500"
                            )}
                        >
                            <ShieldX className="h-3.5 w-3.5 mr-1.5" /> Breach Check
                            {breachedCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-bold">
                                    {breachedCount}
                                </span>
                            )}
                        </Button>
                    </div>
                    <Button variant="outline" size="icon" onClick={handleLock} title={t("lockVault")} className="h-10 w-10">
                        <Lock className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {!isMobile && (
                <div className="mb-4 flex items-center gap-2 flex-wrap">
                    <Button size="sm" variant={quickFilter === "all" ? "default" : "outline"} className="h-7 rounded-full text-xs" onClick={() => setQuickFilter("all")}>
                        All ({passwords.length})
                    </Button>
                    <Button size="sm" variant={quickFilter === "weak" ? "default" : "outline"} className="h-7 rounded-full text-xs gap-1.5" onClick={() => setQuickFilter("weak")}>
                        <AlertTriangle className="h-3 w-3" /> Weak ({weakCount})
                    </Button>
                    <Button size="sm" variant={quickFilter === "reused" ? "default" : "outline"} className="h-7 rounded-full text-xs gap-1.5" onClick={() => setQuickFilter("reused")}>
                        <Repeat className="h-3 w-3" /> Reused ({reusedCount})
                    </Button>
                    <Button size="sm" variant={quickFilter === "no-url" ? "default" : "outline"} className="h-7 rounded-full text-xs gap-1.5" onClick={() => setQuickFilter("no-url")}>
                        <Link2Off className="h-3 w-3" /> No URL ({noUrlCount})
                    </Button>
                    {(hasActiveQuickFilter || searchTerm) && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={clearFilters}>
                            <X className="h-3.5 w-3.5 mr-1" /> Reset
                        </Button>
                    )}
                    <div className="ml-auto text-[10px] text-muted-foreground border rounded px-1.5 py-0.5 hidden lg:block">
                        Cmd/Ctrl+K search • Cmd/Ctrl+Shift+L lock
                    </div>
                </div>
            )}

            {filteredPasswords.length === 0 ? (
                <div className={cn(
                    "text-center text-muted-foreground",
                    isMobile ? "py-16 px-8" : "py-12"
                )}>
                    <p className="text-sm">{t("noResults", { query: searchTerm })}</p>
                </div>
            ) : isMobile ? (
                /* ── Mobile: single scrollable container as IntersectionObserver root ── */
                <div
                    ref={mobileScrollerRef}
                    className="flex-1 overflow-y-auto pb-24"
                >
                    {viewMode === "grid" ? (
                        <div className="grid grid-cols-2 gap-3 px-4 pt-2">
                            {mobilePasswords.map(entry => (
                                <PasswordCard
                                    key={entry.id}
                                    entry={entry}
                                    isVisible={visiblePasswords.has(entry.id)}
                                    isReused={reusedPasswordIds.has(entry.id)}
                                    onToggleVisibility={toggleVisibility}
                                    onCopy={copyToClipboard}
                                    onDelete={handleDeleteClick}
                                    onEdit={setEditingPassword}
                                />
                            ))}
                            {/* sentinel — callback ref re-attaches when view mode changes */}
                            <div ref={mobileSentinelRef} className="col-span-2" />
                            {mobileHasMore && (
                                <div className="col-span-2 flex justify-center py-4">
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="px-4 pt-2 space-y-3">
                            {mobilePasswords.map((entry) => (
                                <PasswordItemSwipeable
                                    key={entry.id}
                                    entry={entry}
                                    onCopy={(text) => copyToClipboard(text)}
                                    onDelete={(id) => handleDeleteClick(id)}
                                    onEdit={(entry) => setEditingPassword(entry)}
                                    onToggleVisibility={(id) => toggleVisibility(id)}
                                    isVisible={visiblePasswords.has(entry.id)}
                                />
                            ))}
                            <div ref={mobileSentinelRef} />
                            {mobileHasMore && (
                                <div className="flex justify-center py-4">
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                /* ── Desktop: own scrollable container as IntersectionObserver root ── */
                <div ref={desktopScrollerRef} className="flex-1 overflow-y-auto min-h-0">
                    {viewMode === "grid" ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {desktopPasswords.map((entry) => (
                                <PasswordCard
                                    key={entry.id}
                                    entry={entry}
                                    isVisible={visiblePasswords.has(entry.id)}
                                    isReused={reusedPasswordIds.has(entry.id)}
                                    onToggleVisibility={toggleVisibility}
                                    onCopy={copyToClipboard}
                                    onDelete={handleDeleteClick}
                                    onEdit={setEditingPassword}
                                />
                            ))}
                            <div ref={desktopSentinelRef} className="col-span-full" />
                            {desktopHasMore && (
                                <div className="col-span-full flex justify-center py-6">
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-md border bg-card/50 backdrop-blur-sm overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[250px]">{t("tableService")}</TableHead>
                                        <TableHead className="w-[200px]">{t("tableUsername")}</TableHead>
                                        <TableHead className="w-[250px]">{t("tablePassword")}</TableHead>
                                        <TableHead>{t("tableUrl")}</TableHead>
                                        <TableHead className="text-right">{t("tableActions")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {desktopPasswords.map((entry) => (
                                        <TableRow key={entry.id} className="group hover:bg-muted/30 transition-colors">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm select-none overflow-hidden">
                                                        {entry.url && getFaviconUrl(entry.url) ? (
                                                            <img
                                                                src={getFaviconUrl(entry.url)!}
                                                                alt={entry.service}
                                                                className="h-5 w-5 object-contain"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                                                }}
                                                            />
                                                        ) : null}
                                                        <span className={cn(entry.url && getFaviconUrl(entry.url) ? "hidden" : "")}>
                                                            {entry.service.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="truncate font-medium">{entry.service}</span>
                                                        {entry.tags && entry.tags.length > 0 && (
                                                            <div className="flex gap-1 mt-0.5">
                                                                {entry.tags.slice(0, 2).map(tag => (
                                                                    <span key={tag} className="text-[10px] text-muted-foreground bg-muted px-1 rounded">
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                <div className="flex items-center gap-2 group/username">
                                                    {entry.username}
                                                    <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover/username:opacity-100 transition-opacity" onClick={() => copyToClipboard(entry.username, "Username")}>
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 max-w-[200px]">
                                                    <div className="font-mono text-sm truncate flex-1 bg-muted/30 px-2 py-1 rounded border border-border/50">
                                                        {visiblePasswords.has(entry.id) ? entry.password : "••••••••••••"}
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-background shrink-0" onClick={() => toggleVisibility(entry.id)}>
                                                        {visiblePasswords.has(entry.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-background shrink-0" onClick={() => copyToClipboard(entry.password)}>
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                    <div className={cn("w-1.5 h-1.5 rounded-full", getStrengthColor(calculatePasswordStrength(entry.password)))} title={t("passwordStrengthTitle")} />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {entry.url ? (
                                                    <a href={entry.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate max-w-[150px] block">
                                                        {entry.url.replace(/^https?:\/\//, '')}
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => setEditingPassword(entry)}>
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            {t("edit")}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleDeleteClick(entry.id)} className="text-destructive focus:text-destructive">
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            {t("delete")}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {/* Infinite scroll sentinel for table view */}
                            <div ref={desktopSentinelRef} />
                            {desktopHasMore && (
                                <div className="flex justify-center py-4 border-t">
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("deleteDialogTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("deleteDialogDescription")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {t("delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {editingPassword && (
                <EditPasswordDialog
                    entry={editingPassword}
                    open={!!editingPassword}
                    onOpenChange={(open) => !open && setEditingPassword(null)}
                />
            )}

            <BreachCheckDialog open={breachDialogOpen} onOpenChange={setBreachDialogOpen} />
        </div>
    )
}
