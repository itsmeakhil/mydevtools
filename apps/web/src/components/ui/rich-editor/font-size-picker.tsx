"use client"

import React, { useEffect, useState } from "react"
import { Minus, Plus } from "lucide-react"

import { Button } from "../button"
import { Input } from "../input"

interface FontSizePickerProps {
  disabled?: boolean
  onFontSizeSelect: (fontSize: string) => void
  currentFontSize?: string
}

// Extract numeric value from inline style fontSize value
const extractFontSize = (fontSizeValue?: string): number => {
  if (!fontSizeValue) return 16 // default

  // Check if it's a pixel value
  if (fontSizeValue.includes("px")) {
    return parseInt(fontSizeValue.replace("px", "")) || 16
  }

  // If it's just a number
  const parsed = parseInt(fontSizeValue)
  if (!isNaN(parsed)) {
    return parsed
  }

  return 16
}

export function FontSizePicker({
  disabled = false,
  onFontSizeSelect,
  currentFontSize,
}: FontSizePickerProps) {
  const [fontSize, setFontSize] = useState<number>(
    extractFontSize(currentFontSize)
  )

  // Update fontSize when currentFontSize changes (selection changes)
  useEffect(() => {
    const extractedSize = extractFontSize(currentFontSize)
    setFontSize(extractedSize)
  }, [currentFontSize])

  const handleIncrement = () => {
    const newSize = Math.min(fontSize + 2, 128)
    setFontSize(newSize)
    onFontSizeSelect(`${newSize}px`)
  }

  const handleDecrement = () => {
    const newSize = Math.max(fontSize - 2, 8)
    setFontSize(newSize)
    onFontSizeSelect(`${newSize}px`)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 16
    const clampedValue = Math.max(8, Math.min(value, 128))
    setFontSize(clampedValue)
  }

  const handleInputBlur = () => {
    onFontSizeSelect(`${fontSize}px`)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      onFontSizeSelect(`${fontSize}px`)
      e.currentTarget.blur()
    }
  }

  return (
    <div className="bg-muted/50 flex items-center gap-0.5 rounded-md">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDecrement}
        disabled={disabled || fontSize <= 8}
        className="hover:bg-muted h-7 w-6 rounded-r-none md:h-8 md:w-7"
        title="Decrease font size"
      >
        <Minus className="size-3 md:size-3.5" />
      </Button>

      <Input
        type="number"
        value={fontSize}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        min={8}
        max={128}
        className="h-7 w-10 [appearance:textfield] rounded-none border-0 bg-transparent px-0.5 text-center text-xs focus-visible:ring-0 focus-visible:ring-offset-0 md:h-8 md:w-14 md:px-1 md:text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        title="Font size in pixels"
      />

      <Button
        variant="ghost"
        size="icon"
        onClick={handleIncrement}
        disabled={disabled || fontSize >= 128}
        className="hover:bg-muted h-7 w-6 rounded-l-none md:h-8 md:w-7"
        title="Increase font size"
      >
        <Plus className="size-3 md:size-3.5" />
      </Button>
    </div>
  )
}
