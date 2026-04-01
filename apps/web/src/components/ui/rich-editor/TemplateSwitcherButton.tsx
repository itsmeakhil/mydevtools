"use client"

import React, { useEffect, useRef, useState } from "react"
import {
  BookOpen,
  Briefcase,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  User,
  Zap,
} from "lucide-react"

import { cn } from "@/lib/utils"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../alert-dialog"
import { Button } from "../button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../dialog"
import {
  getAllTemplateMetadata,
  getTemplateById,
  type TemplateMetadata,
} from "./templates"
import type { EditorState } from "./types"
import { useTranslations } from "next-intl"

interface TemplateSwitcherButtonProps {
  onTemplateChange: (state: EditorState) => void
  currentState: EditorState
}

// Category icons
const categoryIcons: Record<
  TemplateMetadata["category"],
  React.ComponentType<{ className?: string }>
> = {
  productivity: Zap,
  creative: Sparkles,
  business: Briefcase,
  personal: User,
}

// Category colors (solid colors for cleaner look)
const categoryColors: Record<TemplateMetadata["category"], string> = {
  productivity: "bg-blue-500 hover:bg-blue-600",
  creative: "bg-purple-500 hover:bg-purple-600",
  business: "bg-green-500 hover:bg-green-600",
  personal: "bg-orange-500 hover:bg-orange-600",
}

