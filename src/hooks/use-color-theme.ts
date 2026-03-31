"use client"

import { useEffect, useState } from "react"

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

export function useColorTheme() {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("blue")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(COLOR_THEME_KEY) as ColorTheme | null
    if (stored && isValidColorTheme(stored)) {
      setColorThemeState(stored)
      applyColorTheme(stored)
    } else {
      // Apply default blue theme on first load
      applyColorTheme("blue")
    }
  }, [])

  const setColorTheme = (theme: ColorTheme) => {
    setColorThemeState(theme)
    localStorage.setItem(COLOR_THEME_KEY, theme)
    applyColorTheme(theme)
  }

  return { colorTheme, setColorTheme, mounted }
}

function isValidColorTheme(theme: string): theme is ColorTheme {
  return COLOR_THEME_OPTIONS.includes(theme as ColorTheme)
}

function applyColorTheme(theme: ColorTheme) {
  const root = document.documentElement
  root.classList.remove(...COLOR_THEME_OPTIONS)
  root.classList.add(theme)
}

