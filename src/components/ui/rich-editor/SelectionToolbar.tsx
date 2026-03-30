"use client"

import React, { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Link as LinkIcon, Type } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

import { Button } from "../button"
import { Popover, PopoverContent, PopoverTrigger } from "../popover"
import { Separator } from "../separator"
import {
  CustomClassPopoverContent,
  FormatButtons,
  LinkPopoverContent,
} from "./_toolbar-components"
import {
  getUserFriendlyClasses,
  searchUserFriendlyClasses,
} from "./class-mappings"
import { ColorPickerComponent } from "./color-picker"
import { ElementSelector, ElementType } from "./ElementSelector"
import { FontSizePicker } from "./font-size-picker"
import { EditorActions } from "./lib/reducer/actions"
import { useEditorDispatch, useEditorState } from "./store/editor-store"
import { tailwindClasses } from "./tailwind-classes"
import { SelectionInfo } from "./types"
import { getReplacementInfo, mergeClasses } from "./utils/class-replacement"

interface SelectionToolbarProps {
  selection: SelectionInfo | null
  selectedColor: string
  editorRef: React.RefObject<HTMLDivElement | null>
  onFormat: (
    format: "bold" | "italic" | "underline" | "strikethrough" | "code"
  ) => void
  onTypeChange: (type: string) => void
  onColorSelect: (color: string) => void
  onFontSizeSelect: (fontSize: string) => void
}

