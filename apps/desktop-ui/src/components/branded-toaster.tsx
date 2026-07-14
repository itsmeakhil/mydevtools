"use client"

import { useTheme } from "next-themes"
import { Toaster as SonnerToaster } from "sonner"

/**
 * App-wide toast styling. Theme-aware (syncs with next-themes) and matched to
 * the overlay design language — rounded-xl, soft border, blur, layered shadow.
 */
export function BrandedToaster() {
  const { resolvedTheme } = useTheme()

  return (
    <SonnerToaster
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="bottom-right"
      gap={10}
      toastOptions={{
        classNames: {
          toast:
            "group rounded-xl border border-border/70 bg-popover/95 backdrop-blur-md shadow-xl shadow-black/10",
          title: "text-sm font-semibold text-foreground",
          description: "text-xs text-muted-foreground",
          actionButton:
            "rounded-md bg-primary text-primary-foreground text-xs font-medium",
          cancelButton: "rounded-md bg-muted text-muted-foreground text-xs",
          closeButton: "border-border/70 bg-background hover:bg-muted",
        },
      }}
    />
  )
}
