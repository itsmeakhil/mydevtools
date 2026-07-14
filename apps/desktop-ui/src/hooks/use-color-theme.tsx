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

export type ColorTheme =
  | "blue"
  | "purple"
  | "green"
  | "orange"
  | "red"
  | "pink"
  | "cyan"
  | "indigo"

const COLOR_THEME_KEY = "app-color-theme"
export const COLOR_THEME_OPTIONS: ColorTheme[] = [
  "cyan",
  "blue",
  "indigo",
  "purple",
  "green",
  "orange",
  "red",
  "pink",
]

type ColorThemeContextValue = {
  colorTheme: ColorTheme
  setColorTheme: (theme: ColorTheme) => void
  mounted: boolean
}

const ColorThemeContext = createContext<ColorThemeContextValue | null>(null)

function isValidColorTheme(theme: string): theme is ColorTheme {
  return COLOR_THEME_OPTIONS.includes(theme as ColorTheme)
}

function applyColorTheme(theme: ColorTheme) {
  const root = document.documentElement
  root.classList.remove(...COLOR_THEME_OPTIONS)
  root.classList.add(theme)
}

export function ColorThemeProvider({ children }: { children: ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("blue")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(COLOR_THEME_KEY) as ColorTheme | null
    if (stored && isValidColorTheme(stored)) {
      setColorThemeState(stored)
      applyColorTheme(stored)
    } else {
      applyColorTheme("blue")
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