export function TemplateSwitcherButton({
  onTemplateChange,
  currentState,
}: TemplateSwitcherButtonProps) {
  const t = useTranslations("RichEditor.template")
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<
    TemplateMetadata["category"] | "all"
  >("all")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(
    null
  )
  const [isApplying, setIsApplying] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const allTemplates = getAllTemplateMetadata()

  // Reset scroll position when category changes or dialog opens
  useEffect(() => {
    if (scrollContainerRef.current && isOpen) {
      scrollContainerRef.current.scrollTop = 0
    }
  }, [selectedCategory, isOpen])

  const filteredTemplates =
    selectedCategory === "all"
      ? allTemplates
      : allTemplates.filter((t) => t.category === selectedCategory)

  const categories: Array<{
    value: "all" | TemplateMetadata["category"]
    label: string
  }> = [
      { value: "all", label: t("catAll") },
      { value: "productivity", label: t("catProductivity") },
      { value: "creative", label: t("catCreative") },
      { value: "business", label: t("catBusiness") },
      { value: "personal", label: t("catPersonal") },
    ]

  // Check if there's existing content
  const hasExistingContent = () => {
    const container = currentState.history[currentState.historyIndex]
    if (!container || !container.children || container.children.length === 0) {
      return false
    }

    // Check if there's any non-empty content
    return container.children.some((child) => {
      if ("content" in child && child.content && child.content.trim() !== "") {
        return true
      }
      if ("children" in child && child.children && child.children.length > 0) {
        return true
      }
      return false
    })
  }

  const handleTemplateSelect = (templateId: string) => {
    // Set the pending template ID immediately for UI feedback
    setPendingTemplateId(templateId)

    // Check if there's existing content
    if (hasExistingContent()) {
      setShowConfirmDialog(true)
      return
    }

    // No existing content, proceed directly
    applyTemplate(templateId)
  }

  const applyTemplate = async (templateId: string) => {
    const template = getTemplateById(templateId)
    if (!template) return

    setIsApplying(true)

    // Small delay for smoother UX
    await new Promise((resolve) => setTimeout(resolve, 150))

    // Create completely fresh state with template content
    // This ensures all editor state is properly reset
    const newState: EditorState = {
      version: "1.0.0",
      history: [
        {
          id: "root",
          type: "container",
          children: template.content,
          attributes: {},
        },
      ],
      historyIndex: 0,
      activeNodeId: null,
      hasSelection: false,
      selectionKey: 0,
      currentSelection: null,
      selectedBlocks: new Set<string>(),
      coverImage: template.coverImage || null,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        templateId: template.metadata.id,
        templateName: template.metadata.name,
      },
    }

    // Apply the new state
    onTemplateChange(newState)

    // Close dialogs
    setIsOpen(false)
    setShowConfirmDialog(false)
    setPendingTemplateId(null)
    setIsApplying(false)

    // Force a complete cleanup and re-render
    setTimeout(() => {
      // Clear any browser selection and focus
      const selection = window.getSelection()
      if (selection) {
        selection.removeAllRanges()
      }

      // Remove focus from any active element
      const activeElement = document.activeElement as HTMLElement
      if (activeElement && activeElement.blur) {
        activeElement.blur()
      }

      // Force scroll to top to show new template from the beginning
      window.scrollTo({ top: 0, behavior: "smooth" })
    }, 100)
  }

  const handleConfirmReplace = () => {
    if (pendingTemplateId) {
      applyTemplate(pendingTemplateId)
    }
  }

  const handleCancelReplace = () => {
    setShowConfirmDialog(false)
    setPendingTemplateId(null)
  }

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 left-6 md:left-[280px] z-50">
        <Button
          onClick={() => {
            setIsOpen(true)
            setSelectedCategory("all") // Reset to all templates when opening
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={cn(
            "h-12 w-12 rounded-full shadow-lg transition-all duration-200",
            "bg-primary hover:bg-primary/90",
            "hover:scale-105 hover:shadow-xl",
            "group"
          )}
          size="icon"
          title={t("fabTitle")}
        >
          <Plus
            className={cn(
              "h-5 w-5 transition-transform duration-200",
              isHovered && "scale-110"
            )}
          />
        </Button>
      </div>

      {/* Template Selector Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-background/95 border-border/50 flex max-h-[85vh] max-w-6xl min-w-fit flex-col overflow-hidden shadow-2xl backdrop-blur-xl">
          <DialogHeader className="space-y-3 pb-6">
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <div className="bg-primary/10 rounded-lg p-2">
                <FileText className="text-primary h-6 w-6" />
              </div>
              {t("title")}
            </DialogTitle>
            <DialogDescription className="text-base">
              {t("description")}
            </DialogDescription>
          </DialogHeader>

          {/* Category Filter */}
          <div className="border-border/50 flex flex-wrap gap-2 border-b pb-6">
            {categories.map((category) => {
              const Icon =
                category.value === "all"
                  ? BookOpen
                  : categoryIcons[
                  category.value as TemplateMetadata["category"]
                  ]
              const isActive = selectedCategory === category.value

              return (
                <Button
                  key={category.value}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.value)}
                  className={cn(
                    "gap-2 transition-all duration-200",
                    isActive && "scale-105 shadow-md"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {category.label}
                </Button>
              )
            })}
          </div>

          {/* Templates Grid */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pt-4">
            <div className="grid grid-cols-1 gap-5 px-1 pb-2 md:grid-cols-2 lg:grid-cols-4">
              {filteredTemplates.map((template) => {
                const CategoryIcon = categoryIcons[template.category]
                const isCurrentlyApplying =
                  isApplying && pendingTemplateId === template.id

                return (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template.id)}
                    disabled={isApplying}
                    className={cn(
                      "group border-border/60 relative rounded-xl border p-6",
                      "hover:border-primary/60 hover:shadow-primary/10 hover:shadow-lg",
                      "hover:bg-accent/30 hover:scale-[1.02]",
                      "transition-all duration-300 ease-out",
                      "bg-background/50 backdrop-blur-sm",
                      "text-left",
                      isApplying &&
                      !isCurrentlyApplying &&
                      "cursor-not-allowed opacity-50",
                      isCurrentlyApplying &&
                      "border-primary/80 shadow-primary/20 scale-[1.02] shadow-lg"
                    )}
                  >
                    {/* Category badge */}
                    <div className="absolute top-4 right-4">
                      <div className="bg-muted/80 border-border/40 rounded-lg border p-2 backdrop-blur-sm">
                        <CategoryIcon className="text-muted-foreground h-4 w-4" />
                      </div>
                    </div>

                    {/* Loading overlay */}
                    {isCurrentlyApplying && (
                      <div className="bg-background/80 absolute inset-0 z-10 flex items-center justify-center rounded-xl backdrop-blur-sm">
                        <Loader2 className="text-primary h-8 w-8 animate-spin" />
                      </div>
                    )}

                    {/* Icon */}
                    <div className="mb-4 text-5xl transition-transform duration-200 group-hover:scale-110">
                      {template.icon}
                    </div>

                    {/* Template Info */}
                    <h3 className="group-hover:text-primary mb-2 pr-10 text-base font-semibold transition-colors duration-200">
                      {template.name}
                    </h3>
                    <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
                      {template.description}
                    </p>
                  </button>
                )
              })}
            </div>

            {filteredTemplates.length === 0 && (
              <div className="text-muted-foreground flex flex-col items-center justify-center py-16">
                <div className="bg-muted/50 mb-4 rounded-full p-4">
                  <BookOpen className="h-12 w-12 opacity-50" />
                </div>
                <p className="text-base">{t("noTemplates")}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="bg-background/95 border-border/50 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="bg-destructive/10 rounded-lg p-2">
                <FileText className="text-destructive h-5 w-5" />
              </div>
              {t("confirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base leading-relaxed">
              {t("confirmDescription")}
              <br />
              <span className="text-destructive font-semibold">
                {t("cannotUndo")}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelReplace}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReplace}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t("replaceContent")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
