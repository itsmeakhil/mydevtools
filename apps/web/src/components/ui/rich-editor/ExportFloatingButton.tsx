"use client"

import React, { useState } from "react"
import {
  Check,
  Code2,
  Copy,
  Download,
  Eye,
  FileJson,
  Sparkles,
} from "lucide-react"

import { cn } from "@/lib/utils"

import { Button } from "../button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../dialog"
import { Label } from "../label"
import { Switch } from "../switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../tabs"
import { type ContainerNode } from "./types"
import { serializeToHtml } from "./utils/serialize-to-html"
import { useTranslations } from "next-intl"

interface ExportFloatingButtonProps {
  container: ContainerNode
  onCopyHtml: () => void
  onCopyJson: () => void
  copiedHtml: boolean
  copiedJson: boolean
  enhanceSpaces: boolean
  onEnhanceSpacesChange: (checked: boolean) => void
}

export function ExportFloatingButton({
  container,
  onCopyHtml,
  onCopyJson,
  copiedHtml,
  copiedJson,
  enhanceSpaces,
  onEnhanceSpacesChange,
}: ExportFloatingButtonProps) {
  const t = useTranslations("RichEditor.export")
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  return (
    <>
      {/* Floating Button */}
      <div className="fixed right-6 bottom-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          aria-label={t("fabAria")}
          className={cn(
            "h-14 w-14 rounded-full shadow-2xl transition-all duration-300 ease-out",
            "from-primary via-primary to-primary/80 bg-gradient-to-br",
            "hover:shadow-primary/50 hover:scale-110",
            "border-primary/20 border-2",
            "group relative overflow-hidden"
          )}
          size="icon"
        >
          {/* Animated background gradient */}
          <div
            className={cn(
              "from-primary/0 via-primary-foreground/10 to-primary-foreground/20 absolute inset-0 bg-gradient-to-br",
              "transition-opacity duration-300",
              isHovered ? "opacity-100" : "opacity-0"
            )}
          />

          {/* Icon with sparkle effect */}
          <div className="relative">
            <Code2 className="h-6 w-6 transition-transform duration-300 group-hover:rotate-12" />
          </div>

          {/* Ripple effect on hover */}
          <span
            className={cn(
              "bg-primary-foreground/20 absolute inset-0 rounded-full",
              "transition-transform duration-700",
              isHovered ? "scale-150 opacity-0" : "scale-0 opacity-100"
            )}
          />
        </Button>
      </div>

      {/* Export Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-[90vw] min-w-[90vw] flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              {t("title")}
            </DialogTitle>
            <DialogDescription>
              {t("description")}
            </DialogDescription>
          </DialogHeader>

          <Tabs
            defaultValue="preview"
            className="flex flex-1 flex-col overflow-hidden"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-4 w-4" />
                {t("preview")}
              </TabsTrigger>
              <TabsTrigger value="html" className="gap-2">
                <Code2 className="h-4 w-4" />
                {t("html")}
              </TabsTrigger>
              <TabsTrigger value="json" className="gap-2">
                <FileJson className="h-4 w-4" />
                {t("json")}
              </TabsTrigger>
            </TabsList>

            {/* Enhance Spaces Toggle */}
            <div className="mt-4 flex items-center justify-between px-1">
              <p className="text-muted-foreground text-sm">{t("previewOptions")}</p>
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="enhance-spaces"
                  className="cursor-pointer text-sm"
                >
                  {t("enhanceSpaces")}
                </Label>
                <Switch
                  id="enhance-spaces"
                  checked={enhanceSpaces}
                  onCheckedChange={onEnhanceSpacesChange}
                />
              </div>
            </div>

            {/* Preview Tab */}
            <TabsContent
              value="preview"
              className="mt-4 flex flex-1 flex-col overflow-hidden"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-muted-foreground text-sm">
                  {t("livePreview")}
                </p>
              </div>
              <div
                className="bg-background flex-1 overflow-auto rounded-lg border p-6"
                dangerouslySetInnerHTML={{
                  __html: enhanceSpaces
                    ? `<div class="[&>*]:my-3 [&_*]:my-5">${serializeToHtml(
                        container
                      )}</div>`
                    : serializeToHtml(container),
                }}
              />
            </TabsContent>

            {/* HTML Tab */}
            <TabsContent
              value="html"
              className="mt-4 flex flex-1 flex-col overflow-hidden"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-muted-foreground text-sm">
                  {t("htmlTailwind")}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCopyHtml}
                  className="gap-2"
                >
                  {copiedHtml ? (
                    <>
                      <Check className="h-4 w-4" />
                      {t("copied")}
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      {t("copyHtml")}
                    </>
                  )}
                </Button>
              </div>
              <pre className="bg-secondary text-secondary-foreground flex-1 overflow-auto rounded-lg border p-4 text-xs">
                {enhanceSpaces
                  ? `<div class="[&>*]:my-3 [&_*]:my-5">\n${serializeToHtml(
                      container
                    )}\n</div>`
                  : serializeToHtml(container)}
              </pre>
            </TabsContent>

            {/* JSON Tab */}
            <TabsContent
              value="json"
              className="mt-4 flex flex-1 flex-col overflow-hidden"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-muted-foreground text-sm">
                  {t("editorJson")}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCopyJson}
                  className="gap-2"
                >
                  {copiedJson ? (
                    <>
                      <Check className="h-4 w-4" />
                      {t("copied")}
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      {t("copyJson")}
                    </>
                  )}
                </Button>
              </div>
              <pre className="bg-secondary text-secondary-foreground flex-1 overflow-auto rounded-lg border p-4 text-xs">
                {JSON.stringify(container.children, null, 2)}
              </pre>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}
