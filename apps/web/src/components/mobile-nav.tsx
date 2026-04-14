import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Home, LayoutGrid, LogOut, User as UserIcon, Moon, Sun, Settings, HelpCircle, Coffee } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/ui/sidebar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import useAuth from "@/utils/useAuth"
import { signOut as firebaseSignOut } from "firebase/auth"
import { auth } from "@/database/firebase"
import { usePasswordStore } from "@/store/password-store"
import { useEnvironmentManagerStore } from "@/store/environment-manager-store"
import { useMasterKeyStore } from "@/store/master-key-store"
import { clearMasterKey } from "@/lib/key-storage"
import { logoutBackendSession } from "@/lib/backend-auth"
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
    const router = useRouter()
    const { toggleSidebar, openMobile } = useSidebar()
    const { user } = useAuth()
    const { clearPasswords } = usePasswordStore()
    const { clearSets } = useEnvironmentManagerStore()
    const { clearKey: clearMasterKeyStore } = useMasterKeyStore()
    const { theme, toggleTheme, ref } = useThemeAnimation()
    const [mounted, setMounted] = useState(false)

    // Avoid hydration mismatch for theme
    useEffect(() => {
        setMounted(true)
    }, [])

    // Determine active tab for indicator animation
    const getActiveTab = () => {
        if (pathname === '/dashboard') return 'home'
        if (openMobile) return 'tools'
        return null
    }
    const activeTab = getActiveTab()

    const handleSignOut = async () => {
        try {
            clearPasswords()     // clear decrypted passwords from memory
            clearSets()          // clear decrypted environment sets from memory
            clearMasterKeyStore() // clear global master key in-memory state

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

            await logoutBackendSession()
            await firebaseSignOut(auth);
            router.push('/login');
        } catch (error) {
            console.error('Error signing out:', error);
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
                "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
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
                        className="absolute inset-0 bg-primary/10 rounded-full -z-10"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                )}
                <Home
                    className="h-5 w-5 transition-transform duration-200"
                    strokeWidth={pathname === "/dashboard" ? 2.5 : 2}
                />
                <span className="mt-0.5">{navItems[0].label}</span>
            </Link>

            {/* Tools Button */}
            <button
                onClick={() => toggleSidebar()}
                className={cn(navItemStyles, openMobile && activeStyles)}
                aria-expanded={openMobile}
                aria-label="Toggle tools menu"
            >
                {activeTab === 'tools' && (
                    <motion.div
                        layoutId="active-mobile-nav"
                        className="absolute inset-0 bg-primary/10 rounded-full -z-10"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                )}
                <LayoutGrid
                    className="h-5 w-5 transition-transform duration-200"
                    strokeWidth={openMobile ? 2.5 : 2}
                />
                <span className="mt-0.5">Tools</span>
            </button>

            {/* Profile / Login */}
            {user ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className={cn(navItemStyles, "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2")}
                            aria-label="User menu"
                        >
                            {activeTab === 'profile' && (
                                <motion.div
                                    layoutId="active-mobile-nav"
                                    className="absolute inset-0 bg-primary/10 rounded-full -z-10"
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                            )}
                            <div className="relative">
                                <Avatar className="h-6 w-6 ring-2 ring-background shadow-sm">
                                    <AvatarImage src={user.photoURL || ""} alt={user.displayName || "User"} />
                                    <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                                        {user.displayName?.[0] || "U"}
                                    </AvatarFallback>
                                </Avatar>
                                {/* Online indicator */}
                                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
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
                                    <AvatarImage src={user.photoURL || ""} alt={user.displayName || "User"} />
                                    <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                                        {user.displayName?.[0] || "U"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col space-y-0.5 overflow-hidden">
                                    <p className="text-sm font-semibold leading-none truncate">
                                        {user.displayName}
                                    </p>
                                    <p className="text-xs leading-none text-muted-foreground truncate">
                                        {user.email}
                                    </p>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild className="cursor-pointer py-2.5">
                            <a
                                href="https://buymeacoffee.com/itsmeakhil"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex w-full items-center"
                            >
                                <Coffee className="mr-2 h-4 w-4 text-amber-700 dark:text-amber-400" />
                                <span>Buy me a coffee</span>
                            </a>
                        </DropdownMenuItem>
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
                            onClick={handleSignOut}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer py-2.5"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                <Link
                    href="/login"
                    className={cn(navItemStyles, pathname === "/login" && activeStyles)}
                    aria-current={pathname === "/login" ? "page" : undefined}
                >
                    <div className="relative p-1.5 rounded-full bg-primary/10">
                        <UserIcon className="h-4 w-4 text-primary" strokeWidth={2} />
                    </div>
                    <span className="mt-0.5">Login</span>
                </Link>
            )}
        </nav>
    )
}

