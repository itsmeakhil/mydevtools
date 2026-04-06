"use client"

import React, { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Link as LinkIcon, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "../button"
import { Input } from "../input"
import { Label } from "../label"
import { Popover, PopoverContent, PopoverTrigger } from "../popover"
import { useToast } from "./hooks/use-toast"
import { EditorActions, useEditorDispatch, useEditorState, SelectionInfo } from "./index"

export function LinkPopover() {
  const t = useTranslations("RichEditor.link")
  const state = useEditorState()
  const dispatch = useEditorDispatch()
  const { toast } = useToast()
  const [hrefInput, setHrefInput] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<{
    top: number
    left: number
  } | null>(null)

  // Store the selection in a ref so it persists when focus changes
  const savedSelectionRef = useRef<SelectionInfo | null>(null)

  // Track selection and position the floating icon
  useEffect(() => {
    if (state.currentSelection && state.currentSelection.text.length > 0) {
      // Save the selection to ref so it persists when focus changes
      savedSelectionRef.current = state.currentSelection

      // Pre-fill the href input if selection has an existing link
      if (state.currentSelection.href && !isOpen) {
        setHrefInput(state.currentSelection.href)
      }

      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()

        // Find the editor container (the parent with relative positioning)
        const editorContainer = document
          .querySelector("[data-editor-content]")
          ?.closest(".relative")
        const containerRect = editorContainer?.getBoundingClientRect()

        if (containerRect) {
          // Calculate position relative to the editor container
          setPosition({
            top: rect.top - containerRect.top - 45, // 45px above the selection, relative to container
            left: rect.left - containerRect.left + rect.width / 2 + 16, // Offset to the right, relative to container
          })
        } else {
          // Fallback to old behavior if container not found
          setPosition({
            top: rect.top + window.scrollY - 45,
            left: rect.left + window.scrollX + rect.width / 2 + 16,
          })
        }
      }
    } else {
      // Only clear position if we don't have a saved selection and popover is closed
      if (!isOpen) {
        setPosition(null)
        savedSelectionRef.current = null
      }
    }
  }, [state.currentSelection, state.selectionKey, isOpen])

  // Handle link application
  const handleApplyLink = () => {
    // Use saved selection from ref instead of state
    if (!savedSelectionRef.current || !hrefInput.trim()) return

    // Temporarily restore the selection in state for the action
    dispatch(EditorActions.setCurrentSelection(savedSelectionRef.current))

    // Apply the link
    setTimeout(() => {
      dispatch(EditorActions.applyLink(hrefInput.trim()))

      toast({
        title: t("toastApplied"),
        description: t("toastLinkedTo", { url: hrefInput }),
      })

      setHrefInput("")
      setIsOpen(false)
      setPosition(null)
      savedSelectionRef.current = null
    }, 0)
  }

  // Handle link removal
  const handleRemoveLink = () => {
    // Use saved selection from ref instead of state
    if (!savedSelectionRef.current) return

    // Temporarily restore the selection in state for the action
    dispatch(EditorActions.setCurrentSelection(savedSelectionRef.current))

    // Remove the link
    setTimeout(() => {
      dispatch(EditorActions.removeLink())

      toast({
        title: t("toastRemoved"),
        description: t("toastRemovedDesc"),
      })

      setHrefInput("")
      setIsOpen(false)
      setPosition(null)
      savedSelectionRef.current = null
    }, 0)
  }

  const hasExistingLink = savedSelectionRef.current?.href

  return (
    <AnimatePresence mode="wait">
      {position && (
        <motion.div
          key={position.top + position.left}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`${position ? "opacity-100" : "!opacity-0"
            } pointer-events-auto absolute z-50 transition-opacity duration-300`}
          style={{
            top: `${position?.top || 0}px`,
            left: `${position?.left || 0}px`,
          }}
          exit={{ opacity: 0 }}
        >
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <button
                className={`bg-background flex h-8 w-8 items-center justify-center rounded-full border-2 shadow-lg transition-all hover:scale-110 ${hasExistingLink
                  ? "border-blue-500 text-blue-500"
                  : "border-border hover:border-primary"
                  }`}
                onMouseDown={(e) => {
                  // Prevent default to keep the selection
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onClick={(e) => {
                  // Prevent default to keep the selection
                  e.preventDefault()
                  e.stopPropagation()
                  setIsOpen(true)
                }}
              >
                <LinkIcon className="size-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-80"
              align="start"
              onOpenAutoFocus={(e) => {
                // Prevent the popover from stealing focus and losing selection
                e.preventDefault()
              }}
            >
              <div className="space-y-3">
                <div>
                  <h4 className="mb-1 text-sm font-medium">
                    {hasExistingLink ? t("editLink") : t("addLink")}
                  </h4>
                  <p className="text-muted-foreground text-xs">
                    {t("selectedText", {
                      text: savedSelectionRef.current?.text ?? "",
                    })}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="href-input" className="text-xs">
                    {t("linkUrl")}
                  </Label>
                  <Input
                    id="href-input"
                    placeholder={t("urlPlaceholder")}
                    value={hrefInput}
                    onChange={(e) => setHrefInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleApplyLink()
                      }
                    }}
                    className="flex-1"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleApplyLink}
                    disabled={!hrefInput.trim()}
                    size="sm"
                    className="flex-1"
                  >
                    <LinkIcon className="mr-1.5 size-3.5" />
                    {hasExistingLink ? t("update") : t("addLinkButton")}
                  </Button>
                  {hasExistingLink && (
                    <Button
                      onClick={handleRemoveLink}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
