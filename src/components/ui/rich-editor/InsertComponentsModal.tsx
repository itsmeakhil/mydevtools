"use client"

import React from "react"
import { ImagePlus } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"

import { Button } from "../button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../dialog"
import {
  INSERT_COMPONENTS,
  type InsertComponent,
} from "./insert-components-data"

interface InsertComponentsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (componentId: string) => void
}

// Icon mapping for components
const componentIcons: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  "free-image": ImagePlus,
}

export function InsertComponentsModal({
  open,
  onOpenChange,
  onSelect,
}: InsertComponentsModalProps) {
  const t = useTranslations("RichEditor.insertComponents")
  const handleSelect = (componentId: string) => {
    onSelect(componentId)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="bg-primary/10 rounded-lg p-2">
              <ImagePlus className="text-primary h-6 w-6" />
            </div>
            {t("title")}
          </DialogTitle>
          <DialogDescription className="text-base">
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        {/* Components Grid */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {INSERT_COMPONENTS.map((component) => {
            const Icon = componentIcons[component.id] || ImagePlus
            const title =
              component.id === "free-image"
                ? t("freeImage.name")
                : component.name
            const description =
              component.id === "free-image"
                ? t("freeImage.description")
                : component.description

            return (
              <button
                key={component.id}
                onClick={() => handleSelect(component.id)}
                className={cn(
                  "group border-border/60 relative rounded-xl border p-6",
                  "hover:border-primary/60 hover:shadow-primary/10 hover:shadow-lg",
                  "hover:bg-accent/30 hover:scale-[1.02]",
                  "transition-all duration-300 ease-out",
                  "bg-background/50 backdrop-blur-sm",
                  "text-left"
                )}
              >
                {/* Icon */}
                <div className="mb-3 flex items-center gap-4">
                  <div className="bg-primary/10 group-hover:bg-primary/20 rounded-lg p-3 transition-colors">
                    <Icon className="text-primary h-6 w-6" />
                  </div>
                  <div className="text-3xl">{component.icon}</div>
                </div>

                {/* Component Info */}
                <h3 className="group-hover:text-primary mb-2 text-lg font-semibold transition-colors duration-200">
                  {title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {description}
                </p>

                {/* Category badge */}
                <div className="mt-4">
                  <span className="bg-muted/80 text-muted-foreground inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
                    {t(`categories.${component.category}`)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Empty state for future */}
        {INSERT_COMPONENTS.length === 0 && (
          <div className="text-muted-foreground flex flex-col items-center justify-center py-16">
            <ImagePlus className="mb-4 h-12 w-12 opacity-50" />
            <p className="text-base">{t("noComponents")}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