export function SelectionToolbar({
  selection,
  selectedColor,
  editorRef,
  onFormat,
  onTypeChange,
  onColorSelect,
  onFontSizeSelect,
}: SelectionToolbarProps) {
  const tLink = useTranslations("RichEditor.link")
  const tCustomClass = useTranslations("RichEditor.customClass")
  const state = useEditorState()
  const dispatch = useEditorDispatch()
  const { toast } = useToast()
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [isVisible, setIsVisible] = useState(false)
  const toolbarRef = useRef<HTMLDivElement>(null)

  // Link popover state
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false)
  const [hrefInput, setHrefInput] = useState("")

  // Custom class popover state
  const [customClassPopoverOpen, setCustomClassPopoverOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [devMode, setDevMode] = useState(false)

  // Store selection for link/class application
  const savedSelectionRef = useRef<typeof selection>(null)

  useEffect(() => {
    // Keep toolbar visible and position stable if either popover is open
    if (linkPopoverOpen || customClassPopoverOpen) {
      return
    }

    if (!selection || selection.text.length === 0) {
      setIsVisible(false)
      return
    }

    // Save selection for later use in popovers
    savedSelectionRef.current = selection

    // Pre-fill link input if selection has an existing link
    if (selection.href && !linkPopoverOpen) {
      setHrefInput(selection.href)
    }

    // Get the current selection range
    const domSelection = window.getSelection()
    if (!domSelection || domSelection.rangeCount === 0) {
      // Don't hide if we already have a position and saved selection
      if (savedSelectionRef.current && position.top !== 0) {
        return
      }
      setIsVisible(false)
      return
    }

    const range = domSelection.getRangeAt(0)
    const rect = range.getBoundingClientRect()

    // Don't update position if rect is empty/collapsed and we already have a good position
    if (rect.width === 0 && rect.height === 0 && position.top !== 0) {
      return
    }

    // Get the editor container from ref
    if (!editorRef.current) {
      setIsVisible(false)
      return
    }

    const editorRect = editorRef.current.getBoundingClientRect()

    // Calculate position above the selection
    const toolbarHeight = toolbarRef.current?.offsetHeight || 44 // Use actual toolbar height
    const gap = 8 // Gap between selection and toolbar

    // Position toolbar centered above the selection, relative to editor container
    let left = rect.left - editorRect.left + rect.width / 2
    const top = rect.top - editorRect.top - toolbarHeight - gap

    // Adjust horizontal position if toolbar would go off-screen
    if (toolbarRef.current) {
      const toolbarWidth = toolbarRef.current.offsetWidth
      left = left - toolbarWidth / 2

      // Keep toolbar within editor container bounds
      const padding = 16
      if (left < padding) {
        left = padding
      } else if (left + toolbarWidth > editorRect.width - padding) {
        left = editorRect.width - toolbarWidth - padding
      }
    }

    setPosition({ top, left })
    setIsVisible(true)
  }, [
    selection,
    linkPopoverOpen,
    customClassPopoverOpen,
    position.top,
    editorRef,
  ])

  // Link handlers
  const handleApplyLink = () => {
    if (!savedSelectionRef.current || !hrefInput.trim()) return

    dispatch(EditorActions.setCurrentSelection(savedSelectionRef.current))

    setTimeout(() => {
      dispatch(EditorActions.applyLink(hrefInput.trim()))

      toast({
        title: tLink("toastApplied"),
        description: tLink("toastLinkedTo", { url: hrefInput }),
      })

      setHrefInput("")
      setLinkPopoverOpen(false)
    }, 0)
  }

  const handleRemoveLink = () => {
    if (!savedSelectionRef.current) return

    dispatch(EditorActions.setCurrentSelection(savedSelectionRef.current))

    setTimeout(() => {
      dispatch(EditorActions.removeLink())

      toast({
        title: tLink("toastRemoved"),
        description: tLink("toastRemovedDesc"),
      })

      setHrefInput("")
      setLinkPopoverOpen(false)
    }, 0)
  }

  // Custom class handlers with smart replacement
  const handleApplyCustomClass = (className: string) => {
    if (!savedSelectionRef.current) return

    // Get current classes from selection
    const currentClassName = savedSelectionRef.current.className || ""

    // Get replacement info
    const replacementInfo = getReplacementInfo(currentClassName, className)

    // Merge classes intelligently (replaces same-category classes)
    const mergedClasses = mergeClasses(currentClassName, className)

    dispatch(
      EditorActions.setCurrentSelection({
        ...savedSelectionRef.current,
        formats: {
          bold: false,
          italic: false,
          underline: false,
          strikethrough: false,
          code: false,
        },
      })
    )

    setTimeout(() => {
      dispatch(EditorActions.applyCustomClass(mergedClasses))

      // Show appropriate toast message
      if (
        replacementInfo.willReplace &&
        replacementInfo.replacedClasses.length > 0
      ) {
        toast({
          title: tCustomClass("toastClassReplaced"),
          description: tCustomClass("toastClassReplacedDesc", {
            replaced: replacementInfo.replacedClasses.join(", "),
            className,
          }),
        })
      } else {
        toast({
          title: tCustomClass("toastCustomClassApplied"),
          description: tCustomClass("toastAppliedClass", { className }),
        })
      }

      setCustomClassPopoverOpen(false)
      setSearchQuery("")
    }, 0)
  }

  // Filter classes for custom class popover
  const filteredClasses = devMode
    ? searchQuery
      ? tailwindClasses
          .map((group) => ({
            ...group,
            classes: group.classes.filter((cls) =>
              cls.toLowerCase().includes(searchQuery.toLowerCase())
            ),
          }))
          .filter((group) => group.classes.length > 0)
      : tailwindClasses
    : searchQuery
      ? searchUserFriendlyClasses(searchQuery)
      : getUserFriendlyClasses()

  // Use savedSelection if current selection is lost but popovers are open
  const activeSelection = selection || savedSelectionRef.current

  if (!activeSelection && !linkPopoverOpen && !customClassPopoverOpen) {
    return null
  }

  const { formats } = activeSelection || {
    formats: {
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      code: false,
    },
  }
  const hasExistingLink = Boolean(savedSelectionRef.current?.href)

  return (
    <AnimatePresence mode="wait">
      {position &&
        isVisible && ( // Keep toolbar visible if either popover is open, even if selection is lost
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            ref={toolbarRef}
            className={cn(
              "absolute z-[200] duration-200",
              "pointer-events-auto inline-flex items-stretch rounded-lg shadow-md",
              "bg-popover/95 border-border/50 border backdrop-blur-sm",
              "text-sm leading-tight"
            )}
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              height: "40px",
              padding: "4px",
            }}
          >
            {/* Text Type Selector */}
            <ElementSelector
              value={activeSelection?.elementType as ElementType}
              onValueChange={(value) => onTypeChange(value)}
              variant="compact"
              showDescription={false}
              showIcon={false}
              className="mr-2"
            />

            {/* Format Buttons */}
            <FormatButtons formats={formats} onFormat={onFormat} size="sm" />

            <Separator
              orientation="vertical"
              className="bg-border/50 mx-1.5 my-auto h-6"
            />

            {/* Color Picker */}
            <ColorPickerComponent
              disabled={!activeSelection}
              onColorSelect={onColorSelect}
              selectedColor={selectedColor}
            />

            {/* Font Size Picker */}
            <FontSizePicker
              disabled={!activeSelection}
              onFontSizeSelect={onFontSizeSelect}
              currentFontSize={activeSelection?.styles?.fontSize || undefined}
            />

            <Separator
              orientation="vertical"
              className="bg-border/50 mx-1.5 my-auto h-6"
            />

            {/* Link Popover */}
            <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "hover:bg-accent/50 h-7 min-w-fit gap-1.5 rounded-md px-2 transition-colors duration-75",
                    hasExistingLink && "text-blue-500"
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-80"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onInteractOutside={(e) => {
                  // Prevent closing when clicking on the toolbar
                  const target = e.target as HTMLElement
                  if (toolbarRef.current?.contains(target)) {
                    e.preventDefault()
                  }
                }}
              >
                <LinkPopoverContent
                  hrefInput={hrefInput}
                  setHrefInput={setHrefInput}
                  hasExistingLink={hasExistingLink}
                  selectedText={savedSelectionRef.current?.text || ""}
                  onApply={handleApplyLink}
                  onRemove={handleRemoveLink}
                />
              </PopoverContent>
            </Popover>

            {/* Custom Class Popover */}
            <Popover
              open={customClassPopoverOpen}
              onOpenChange={setCustomClassPopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-accent/50 h-7 min-w-fit gap-1.5 rounded-md px-2 transition-colors duration-75"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                >
                  <div className="border-border/50 flex h-6 w-6 items-center justify-center rounded-md border text-center font-medium">
                    <Type className="h-3.5 w-3.5" />
                  </div>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-96"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onInteractOutside={(e) => {
                  // Prevent closing when clicking on the toolbar
                  const target = e.target as HTMLElement
                  if (toolbarRef.current?.contains(target)) {
                    e.preventDefault()
                  }
                }}
              >
                <CustomClassPopoverContent
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  devMode={devMode}
                  setDevMode={setDevMode}
                  filteredClasses={filteredClasses}
                  onApplyClass={handleApplyCustomClass}
                />
              </PopoverContent>
            </Popover>

            <Separator
              orientation="vertical"
              className="bg-border/50 mx-1.5 my-auto h-6"
            />
          </motion.div>
        )}
    </AnimatePresence>
  )
}
