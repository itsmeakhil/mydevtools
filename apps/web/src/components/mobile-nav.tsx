import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Home, LayoutGrid, LogOut, User as UserIcon, Moon, Sun } from "lucide-react"
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
import { useToolVisibilityStore } from "@/store/tool-visibility-store"
import { logoutBackendSession } from "@/lib/backend-auth"
import { motion } from "framer-motion"
import { useThemeAnimation } from "@space-man/react-theme-animation"

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
    const { lockVault } = usePasswordStore()
    const { resetTools } = useToolVisibilityStore()
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
            lockVault() // Clear in-memory state immediately

            // Clear encryption key from IndexedDB
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

            resetTools() // Reset tool visibility to defaults

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
        "min-h-[48px] min-w-[64px] px-3 py-2",
        "text-xs font-medium text-muted-foreground",
        "transition-all duration-200 ease-out",
        "hover:text-foreground active:scale-95",
        "touch-ripple rounded-xl"
    )

    const activeStyles = "text-primary"

    return (
        <nav
            className={cn(
                "fixed bottom-0 left-0 right-0 z-50",
                "flex items-center justify-around",
                "h-[72px] px-2",
                "border-t border-border/40",
                "bg-background/85 backdrop-blur-xl",
                "pb-[env(safe-area-inset-bottom)]",
                "md:hidden"
            )}
            role="navigation"
            aria-label="Mobile navigation"
        >
            {/* Gradient overlay for premium feel */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

            {/* Home Link */}
            <Link
                href="/dashboard"
                className={cn(navItemStyles, pathname === "/dashboard" && activeStyles)}
                aria-current={pathname === "/dashboard" ? "page" : undefined}
            >
                {activeTab === 'home' && (
                    <motion.div
                        layoutId="mobileNavIndicator"
                        className="absolute inset-1 bg-primary/10 rounded-xl -z-10"
                        initial={false}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                )}
                <Home
                    className={cn(
                        "h-5 w-5 transition-transform duration-200",
                        pathname === "/dashboard" && "scale-110"
                    )}
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
                        layoutId="mobileNavIndicator"
                        className="absolute inset-1 bg-primary/10 rounded-xl -z-10"
                        initial={false}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                )}
                <LayoutGrid
                    className={cn(
                        "h-5 w-5 transition-transform duration-200",
                        openMobile && "scale-110"
                    )}
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

