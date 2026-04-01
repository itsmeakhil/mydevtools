"use client"

import { useEffect, useRef, useState } from "react"
import { ImageIcon, MoveVertical, Trash2, Upload, X } from "lucide-react"

import { cn } from "@/lib/utils"

import { EditorActions } from "."
import { Button } from "../button"
import { useEditorDispatch, useEditorState } from "./store/editor-store"

interface CoverImageProps {
  onUploadImage?: (file: File) => Promise<string>
  readOnly?: boolean
}

export function CoverImage({
  onUploadImage,
  readOnly = false,
}: CoverImageProps) {
  const state = useEditorState()
  const dispatch = useEditorDispatch()
  const { coverImage } = state
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [dragPosition, setDragPosition] = useState(coverImage?.position ?? 50)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Update drag position when coverImage changes
  useEffect(() => {
    if (coverImage?.position !== undefined) {
      setDragPosition(coverImage.position)
    }
  }, [coverImage?.position])

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      console.warn("Selected file is not an image")
      return
    }

    setIsUploading(true)

    try {
      let url: string

      if (onUploadImage) {
        // Use custom upload handler
        url = await onUploadImage(file)
      } else {
        // Fallback to data URL
        url = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      }

      dispatch(
        EditorActions.setCoverImage({
          url,
          alt: file.name,
          position: 50,
        })
      )
    } catch (error) {
      console.error("Failed to upload cover image:", error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const file = e.dataTransfer.files?.[0]
    if (file) {
      await handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleRemove = () => {
    dispatch(EditorActions.removeCoverImage())
  }

  const handlePositionDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handlePositionDrag = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top
    const percentage = Math.max(0, Math.min(100, (y / rect.height) * 100))

    setDragPosition(percentage)
    // Update state immediately so position is always saved
    dispatch(EditorActions.updateCoverImagePosition(percentage))
  }

  const handlePositionDragEnd = () => {
    if (isDragging) {
      setIsDragging(false)
      // Position is already saved in state during drag
    }
  }

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handlePositionDrag)
      window.addEventListener("mouseup", handlePositionDragEnd)

      return () => {
        window.removeEventListener("mousemove", handlePositionDrag)
        window.removeEventListener("mouseup", handlePositionDragEnd)
      }
    }
  }, [isDragging, dragPosition])

  const handleChangeImage = () => {
    fileInputRef.current?.click()
  }

  // If no cover image, don't render anything
  if (!coverImage) {
    return null
  }

  // Show cover image with controls
  return (
    <div
      ref={containerRef}
      className="group absolute top-0 mb-8 h-[300px] w-full overflow-hidden rounded-lg lg:h-[420px]"
      onMouseEnter={() => !readOnly && setIsHovered(true)}
      onMouseLeave={() => !readOnly && setIsHovered(false)}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Cover Image */}
      <div className="absolute inset-0">
        <img
          src={coverImage.url}
          alt={coverImage.alt || "Cover image"}
          className="h-full w-full object-cover"
          style={{
            objectPosition: `center ${dragPosition}%`,
          }}
        />
      </div>

      {/* Overlay with controls */}
      {!readOnly && (
        <div
          className={cn(
            "absolute inset-0 flex items-end justify-end gap-2 bg-black/40 p-4 transition-opacity duration-200",
            isHovered || isDragging ? "opacity-100" : "opacity-0"
          )}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={handleChangeImage}
            className="bg-background/90 hover:bg-background gap-2"
          >
            <Upload className="h-4 w-4" />
            Change
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onMouseDown={handlePositionDragStart}
            className={cn(
              "bg-background/90 hover:bg-background cursor-move gap-2",
              isDragging && "bg-primary text-primary-foreground"
            )}
          >
            <MoveVertical className="h-4 w-4" />
            Reposition
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleRemove}
            className="bg-background/90 hover:bg-destructive hover:text-destructive-foreground gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
        </div>
      )}

      {/* Dragging indicator */}
      {isDragging && (
        <div
          className="bg-primary pointer-events-none absolute right-0 left-0 z-50 h-0.5"
          style={{ top: `${dragPosition}%` }}
        >
          <div className="bg-primary text-primary-foreground absolute -top-3 left-1/2 -translate-x-1/2 rounded px-2 py-1 text-xs">
            {Math.round(dragPosition)}%
          </div>
        </div>
      )}
    </div>
  )
}
