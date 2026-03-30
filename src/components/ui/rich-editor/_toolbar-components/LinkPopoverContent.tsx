"use client"

import React from "react"
import { Link as LinkIcon, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "../../button"
import { Input } from "../../input"
import { Label } from "../../label"

interface LinkPopoverContentProps {
  hrefInput: string
  setHrefInput: (value: string) => void
  hasExistingLink: boolean
  selectedText: string
  onApply: () => void
  onRemove: () => void
}

export function LinkPopoverContent({
  hrefInput,
  setHrefInput,
  hasExistingLink,
  selectedText,
  onApply,
  onRemove,
}: LinkPopoverContentProps) {
  const t = useTranslations("RichEditor.link")
  return (
    <div className="space-y-3">
      <div>
        <h4 className="mb-1 text-sm font-medium">
          {hasExistingLink ? t("editLink") : t("addLink")}
        </h4>
        <p className="text-muted-foreground text-xs">
          {t("selectedText", { text: selectedText })}
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
              onApply()
            }
          }}
          className="flex-1"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div className="flex gap-2">
        <Button
          onClick={onApply}
          disabled={!hrefInput.trim()}
          size="sm"
          className="flex-1"
        >
          <LinkIcon className="mr-1.5 size-3.5" />
          {hasExistingLink ? t("update") : t("addLinkButton")}
        </Button>
        {hasExistingLink && (
          <Button onClick={onRemove} variant="destructive" size="sm">
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
