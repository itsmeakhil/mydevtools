"use client"

import React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeftRight, Images, Package, X } from "lucide-react"

import { Button } from "../button"

interface GroupImagesButtonProps {
  selectedCount: number
  inSameFlex: boolean
  onGroup: () => void
  onReverse?: () => void
  onExtract?: () => void
  onClear: () => void
}

export function GroupImagesButton({
  selectedCount,
  inSameFlex,
  onGroup,
  onReverse,
  onExtract,
  onClear,
}: GroupImagesButtonProps) {
  if (selectedCount < 2) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2"
      >
        <div className="bg-background border-border flex items-center gap-2 rounded-lg border p-2 shadow-2xl">
          {/* Selection count */}
          <div className="text-muted-foreground px-3 py-2 text-sm font-medium">
            {selectedCount} {selectedCount === 1 ? "image" : "images"} selected
          </div>

          {/* Show different actions based on whether in flex */}
          {inSameFlex ? (
            <>
              {/* Reverse button */}
              {onReverse && (
                <Button
                  onClick={onReverse}
                  size="sm"
                  variant="secondary"
                  className="gap-2"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  Reverse Order
                </Button>
              )}

              {/* Extract button */}
              {onExtract && (
                <Button
                  onClick={onExtract}
                  size="sm"
                  variant="secondary"
                  className="gap-2"
                >
                  <Package className="h-4 w-4" />
                  Extract from Flex
                </Button>
              )}
            </>
          ) : (
            /* Group button */
            <Button onClick={onGroup} size="sm" className="gap-2">
              <Images className="h-4 w-4" />
              Group into Flex
            </Button>
          )}

          {/* Clear button */}
          <Button
            onClick={onClear}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
