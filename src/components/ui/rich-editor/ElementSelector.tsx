"use client"

import React, { useMemo } from "react"
import { useTranslations } from "next-intl"
import {
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Type,
} from "lucide-react"

import { cn } from "@/lib/utils"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../select"
import {
  ELEMENT_OPTIONS,
  type ElementOption,
  type ElementType,
} from "./elements"

// Icon mapping
const iconMap: Record<string, React.ReactNode> = {
  Type: <Type className="h-4 w-4" />,
  Heading1: <Heading1 className="h-4 w-4" />,
  Heading2: <Heading2 className="h-4 w-4" />,
  Heading3: <Heading3 className="h-4 w-4" />,
  Code: <Code className="h-4 w-4" />,
  Quote: <Quote className="h-4 w-4" />,
  List: <List className="h-4 w-4" />,
  ListOrdered: <ListOrdered className="h-4 w-4" />,
}

// Helper to get icon with custom size
const getIcon = (iconName?: string, iconSize?: string) => {
  if (!iconName) return null
  const IconComponent = iconMap[iconName]
  if (!IconComponent) return null

  // Clone the icon with custom size if provided
  if (iconSize && React.isValidElement(IconComponent)) {
    return React.cloneElement(IconComponent, { className: iconSize } as any)
  }
  return IconComponent
}

interface ElementSelectorProps {
  value: ElementType | null
  onValueChange: (value: ElementType) => void
  elements?: ElementOption[]
  variant?: "default" | "compact" | "icon-only"
  className?: string
  disabled?: boolean
  showDescription?: boolean
  showIcon?: boolean
}

export function ElementSelector({
  value,
  onValueChange,
  elements = ELEMENT_OPTIONS,
  variant = "default",
  className,
  disabled = false,
  showDescription = true,
  showIcon = true,
}: ElementSelectorProps) {
  const tCmd = useTranslations("RichEditor.command")

  const localizedElements = useMemo(
    () =>
      elements.map((el) => ({
        ...el,
        label: tCmd(`${el.value}.label`),
        description: el.description
          ? tCmd(`${el.value}.description`)
          : undefined,
      })),
    [elements, tCmd]
  )

  // Get the current element option
  const currentElement =
    localizedElements.find((el) => el.value === value) ||
    localizedElements[0]

  // Variant-specific styling
  const triggerClassName = cn(
    "transition-colors",
    variant === "compact" &&
      "h-8 min-w-[90px] border-0 bg-transparent hover:bg-accent/50 focus:ring-0 text-xs rounded-md px-2 gap-1.5",
    variant === "icon-only" &&
      "h-9 w-9 border-0 bg-transparent hover:bg-accent/50 focus:ring-0 p-0",
    variant === "default" && "min-w-[140px]",
    className
  )

  return (
    <Select
      value={value || "p"}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger className={triggerClassName}>
        <SelectValue>
          {variant === "icon-only" ? (
            <div className="flex items-center justify-center">
              {getIcon(currentElement.icon, currentElement.iconSize)}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {showIcon &&
                getIcon(currentElement.icon, currentElement.iconSize)}
              <span
                className={cn(
                  "font-normal",
                  variant === "compact" ? "text-xs" : "text-sm"
                )}
              >
                {currentElement.label}
              </span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {localizedElements.map((element) => (
          <SelectItem
            key={element.value}
            value={element.value}
            className={cn("cursor-pointer", showDescription && "py-2")}
          >
            <div className="flex w-full items-start gap-2">
              {showIcon && (
                <div className="text-muted-foreground mt-0.5">
                  {getIcon(element.icon, element.iconSize)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{element.label}</span>
                  {element.shortcut && (
                    <span className="text-muted-foreground font-mono text-xs">
                      {element.shortcut}
                    </span>
                  )}
                </div>
                {showDescription && element.description && (
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {element.description}
                  </p>
                )}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// Re-export for convenience
export { ELEMENT_OPTIONS }
export type { ElementType, ElementOption }
