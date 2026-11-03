"use client"

import { useTheme } from "next-themes"
import { Toaster as SonnerToaster } from "sonner"

/**
 * App-wide toast styling. Theme-aware (syncs with next-themes) and matched to
 * the `glass` material used by menus and popovers.
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
            "group glass rounded-xl",
          title: "text-[13px] font-semibold text-foreground",
          description: "text-xs text-muted-foreground",
          actionButton:
            "rounded-md bg-primary text-primary-foreground text-xs font-medium",
          cancelButton: "rounded-md bg-muted text-muted-foreground text-xs",
          closeButton: "border-border bg-popover hover:bg-muted",
        },
      }}
    />
  )
}
