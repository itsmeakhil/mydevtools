"use client"

import { useState, useRef } from "react"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { usePasswordStore } from "@/store/password-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Copy, Eye, EyeOff, Trash2, ExternalLink, LayoutGrid, List, Lock, Pencil, MoreVertical, FileJson, Plus, ShieldCheck } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { toast } from "sonner"
import { doc, deleteDoc } from "firebase/firestore"
import { db, auth } from "@/database/firebase"
import { clearKey } from "@/lib/key-storage"
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
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"

export function PasswordList() {
    const { passwords, deletePassword, lockVault, isLoading } = usePasswordStore()
    const [searchTerm, setSearchTerm] = useState("")
    const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [passwordToDelete, setPasswordToDelete] = useState<string | null>(null)
    const [editingPassword, setEditingPassword] = useState<PasswordEntry | null>(null)
    const isMobile = useIsMobile()

    const filteredPasswords = passwords.filter(p =>
        p.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    )

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
        resetKey: searchTerm,
        scrollContainerRef: mobileScrollerRef,
    })

    const {
        displayCount: desktopDisplayCount,
        sentinelRef: desktopSentinelRef,
        hasMore: desktopHasMore,
    } = useInfiniteScroll({
        totalCount: filteredPasswords.length,
        resetKey: searchTerm,
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

    const copyToClipboard = (text: string, type: "Password" | "Username" = "Password") => {
        navigator.clipboard.writeText(text)
        toast.success(`${type} copied to clipboard`)
    }

    const handleDeleteClick = (id: string) => {
        setPasswordToDelete(id)
        setDeleteConfirmOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!auth.currentUser || !passwordToDelete) return

        try {
            await deleteDoc(doc(db, "user_passwords", auth.currentUser.uid, "entries", passwordToDelete))
            deletePassword(passwordToDelete)
            toast.success("Password deleted")
        } catch (error) {
            console.error("Error deleting password:", error)
            toast.error("Failed to delete password")
        } finally {
            setDeleteConfirmOpen(false)
            setPasswordToDelete(null)
        }
    }

    const handleLock = async () => {
        await clearKey()
        lockVault()
        toast.success("Vault locked")
    }

    if (isLoading) {
        return (
            <div className={cn(
                "flex flex-col items-center justify-center text-center space-y-4",
                isMobile ? "min-h-[60vh]" : "py-16"
            )}>
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
                <p className="text-sm text-muted-foreground">Loading your passwords...</p>
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
                    <h3 className={cn("font-semibold", isMobile ? "text-xl" : "text-lg")}>Vault is Empty</h3>
                    <p className="text-muted-foreground text-sm max-w-[280px]">
                        {isMobile
                            ? "Tap the + button to add your first password"
                            : "You haven't stored any passwords yet. Click the \"Add Password\" button above to get started."
                        }
                    </p>
                </div>
                {isMobile && (
                    <AddPasswordDialog>
                        <Button size="lg" className="mt-4 rounded-xl">
                            <Plus className="mr-2 h-5 w-5" /> Add Password
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
                                placeholder="Search your..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 h-10 bg-muted/50 border-transparent rounded-lg focus-visible:ring-1 text-sm placeholder:text-muted-foreground/70"
                            />
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-muted-foreground/80"
                            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                        >
                            {viewMode === "grid" ? <List className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground/80">
                                    <MoreVertical className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <ImportExportDialog>
                                    <Button variant="ghost" className="w-full justify-start h-9 px-2 font-normal">
                                        <FileJson className="mr-2 h-4 w-4" /> Import / Export
                                    </Button>
                                </ImportExportDialog>
                                <DropdownMenuItem onClick={handleLock}>
                                    <Lock className="mr-2 h-4 w-4" /> Lock Vault
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="px-4 mt-2 mb-1 flex items-center gap-2">
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">All Passwords</h1>
                            <p className="text-sm text-muted-foreground mt-0.5">{passwords.length} passwords</p>
                        </div>
                        <Drawer>
                            <DrawerTrigger asChild>
                                <Button variant="outline" size="icon" className="h-9 w-9 rounded-full shrink-0 border-muted-foreground/20 text-muted-foreground hover:text-green-600 hover:border-green-600/30 hover:bg-green-500/10 transition-all">
                                    <ShieldCheck className="h-5 w-5" />
                                </Button>
                            </DrawerTrigger>
                            <DrawerContent className="max-h-[85vh]">
                                <DrawerHeader className="border-b pb-4 mb-4">
                                    <DrawerTitle className="text-center font-bold text-lg">Vault Health Status</DrawerTitle>
                                </DrawerHeader>
                                <div className="px-4 pb-8 overflow-y-auto">
                                    <SecurityDashboard minimal={false} />
                                </div>
                            </DrawerContent>
                        </Drawer>
                    </div>
                </div>
            )}

            {/* Desktop Search Bar */}
            {!isMobile && (
                <div className="flex gap-2 items-center z-40 transition-all duration-200 shrink-0 pb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search vault..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 h-10 bg-background/50 backdrop-blur-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2 border rounded-lg p-1 bg-muted/20">
                        <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "grid" | "list")}>
                            <ToggleGroupItem value="grid" size="sm" aria-label="Grid view">
                                <LayoutGrid className="h-4 w-4" />
                            </ToggleGroupItem>
                            <ToggleGroupItem value="list" size="sm" aria-label="List view">
                                <List className="h-4 w-4" />
                            </ToggleGroupItem>
                        </ToggleGroup>
                    </div>
                    <ImportExportDialog />
                    <Button variant="outline" size="icon" onClick={handleLock} title="Lock Vault" className="h-10 w-10">
                        <Lock className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {filteredPasswords.length === 0 ? (
                <div className={cn(
                    "text-center text-muted-foreground",
                    isMobile ? "py-16 px-8" : "py-12"
                )}>
                    <p className="text-sm">No passwords found matching "{searchTerm}"</p>
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
                                        <TableHead className="w-[250px]">Service</TableHead>
                                        <TableHead className="w-[200px]">Username</TableHead>
                                        <TableHead className="w-[250px]">Password</TableHead>
                                        <TableHead>URL</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
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
                                                    <div className={cn("w-1.5 h-1.5 rounded-full", getStrengthColor(calculatePasswordStrength(entry.password)))} title="Password Strength" />
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
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleDeleteClick(entry.id)} className="text-destructive focus:text-destructive">
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
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
                        <AlertDialogTitle>Delete Password</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this password? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
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
        </div>
    )
}
