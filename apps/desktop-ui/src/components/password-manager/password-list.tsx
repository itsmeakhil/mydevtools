"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { usePasswordStore } from "@/store/password-store"
import { useMasterKeyStore } from "@/store/master-key-store"
import { clearMasterKey } from "@/lib/key-storage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Copy, Eye, EyeOff, Trash2, ExternalLink, LayoutGrid, List, Lock, Pencil, MoreVertical, FileJson, Plus, ShieldCheck, AlertTriangle, Repeat, Link2Off, X, ShieldX, Clock, ArrowUpDown } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { toast } from "sonner"
import { deletePasswordEntry } from "@/lib/password-manager-api"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { EditPasswordDialog } from "./edit-password-dialog"
import { AddPasswordDialog } from "./add-password-dialog"
import { PasswordEntry } from "@/store/password-store"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { CLIPBOARD_CLEAR_SECONDS, copyWithAutoClear } from "@/lib/clipboard-autoclear"
import { calculatePasswordStrength, getStrengthColor, getFaviconUrl, getPasswordAgeStatus, getPasswordAgeBadge, getPasswordAgeDateColor } from "@/lib/password-utils"
import { usePasswordStrengthReady } from "@/lib/use-password-strength"
import { useVaultIconsEnabled } from "@/lib/vault-icon-pref"
import { FaviconImg } from "@/components/favicon-img"
import { IconShieldLock } from "@tabler/icons-react"
import {
    ToolSidebarFilterList,
    ToolSidebarLayout,
    type ToolSidebarFilterItem,
} from "@/components/tools/tool-sidebar"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { ImportExportDialog } from "./import-export-dialog"
import { useIsMobile } from "@/components/hooks/use-mobile"
import { PasswordItemSwipeable } from "./password-item-swipeable"
import { PasswordCard } from "./password-card"
import { SecurityDashboard } from "./security-dashboard"
import { BreachCheckDialog } from "./breach-check-dialog"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { useTranslations } from "next-intl"
import { checkPasswordsBreached } from "@/lib/hibp"

