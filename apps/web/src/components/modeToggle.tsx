"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useThemeAnimation } from "@space-man/react-theme-animation"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"

export function ModeToggle() {
  const { setTheme } = useTheme()
  const { theme, toggleTheme, ref } = useThemeAnimation()
  const [mounted, setMounted] = React.useState(false)

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Sync theme from animation hook to next-themes
  React.useEffect(() => {
    if (mounted && theme) {
      setTheme(theme)
    }
  }, [theme, mounted, setTheme])

  const isDark = theme === "dark"

  const handleToggle = (checked: boolean) => {
    // The toggleTheme from useThemeAnimation handles both theme change and animation
    toggleTheme()
  }

  if (!mounted) {
    return (
      <SwitchPrimitives.Root
        className={cn(
          "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-input shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          "data-[state=checked]:bg-primary"
        )}
        disabled
      >
        <SwitchPrimitives.Thumb
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform flex items-center justify-center",
            "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
          )}
        >
          <Sun className="h-3.5 w-3.5 text-orange-500" />
        </SwitchPrimitives.Thumb>
      </SwitchPrimitives.Root>
    )
  }

  return (
    <SwitchPrimitives.Root
      ref={ref as any}
      checked={isDark}
      onCheckedChange={handleToggle}
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-input shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-primary"
      )}
      aria-label="Toggle theme"
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform flex items-center justify-center",
          "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
        )}
      >
        {isDark ? (
          <Moon className="h-3.5 w-3.5 text-primary transition-all" />
        ) : (
          <Sun className="h-3.5 w-3.5 text-orange-500 transition-all" />
        )}
      </SwitchPrimitives.Thumb>
    </SwitchPrimitives.Root>
  )
}
