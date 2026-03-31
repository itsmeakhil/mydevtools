"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes"
import { SpacemanThemeProvider, ThemeAnimationType } from "@space-man/react-theme-animation"
import { useColorTheme } from "@/hooks/use-color-theme"

function ThemeSync({ children }: { children: React.ReactNode }) {
  const { theme } = useNextTheme()
  useColorTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Sync themes - this ensures both systems stay in sync
  React.useEffect(() => {
    if (mounted && theme) {
      // Theme sync happens automatically through the SpacemanThemeProvider
    }
  }, [theme, mounted])

  return <>{children}</>
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <SpacemanThemeProvider
        defaultTheme={props.defaultTheme as "light" | "dark" | "system" | undefined}
        animationType={ThemeAnimationType.CIRCLE}
        duration={400}
      >
        <ThemeSync>{children}</ThemeSync>
      </SpacemanThemeProvider>
    </NextThemesProvider>
  )
}
