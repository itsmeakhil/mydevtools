"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import {
  DEFAULT_ACCENT,
  accentCssVars,
  isAccentColor,
  type AccentColor,
} from "@/lib/accent-color"

/** Preset id (see ACCENT_PRESETS) or a custom `#rrggbb` from the color picker. */
export type ColorTheme = AccentColor

const COLOR_THEME_KEY = "app-color-theme"
/** Resolved vars cached for the pre-paint script in app/layout.tsx (no accent flash). */
export const COLOR_THEME_VARS_KEY = "app-color-theme-vars"

type ColorThemeContextValue = {
  colorTheme: ColorTheme
  setColorTheme: (theme: ColorTheme) => void
  mounted: boolean
}

const ColorThemeContext = createContext<ColorThemeContextValue | null>(null)

/** Accent vars go inline on <html> so custom hex picks work without new CSS. */
function applyColorTheme(theme: ColorTheme) {
  const { style } = document.documentElement
  const vars = accentCssVars(theme)
  for (const [name, value] of Object.entries(vars)) {
    style.setProperty(name, value)
  }
  try {
    localStorage.setItem(COLOR_THEME_VARS_KEY, JSON.stringify(vars))
  } catch {}
}

export function ColorThemeProvider({ children }: { children: ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(DEFAULT_ACCENT)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(COLOR_THEME_KEY)
    if (isAccentColor(stored)) {
      setColorThemeState(stored)
      applyColorTheme(stored)
    } else {
      applyColorTheme(DEFAULT_ACCENT)
    }
  }, [])

  const setColorTheme = useCallback((theme: ColorTheme) => {
    setColorThemeState(theme)
    localStorage.setItem(COLOR_THEME_KEY, theme)
    applyColorTheme(theme)
  }, [])

  const value = useMemo(
    () => ({ colorTheme, setColorTheme, mounted }),
    [colorTheme, setColorTheme, mounted]
  )

  return <ColorThemeContext.Provider value={value}>{children}</ColorThemeContext.Provider>
}

export function useColorTheme(): ColorThemeContextValue {
  const ctx = useContext(ColorThemeContext)
  if (!ctx) {
    throw new Error("useColorTheme must be used within ColorThemeProvider")
  }
  return ctx
}
