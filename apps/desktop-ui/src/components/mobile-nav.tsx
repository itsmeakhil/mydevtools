import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Home, LayoutGrid, Lock, User as UserIcon, Moon, Sun, Settings, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAppUser } from "@/hooks/use-app-user"
import { usePasswordStore } from "@/store/password-store"
import { useEnvironmentManagerStore } from "@/store/environment-manager-store"
import { useMasterKeyStore } from "@/store/master-key-store"
import { clearMasterKey } from "@/lib/key-storage"
import { useThemeAnimation } from "@space-man/react-theme-animation"
import { motion } from "framer-motion"

// Navigation items configuration
const navItems = [
    { id: 'home', href: '/dashboard', icon: Home, label: 'Home' },
    { id: 'tools', icon: LayoutGrid, label: 'Tools', isButton: true },
    { id: 'profile', icon: UserIcon, label: 'Profile', isProfile: true },
] as const

export function MobileNav() {
    const pathname = usePathname()
    const user = useAppUser()
    const { clearPasswords } = usePasswordStore()
    const { clearSets } = useEnvironmentManagerStore()
    const lockVault = useMasterKeyStore((s) => s.lock)
    const { theme, toggleTheme, ref } = useThemeAnimation()
    const [mounted, setMounted] = useState(false)

    const displayName = user.name?.trim() || 'You'
    const initial = displayName[0]!.toUpperCase()

    // Avoid hydration mismatch for theme
    useEffect(() => {
        setMounted(true)
    }, [])

    // Determine active tab for indicator animation
    const getActiveTab = (): 'home' | 'profile' | null => {
        if (pathname === '/dashboard') return 'home'
        return null
    }
    const activeTab = getActiveTab()

    // Manual vault lock: drop every decrypted secret we hold, in memory and in
    // IndexedDB. The vault gate then asks for the master password again.
    const handleLockVault = async () => {
        try {
            clearPasswords()     // clear decrypted passwords from memory
            clearSets()          // clear decrypted environment sets from memory
            lockVault()          // drop the in-memory master key, keep the vault

            // Clear password-manager vault key from IndexedDB
            if (typeof window !== 'undefined' && window.indexedDB) {
                await new Promise<void>((resolve) => {
                    const req = window.indexedDB.open("PasswordManagerDB", 1)
                    req.onsuccess = (e: any) => {
                        const db = e.target.result
                        if (db.objectStoreNames.contains("keys")) {
                            const tx = db.transaction("keys", "readwrite")
                            tx.objectStore("keys").delete("vaultKey")
                            tx.oncomplete = () => resolve()
                            tx.onerror = () => resolve()
                        } else {
                            resolve()
                        }
                    }
                    req.onerror = () => resolve()
                })
            }

            // Clear global master key from IndexedDB
            await clearMasterKey()
        } catch (error) {
            console.error('Error locking vault:', error);
        }
    };

    // Base styles for nav items
    const navItemStyles = cn(
        "relative flex flex-col items-center justify-center gap-0.5",
        "h-12 w-14 sm:w-16",
        "text-[10px] font-medium text-muted-foreground",
        "transition-colors duration-200 ease-out",
        "hover:text-foreground active:scale-95",
        "rounded-full z-10"
    )

    const activeStyles = "text-primary"

    return (
        <nav
            className={cn(
                "fixed bottom-[max(1.5rem,calc(env(safe-area-inset-bottom)+0.5rem))] left-1/2 -translate-x-1/2 z-50",
                "flex items-center justify-around gap-1",
                "h-[64px] px-2 w-[calc(100%-2rem)] max-w-sm",
                "border border-border/50 rounded-full",
                "bg-background/80 backdrop-blur-2xl shadow-2xl",
                "md:hidden"
            )}
            role="navigation"
            aria-label="Mobile navigation"
        >
            {/* Soft inner highlight for premium feel */}
            <div className="absolute inset-0 rounded-full border border-white/10 pointer-events-none" />

            {/* Home Link */}
            <Link
                href="/dashboard"
                className={cn(navItemStyles, pathname === "/dashboard" && activeStyles)}
                aria-current={pathname === "/dashboard" ? "page" : undefined}
            >
                {activeTab === 'home' && (
                    <motion.div
                        layoutId="active-mobile-nav"
                        className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-violet-500/10 ring-1 ring-inset ring-primary/15 -z-10"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                )}
                <Home
                    className="h-5 w-5 transition-transform duration-200"
                    strokeWidth={pathname === "/dashboard" ? 2.5 : 2}
                />
                <span className="mt-0.5">{navItems[0].label}</span>
            </Link>

            {/* Tools Button — opens the global command palette (same event the
                TopBar search button dispatches). The old sidebar it used to
                toggle is gone; the palette is the tool switcher now. */}
            <button
                onClick={() => document.dispatchEvent(new CustomEvent('open-command-palette'))}
                className={navItemStyles}
                aria-label="Open tool search"
            >
                <LayoutGrid className="h-5 w-5 transition-transform duration-200" strokeWidth={2} />
                <span className="mt-0.5">Tools</span>
            </button>

            {/* Profile */}
            <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className={cn(navItemStyles, "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2")}
                            aria-label="User menu"
                        >
                            {activeTab === 'profile' && (
                                <motion.div
                                    layoutId="active-mobile-nav"
                                    className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-violet-500/10 ring-1 ring-inset ring-primary/15 -z-10"
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                            )}
                            <div className="relative">
                                <Avatar className="h-6 w-6 ring-2 ring-background shadow-sm">
                                    <AvatarImage src={user.avatar} alt={displayName} />
                                    <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                                        {initial}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                            <span className="mt-0.5">Profile</span>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        side="top"
                        sideOffset={12}
                        className="w-60 rounded-xl shadow-xl border-border/50 backdrop-blur-xl bg-popover/95"
                    >
                        <DropdownMenuLabel className="font-normal p-3">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={user.avatar} alt={displayName} />
                                    <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                                        {initial}
                                    </AvatarFallback>
                                </Avatar>
                                <p className="truncate text-sm font-semibold leading-none">
                                    {displayName}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild className="cursor-pointer py-2.5">
                            <Link href="/help" className="flex w-full items-center">
                                <HelpCircle className="mr-2 h-4 w-4" />
                                <span>Help</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="cursor-pointer py-2.5">
                            <Link href="/settings" className="flex w-full items-center">
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Settings</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            ref={ref as any}
                            onClick={() => toggleTheme()}
                            className="cursor-pointer py-2.5"
                        >
                            {mounted && theme === 'dark' ? (
                                <Moon className="mr-2 h-4 w-4" />
                            ) : (
                                <Sun className="mr-2 h-4 w-4" />
                            )}
                            <span>{mounted && theme === 'dark' ? 'Dark' : 'Light'} Theme</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => void handleLockVault()}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer py-2.5"
                        >
                            <Lock className="mr-2 h-4 w-4" />
                            <span>Lock vault</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
        </nav>
    )
}

