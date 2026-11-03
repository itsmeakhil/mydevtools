import * as React from "react"

import { cn } from "@/lib/utils"
import { useGlassSheen } from "@/hooks/use-glass-sheen"

/**
 * `solid` (default) — content cards: readable, opaque, glass-style top edge.
 * `glass` — launcher-style cards (icon + name + one line): frosted fill over
 * the content pane with a pointer-following specular sheen.
 */
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: "solid" | "glass" }
>(({ className, variant = "solid", onPointerMove, ...props }, ref) => {
  const sheen = useGlassSheen<HTMLDivElement>()
  const glass = variant === "glass"
  return (
    <div
      ref={ref}
      className={cn(
        glass ? "glass-card glass-sheen" : "surface",
        "relative rounded-xl text-card-foreground",
        className
      )}
      onPointerMove={
        glass
          ? (e) => {
              sheen.onPointerMove(e)
              onPointerMove?.(e)
            }
          : onPointerMove
      }
      {...props}
    />
  )
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-4 sm:p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-[15px] font-semibold leading-tight tracking-[-0.01em]", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4 pt-0 sm:p-6 sm:pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-4 pt-0 sm:p-6 sm:pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