export function PasswordList() {
    const t = useTranslations("PasswordManager.list")
    const tToast = useTranslations("PasswordManager.toasts")
    const strengthReady = usePasswordStrengthReady()
    // Opt-in: fetching a site icon discloses the domain to a third-party
    // service, and for a vault that set of domains is the user's account list.
    const showIcons = useVaultIconsEnabled()
    const { passwords, deletePassword, clearPasswords, isLoading, breachResults, breachStatus, setBreachResults, setBreachStatus, setBreachProgress, clearBreachResults } = usePasswordStore()
    const { clearKey: clearMasterKeyStore } = useMasterKeyStore()
    const [searchTerm, setSearchTerm] = useState("")
    const [breachDialogOpen, setBreachDialogOpen] = useState(false)
    const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
    const [quickFilter, setQuickFilter] = useState<"all" | "weak" | "reused" | "no-url">("all")
    const [tagFilter, setTagFilter] = useState("all")
    const [sortBy, setSortBy] = useState<"name" | "date" | "strength">("name")
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

        let filtered = bySearch
        if (quickFilter === "weak") {
            filtered = bySearch.filter((entry) => calculatePasswordStrength(entry.password) <= 2)
        } else if (quickFilter === "reused") {
            filtered = bySearch.filter((entry) => reusedPasswordIds.has(entry.id))
        } else if (quickFilter === "no-url") {
            filtered = bySearch.filter((entry) => !entry.url?.trim())
        }
        if (tagFilter !== "all") {
            filtered = filtered.filter((entry) => entry.tags?.includes(tagFilter))
        }

        return [...filtered].sort((a, b) => {
            if (sortBy === "date") return b.updatedAt - a.updatedAt
            if (sortBy === "strength") return calculatePasswordStrength(b.password) - calculatePasswordStrength(a.password)
            return a.service.localeCompare(b.service)
        })
    }, [passwords, searchTerm, quickFilter, tagFilter, reusedPasswordIds, sortBy, strengthReady])

    const weakCount = useMemo(
        () => passwords.filter((entry) => calculatePasswordStrength(entry.password) <= 2).length,
        // strengthReady: scores come from the fallback until the dictionaries land.
        [passwords, strengthReady]
    )
    const noUrlCount = useMemo(
        () => passwords.filter((entry) => !entry.url?.trim()).length,
        [passwords]
    )
    const reusedCount = reusedPasswordIds.size
    const hasActiveQuickFilter = quickFilter !== "all"

    const securityFilters: ToolSidebarFilterItem[] = [
        { id: "all", label: t("filters.all"), count: passwords.length },
        { id: "weak", label: t("filters.weak"), count: weakCount, icon: AlertTriangle },
        { id: "reused", label: t("filters.reused"), count: reusedCount, icon: Repeat },
        { id: "no-url", label: t("filters.noUrl"), count: noUrlCount, icon: Link2Off },
    ]

    const tagFilters: ToolSidebarFilterItem[] = useMemo(() => {
        const counts = new Map<string, number>()
        passwords.forEach((p) => p.tags?.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)))
        return [...counts.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([tag, count]) => ({ id: tag, label: tag, count }))
    }, [passwords])

    const runBreachCheck = async () => {
        if (breachStatus === "checking") return
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

    // Only entries that actually resolved as breached. An entry whose lookup
    // failed is `unknown` and is deliberately not counted either way.
    const breachedCount = breachStatus === "done"
        ? passwords.filter((p) => breachResults.get(p.id)?.status === "breached").length
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

    const copyToClipboard = async (text: string, type: "Password" | "Username" | "TOTP" = "Password") => {
        const label =
            type === "Username"
                ? tToast("copiedUsername")
                : type === "TOTP"
                  ? tToast("copiedTotp")
                  : tToast("copiedPassword")
        // Held in an object because the callback below reads it before it is
        // assigned: it fires either when the clear runs or when a later copy
        // supersedes this one, and the "clears in 30s" notice is stale in both.
        const notice: { id?: string | number } = {}
        try {
            await copyWithAutoClear(text, () => {
                if (notice.id !== undefined) toast.dismiss(notice.id)
            })
        } catch {
            // A refused clipboard write must not be reported as a copy.
            toast.error(tToast("copyFailed"))
            return
        }
        notice.id = toast.success(label, {
            description: t("clipboardClears", { seconds: CLIPBOARD_CLEAR_SECONDS }),
            duration: CLIPBOARD_CLEAR_SECONDS * 1000,
        })
    }

    const handleDeleteClick = (id: string) => {
        setPasswordToDelete(id)
        setDeleteConfirmOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!passwordToDelete) return

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
        setTagFilter("all")
    }

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Inactive tool tabs stay mounted under display:none — ignore global shortcuts there.
            if (!searchInputRef.current || searchInputRef.current.offsetParent === null) return
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
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-muted-foreground/30 border-t-muted-foreground"></div>
                <p className="text-sm text-muted-foreground">{t("loading")}</p>
            </div>
        )
    }

    if (passwords.length === 0 && !searchTerm) {
        return (
            <div className={cn(
                "flex flex-col items-center justify-center text-center gap-3",
                isMobile ? "min-h-[50vh] px-8" : "h-full py-16"
            )}>
                <Lock className="h-8 w-8 text-muted-foreground/60" />
                <div className="space-y-1">
                    <h3 className="text-sm font-medium">{t("emptyTitle")}</h3>
                    <p className="text-muted-foreground text-[13px] max-w-[280px]">
                        {isMobile
                            ? t("emptyHintMobile")
                            : t("emptyHintDesktop")}
                    </p>
                </div>
                <div className={cn("flex flex-col items-center gap-2", isMobile && "mt-4")}>
                    {isMobile && (
                        <AddPasswordDialog>
                            <Button size="lg">
                                <Plus className="mr-2 h-4 w-4" /> {t("addPassword")}
                            </Button>
                        </AddPasswordDialog>
                    )}
                    <ImportExportDialog>
                        <Button variant="outline" size={isMobile ? "lg" : "default"}>
                            <FileJson className="mr-2 h-4 w-4" /> {t("importExport")}
                        </Button>
                    </ImportExportDialog>
                </div>
            </div>
        )
    }

    return (
        <ToolSidebarLayout
            toolId="password-manager"
            icon={IconShieldLock}
            title={t("title")}
            actions={
                <AddPasswordDialog>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("addPassword")}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </AddPasswordDialog>
            }
            sidebar={
                <div className="min-h-0 flex-1 overflow-y-auto">
                    <ToolSidebarFilterList
                        items={securityFilters}
                        value={quickFilter}
                        onChange={(id) => setQuickFilter(id as typeof quickFilter)}
                        heading={t("filters.heading")}
                        railGroupId="security"
                    />
                    {tagFilters.length > 0 && (
                        <ToolSidebarFilterList
                            items={[{ id: "all", label: t("filters.allTags") }, ...tagFilters]}
                            value={tagFilter}
                            onChange={setTagFilter}
                            heading={t("filters.tagsHeading")}
                            railGroupId="tags"
                        />
                    )}
                </div>
            }
        >
        <div className={cn(
            isMobile ? "flex flex-col h-full" : "flex-1 flex flex-col min-h-0 px-4 py-4"
        )}>
            {/* Mobile Header */}
            {isMobile && (
                <div className="sticky top-0 z-50 glass-bar border-b border-border pb-4 pt-2 shrink-0">
                    <div className="flex items-center gap-2 px-4 py-2">
                        <div className="relative flex-1 h-10">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
                            <Input
                                ref={searchInputRef}
                                placeholder={t("searchPlaceholderMobile")}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 h-10 bg-foreground/[0.04] border-transparent text-sm"
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

                        <div className="flex items-center gap-0.5 rounded-lg p-0.5 bg-foreground/[0.05]">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-8 w-8 rounded-md",
                                    viewMode === "grid"
                                        ? "bg-card text-foreground shadow-elev-1 hover:bg-card"
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
                                    "h-8 w-8 rounded-md",
                                    viewMode === "list"
                                        ? "bg-card text-foreground shadow-elev-1 hover:bg-card"
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
                                <DropdownMenuItem onClick={() => { setBreachDialogOpen(true); void runBreachCheck() }} className="gap-2">
                                    <ShieldX className="h-4 w-4" />
                                    <span>Breach Check</span>
                                    {breachedCount > 0 && (
                                        <span className="ml-auto h-5 min-w-5 rounded-full bg-destructive/[0.12] text-destructive text-[10px] tabular-nums flex items-center justify-center font-semibold px-1">
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
                            <h1 className="text-2xl font-semibold tracking-[-0.01em] text-foreground">{t("allPasswordsTitle")}</h1>
                            <p className="text-sm text-muted-foreground mt-0.5">{t("passwordCount", { count: passwords.length })}</p>
                        </div>
                        <Drawer>
                            <DrawerTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full shrink-0 text-muted-foreground">
                                    <ShieldCheck className="h-5 w-5" />
                                </Button>
                            </DrawerTrigger>
                            <DrawerContent className="max-h-[85vh]">
                                <DrawerHeader className="border-b border-border pb-4 mb-4">
                                    <DrawerTitle className="text-center font-semibold text-[17px]">{t("vaultHealthDrawerTitle")}</DrawerTitle>
                                </DrawerHeader>
                                <div className="px-4 pb-8 overflow-y-auto">
                                    <SecurityDashboard minimal={false} />
                                </div>
                            </DrawerContent>
                        </Drawer>
                    </div>
                    <div className="px-4 pb-2 flex items-center gap-2 overflow-x-auto scrollbar-hide">
                        <Button size="sm" variant={quickFilter === "all" ? "default" : "outline"} className="h-7 rounded-full text-xs shrink-0" onClick={() => setQuickFilter("all")}>
                            All
                        </Button>
                        <Button size="sm" variant={quickFilter === "weak" ? "default" : "outline"} className="h-7 rounded-full text-xs gap-1.5 shrink-0" onClick={() => setQuickFilter("weak")}>
                            <AlertTriangle className="h-3 w-3" /> Weak {weakCount > 0 && <span className="font-semibold tabular-nums">({weakCount})</span>}
                        </Button>
                        <Button size="sm" variant={quickFilter === "reused" ? "default" : "outline"} className="h-7 rounded-full text-xs gap-1.5 shrink-0" onClick={() => setQuickFilter("reused")}>
                            <Repeat className="h-3 w-3" /> Reused {reusedCount > 0 && <span className="font-semibold tabular-nums">({reusedCount})</span>}
                        </Button>
                        <Button size="sm" variant={quickFilter === "no-url" ? "default" : "outline"} className="h-7 rounded-full text-xs gap-1.5 shrink-0" onClick={() => setQuickFilter("no-url")}>
                            <Link2Off className="h-3 w-3" /> No URL {noUrlCount > 0 && <span className="font-semibold tabular-nums">({noUrlCount})</span>}
                        </Button>
                    </div>
                </div>
            )}

            {/* Desktop Search Bar */}
            {!isMobile && (
                <div className="flex gap-2 items-center z-40 shrink-0 pb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            ref={searchInputRef}
                            placeholder={t("searchPlaceholderDesktop")}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 h-8 text-[13px]"
                        />
                        {searchTerm && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-0.5 top-0.5 h-7 w-7"
                                onClick={() => setSearchTerm("")}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center rounded-lg p-0.5 bg-foreground/[0.05]">
                        <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "grid" | "list")} className="gap-0.5">
                            <ToggleGroupItem
                                value="grid"
                                size="sm"
                                aria-label={t("gridViewAria")}
                                className="h-7 w-7 min-w-7 px-0 rounded-md data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-elev-1 text-muted-foreground"
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </ToggleGroupItem>
                            <ToggleGroupItem
                                value="list"
                                size="sm"
                                aria-label={t("listViewAria")}
                                className="h-7 w-7 min-w-7 px-0 rounded-md data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-elev-1 text-muted-foreground"
                            >
                                <List className="h-4 w-4" />
                            </ToggleGroupItem>
                        </ToggleGroup>
                    </div>
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                        <SelectTrigger className="h-8 w-[130px] text-xs gap-1.5">
                            <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="name">Name</SelectItem>
                            <SelectItem value="date">Last updated</SelectItem>
                            <SelectItem value="strength">Strength</SelectItem>
                        </SelectContent>
                    </Select>
                    <ImportExportDialog />
                    <Button variant="ghost" size="sm" onClick={visiblePasswords.size > 0 ? hideAllVisible : showAllVisible} className="h-8 text-xs">
                        {visiblePasswords.size > 0 ? <><EyeOff className="h-3.5 w-3.5 mr-1.5" /> Hide all</> : <><Eye className="h-3.5 w-3.5 mr-1.5" /> Show all</>}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setBreachDialogOpen(true); void runBreachCheck() }}
                        title="Check passwords against data breaches"
                        className={cn(
                            "h-8 text-xs gap-1.5",
                            breachedCount > 0 && "text-destructive"
                        )}
                    >
                        <ShieldX className="h-3.5 w-3.5" /> Breach Check
                        {breachedCount > 0 && (
                            <span className="h-4 min-w-4 px-1 rounded-full bg-destructive/[0.12] text-destructive text-[10px] font-semibold tabular-nums flex items-center justify-center">
                                {breachedCount}
                            </span>
                        )}
                    </Button>
                    <div className="h-5 w-px bg-border shrink-0" />
                    <Button variant="ghost" size="icon" onClick={handleLock} title={t("lockVault")} className="h-8 w-8 text-muted-foreground">
                        <Lock className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Security and tag facets moved to the ToolSidebarLayout panel; the
                reset shortcut stays here next to the search it also clears. */}
            {!isMobile && (hasActiveQuickFilter || tagFilter !== "all" || searchTerm) && (
                <div className="mb-4 flex items-center gap-2 flex-wrap">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={clearFilters}>
                        <X className="h-3.5 w-3.5 mr-1" /> Reset
                    </Button>
                    <div className="ml-auto text-[11px] text-muted-foreground/70 hidden lg:block">
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
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
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
                        <div className="rounded-xl border border-border bg-card shadow-elev-1 overflow-hidden">
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
                                        <TableRow key={entry.id} className="group hover:bg-foreground/[0.03] transition-colors">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground font-medium text-xs select-none overflow-hidden">
                                                        <FaviconImg
                                                            serviceUrl={showIcons && entry.url ? getFaviconUrl(entry.url) : null}
                                                            className="h-5 w-5 object-contain"
                                                            fallback={<span>{entry.service.charAt(0).toUpperCase()}</span>}
                                                        />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="truncate font-medium">{entry.service}</span>
                                                        <div className="flex gap-1 mt-0.5 flex-wrap">
                                                            {entry.tags && entry.tags.slice(0, 2).map(tag => (
                                                                <span key={tag} className="text-[11px] text-muted-foreground bg-foreground/[0.06] px-1.5 rounded-full">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                            {(() => {
                                                                const badge = getPasswordAgeBadge(getPasswordAgeStatus(entry.updatedAt))
                                                                if (!badge) return null
                                                                return (
                                                                    <span className={cn("text-[11px] px-1.5 rounded-full flex items-center gap-0.5", badge.className)} title={`Last updated: ${new Date(entry.updatedAt).toLocaleDateString()}`}>
                                                                        <Clock className="h-2.5 w-2.5" />{t(badge.labelKey)}
                                                                    </span>
                                                                )
                                                            })()}
                                                        </div>
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
                                                    <div className="font-mono text-xs truncate flex-1 bg-muted/40 px-2 py-1 rounded-md border border-border">
                                                        {/* threatcrush-disable-next-line secret-generic-credential */}
                                                        {visiblePasswords.has(entry.id) ? entry.password : "••••••••••••"}
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => toggleVisibility(entry.id)}>
                                                        {visiblePasswords.has(entry.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copyToClipboard(entry.password)}>
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
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
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
                                <div className="flex justify-center py-4 border-t border-border">
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
        </ToolSidebarLayout>
    )
}
