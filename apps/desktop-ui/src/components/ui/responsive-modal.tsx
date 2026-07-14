"use client"

import * as React from "react"
import { useIsMobile } from "@/components/hooks/use-mobile"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

interface ResponsiveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

/**
 * Renders a centered Dialog on desktop and a bottom-sheet Drawer on mobile.
 * Use the sub-components (ResponsiveModalHeader, etc.) for consistent layout
 * across both variants.
 */
function ResponsiveModal({ open, onOpenChange, children }: ResponsiveModalProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>{children}</DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>{children}</DialogContent>
    </Dialog>
  )
}

function ResponsiveModalHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const isMobile = useIsMobile()
  if (isMobile) return <DrawerHeader className={className} {...props} />
  return <DialogHeader className={className} {...props} />
}

function ResponsiveModalFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const isMobile = useIsMobile()
  if (isMobile) return <DrawerFooter className={className} {...props} />
  return <DialogFooter className={className} {...props} />
}

function ResponsiveModalTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  const isMobile = useIsMobile()
  if (isMobile) return <DrawerTitle className={className} {...props} />
  return <DialogTitle className={className} {...props} />
}

function ResponsiveModalDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  const isMobile = useIsMobile()
  if (isMobile) return <DrawerDescription className={className} {...props} />
  return <DialogDescription className={className} {...props} />
}

/** Scrollable body region inside the modal — add padding and overflow. */
function ResponsiveModalBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`px-4 pb-4 overflow-y-auto max-h-[70vh] md:max-h-none ${className ?? ""}`}
      {...props}
    />
  )
}

export {
  ResponsiveModal,
  ResponsiveModalHeader,
  ResponsiveModalFooter,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
  ResponsiveModalBody,
}
