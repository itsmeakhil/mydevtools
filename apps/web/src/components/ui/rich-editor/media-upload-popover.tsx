"use client"

import React from "react"
import { Image as ImageIcon, ImagePlus, LayoutGrid, Video } from "lucide-react"

import { Button } from "../button"
import { Popover, PopoverContent, PopoverTrigger } from "../popover"
import { useTranslations } from "next-intl"

interface MediaUploadPopoverProps {
  isUploading: boolean
  onImageUploadClick: () => void
  onMultipleImagesUploadClick: () => void
  onVideoUploadClick: () => void
}

export function MediaUploadPopover({
  isUploading,
  onImageUploadClick,
  onMultipleImagesUploadClick,
  onVideoUploadClick,
}: MediaUploadPopoverProps) {
  const t = useTranslations("RichEditor.media")
  const [open, setOpen] = React.useState(false)

  const handleOptionClick = (action: () => void) => {
    action()
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={isUploading}
          className="h-7 w-7 md:h-8 md:w-8"
          title={t("popoverTitle")}
        >
          <ImageIcon className="size-3 md:size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            className="h-9 w-full justify-start gap-3"
            onClick={() => handleOptionClick(onImageUploadClick)}
            disabled={isUploading}
          >
            <ImagePlus className="size-4" />
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">{t("singleImage")}</span>
              <span className="text-muted-foreground text-xs">
                {t("singleImageDesc")}
              </span>
            </div>
          </Button>

          <Button
            variant="ghost"
            className="h-9 w-full justify-start gap-3"
            onClick={() => handleOptionClick(onMultipleImagesUploadClick)}
            disabled={isUploading}
          >
            <LayoutGrid className="size-4" />
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">{t("multipleImages")}</span>
              <span className="text-muted-foreground text-xs">
                {t("multipleImagesDesc")}
              </span>
            </div>
          </Button>

          <Button
            variant="ghost"
            className="h-9 w-full justify-start gap-3"
            onClick={() => handleOptionClick(onVideoUploadClick)}
            disabled={isUploading}
          >
            <Video className="size-4" />
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">{t("video")}</span>
              <span className="text-muted-foreground text-xs">
                {t("videoDesc")}
              </span>
            </div>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
