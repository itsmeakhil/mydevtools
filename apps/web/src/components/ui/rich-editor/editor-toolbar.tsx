"use client"

import React, { useEffect, useRef } from "react"
import {
  Eye,
  EyeOff,
  List,
  ListOrdered,
  Plus,
  Table as TableIcon,
} from "lucide-react"

import { Button } from "../button"
import { ButtonGroup } from "../button-group"
import { CardContent } from "../card"
import { Separator } from "../separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../tooltip"
import { MediaUploadPopover } from "./media-upload-popover"
import { useTranslations } from "next-intl"

interface EditorToolbarProps {
  isUploading: boolean
  readOnly?: boolean
  onReadOnlyChange?: (readOnly: boolean) => void
  onImageUploadClick: () => void
  onMultipleImagesUploadClick: () => void
  onVideoUploadClick: () => void
  onInsertComponentClick: () => void
  onCreateList: (listType: "ul" | "ol" | "li") => void
  onCreateTable: () => void
}

export function EditorToolbar({
  isUploading,
  readOnly = false,
  onReadOnlyChange,
  onImageUploadClick,
  onMultipleImagesUploadClick,
  onVideoUploadClick,
  onInsertComponentClick,
  onCreateList,
  onCreateTable,
}: EditorToolbarProps) {
  const t = useTranslations("RichEditor.toolbar")
  const toolbarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Measure toolbar height and set it as CSS variable
    const updateToolbarHeight = () => {
      if (toolbarRef.current) {
        const height = toolbarRef.current.offsetHeight
        document.documentElement.style.setProperty(
          "--toolbar-height",
          `${height + 4}px`
        )
      }
    }

    // Update on mount and when window resizes
    updateToolbarHeight()
    window.addEventListener("resize", updateToolbarHeight)

    return () => {
      window.removeEventListener("resize", updateToolbarHeight)
    }
  }, [])

  return (
    <TooltipProvider>
      <CardContent
        ref={toolbarRef}
        className="bg-background/30 sticky top-0 z-[100] mx-auto w-full border-b p-2 backdrop-blur-2xl transition-all duration-300"
      >
        <div className="mx-auto flex w-full max-w-4xl flex-col items-stretch justify-center gap-2 md:flex-row md:items-center md:gap-3 lg:px-6">
          {/* Insert Elements */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 md:gap-2">
            {/* Read-Only Toggle - Only show if handler is provided */}
            {onReadOnlyChange && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={readOnly ? "default" : "ghost"}
                      size="icon"
                      onClick={() => onReadOnlyChange(!readOnly)}
                      className="h-7 w-7 md:h-8 md:w-8"
                      title={readOnly ? t("viewOnlyMode") : t("editMode")}
                    >
                      {readOnly ? (
                        <Eye className="size-3 md:size-3.5" />
                      ) : (
                        <EyeOff className="size-3 md:size-3.5" />
                      )}
                      <span className="sr-only">
                        {readOnly ? t("viewOnlyMode") : t("editMode")}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{readOnly ? t("viewOnlyMode") : t("editMode")}</p>
                  </TooltipContent>
                </Tooltip>

                <Separator
                  orientation="vertical"
                  className="hidden h-5 sm:block md:h-6"
                />
              </>
            )}

            {/* Media Upload Popover - combines image and video uploads */}
            <MediaUploadPopover
              isUploading={isUploading}
              onImageUploadClick={onImageUploadClick}
              onMultipleImagesUploadClick={onMultipleImagesUploadClick}
              onVideoUploadClick={onVideoUploadClick}
            />

            <Separator
              orientation="vertical"
              className="hidden h-5 sm:block md:h-6"
            />

            {/* Insert Component Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onInsertComponentClick}
              className="h-7 w-7 md:h-8 md:w-8"
              title={t("insertComponent")}
              disabled={isUploading}
            >
              <Plus className="size-3 md:size-3.5" />
            </Button>

            <Separator
              orientation="vertical"
              className="hidden h-5 sm:block md:h-6"
            />

            {/* List Button Group */}
            <ButtonGroup>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onCreateList("ul")}
                className="h-7 w-7 md:h-8 md:w-8"
                title={t("addUnorderedList")}
              >
                <List className="size-3 md:size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onCreateList("ol")}
                className="h-7 w-7 md:h-8 md:w-8"
                title={t("addOrderedList")}
              >
                <ListOrdered className="size-3 md:size-3.5" />
              </Button>
            </ButtonGroup>

            {/* Table Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onCreateTable}
              className="h-7 w-7 md:h-8 md:w-8"
              title={t("addTable")}
            >
              <TableIcon className="size-3 md:size-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </TooltipProvider>
  )
}
