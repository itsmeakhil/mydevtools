"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"

import { useToast } from "@/hooks/use-toast"

import { Card, CardContent } from "../card"
import { AddBlockButton } from "./add-block-button"
import { Block } from "./block"
import { CoverImage } from "./CoverImage"
import { CustomClassPopover } from "./custom-class-popover"

import { ExportFloatingButton } from "./ExportFloatingButton"
import { FreeImageBlock } from "./FreeImageBlock"
import { GroupImagesButton } from "./group-images-button"
import {
  createHandleBlockDragStart,
  createHandleDragEnter,
  createHandleDragLeave,
  createHandleDragOver,
  createHandleDrop,
  createHandleImageDragStart,
} from "./handlers/drag-drop-handlers"
import {
  createHandleFileChange,
  createHandleFreeImageFileChange,
  createHandleFreeImageUploadClick,
  createHandleImageUploadClick,
  createHandleMultipleFilesChange,
  createHandleMultipleImagesUploadClick,
} from "./handlers/file-upload-handlers"
import {
  createHandleFlexContainerDragLeave,
  createHandleFlexContainerDragOver,
  createHandleFlexContainerDrop,
} from "./handlers/flex-container-handlers"
import {
  checkImagesInSameFlex,
  createHandleClearImageSelection,
  createHandleExtractFromFlex,
  createHandleGroupSelectedImages,
  createHandleReverseImagesInFlex,
  createHandleToggleImageSelection,
} from "./handlers/image-selection-handlers"
import {
  createHandleClickWithModifier,
  createHandleContentChange,
  createHandleKeyDown,
} from "./handlers/keyboard-handlers"
import {
  createHandleAddBlock,
  createHandleChangeBlockType,
  createHandleCopyHtml,
  createHandleCopyJson,
  createHandleCreateLink,
  createHandleCreateList,
  createHandleCreateListFromCommand,
  createHandleCreateNested,
  createHandleCreateTable,
  createHandleDeleteNode,
  createHandleInsertImageFromCommand,
  createHandleNodeClick,
} from "./handlers/node-operation-handlers"
// Import all handlers
import {
  createHandleApplyColor,
  createHandleApplyFontSize,
  createHandleFormat,
  createHandleSelectionChange,
  createHandleTypeChange,
} from "./handlers/selection-handlers"
import { InsertComponentsModal } from "./InsertComponentsModal"
import { EditorActions } from "./lib/reducer/actions"
import { QuickModeToggle } from "./QuickModeToggle"
import { SelectionToolbar } from "./SelectionToolbar"
import {
  useContainer,
  useEditorDispatch,
  useEditorStore,
  useSelection,
  useSelectionManager,
} from "./store/editor-store"
import { TableDialog } from "./table-dialog"
import { TemplateSwitcherButton } from "./TemplateSwitcherButton"
import { ContainerNode, isTextNode, type TextNode } from "./types"
import { useDragAutoScroll } from "./utils/drag-auto-scroll"
import { findNodeInTree } from "./utils/editor-helpers"
import { useTranslations } from "next-intl"

/**
 * Editor Component Props
 */
interface EditorProps {
  readOnly?: boolean // View-only mode - renders content without editing capabilities
  onUploadImage?: (file: File) => Promise<string> // Custom image upload handler - should return the uploaded image URL
  notionBased?: boolean // Enable Notion-style features (cover image, first header spacing) - default: true
  onNotionBasedChange?: (notionBased: boolean) => void // Callback when notion mode is toggled
  // enableVirtualization?: boolean; // Enable virtualization for better performance with many blocks - default: false
  // virtualizationThreshold?: number; // Number of blocks before virtualization kicks in - default: 50
}

export function Editor({
  readOnly: initialReadOnly = false,
  onUploadImage,
  notionBased = true,
  onNotionBasedChange,
}: // enableVirtualization = false,
  // virtualizationThreshold = 50,
  EditorProps = {}) {
  // ✅ OPTIMIZATION: Subscribe to specific state pieces instead of full state
  // This prevents Editor from re-rendering on every state change
  const activeNodeId = useEditorStore((state) => state.activeNodeId)
  const historyIndex = useEditorStore((state) => state.historyIndex)
  const historyLength = useEditorStore((state) => state.history.length)
  const coverImage = useEditorStore((state) => state.coverImage)
  const currentSelection = useEditorStore((state) => state.currentSelection)

  const dispatch = useEditorDispatch()
  const container = useContainer()
  const selectionManager = useSelectionManager()
  const { toast } = useToast()
  const tToasts = useTranslations("RichEditor.toasts")
  const lastEnterTime = useRef<number>(0)
  const nodeRefs = useRef<Map<string, HTMLElement>>(new Map())
  const contentUpdateTimers = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const multipleFileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const freeImageInputRef = useRef<HTMLInputElement>(null)
  const editorContentRef = useRef<HTMLDivElement>(null)
  const [readOnly, setReadOnly] = useState(initialReadOnly)

  // Enable auto-scroll when dragging near viewport edges
  useDragAutoScroll(editorContentRef, {
    scrollZone: 100,
    scrollSpeed: 15,
    enableVertical: true,
    enableHorizontal: false,
  })

  const [isUploading, setIsUploading] = useState(false)
  const [copiedHtml, setCopiedHtml] = useState(false)
  const [copiedJson, setCopiedJson] = useState(false)
  const [enhanceSpaces, setEnhanceSpaces] = useState(true)
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null)
  const [dropPosition, setDropPosition] = useState<
    "before" | "after" | "left" | "right" | null
  >(null)
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string>("")
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(
    new Set()
  )
  const [dragOverFlexId, setDragOverFlexId] = useState<string | null>(null)
  const [flexDropPosition, setFlexDropPosition] = useState<
    "left" | "right" | null
  >(null)
  const [tableDialogOpen, setTableDialogOpen] = useState(false)
  const [tableInsertionTargetId, setTableInsertionTargetId] = useState<
    string | undefined
  >(undefined)
  const [insertComponentModalOpen, setInsertComponentModalOpen] =
    useState(false)

  // Container is now obtained from useContainer hook above

  const currentNode = activeNodeId
    ? (container.children.find((n) => n.id === activeNodeId) as
      | TextNode
      | undefined)
    : (container.children[0] as TextNode | undefined)

  // Debounced dispatch for selection state updates
  const selectionDispatchTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Create handler parameters
  const selectionParams = {
    container,
    state: {
      activeNodeId,
      historyIndex,
      history: [container],
      currentSelection,
    } as any, // Minimal state object for handlers
    dispatch,
    selectionManager,
    nodeRefs,
  }

  // keyboardParams will be created dynamically with the handlers

  const nodeOperationParams = {
    container,
    dispatch,
    toast,
    nodeRefs,
    editorContentRef,
  }

  const dragDropParams = {
    container,
    dispatch,
    toast,
    draggingNodeId,
    setDraggingNodeId,
    setDragOverNodeId,
    setDropPosition,
    setIsUploading,
    onUploadImage,
  }

  const fileUploadParams = {
    container,
    dispatch,
    state: { activeNodeId, historyIndex, history: [container] } as any,
    toast,
    setIsUploading,
    fileInputRef,
    multipleFileInputRef,
    onUploadImage,
  }

  const videoUploadParams = {
    container,
    dispatch,
    state: { activeNodeId, historyIndex, history: [container] } as any,
    toast,
    setIsUploading,
    fileInputRef: videoInputRef,
    multipleFileInputRef: videoInputRef, // Reuse the same ref for consistency
    onUploadImage,
  }

  const freeImageUploadParams = {
    container,
    dispatch,
    state: { activeNodeId, historyIndex, history: [container] } as any,
    toast,
    setIsUploading,
    fileInputRef: freeImageInputRef,
    multipleFileInputRef: freeImageInputRef,
    onUploadImage,
  }

  // Create all handlers
  const handleSelectionChange = useCallback(
    createHandleSelectionChange(selectionParams, selectionDispatchTimerRef),
    [container, activeNodeId, selectionManager, dispatch]
  )

  const handleFormat = useCallback(createHandleFormat(selectionParams), [
    container,
    dispatch,
    selectionManager,
  ])

  const handleApplyColor = useCallback(
    createHandleApplyColor(selectionParams, toast, setSelectedColor),
    [dispatch, selectionManager, toast]
  )

  const handleApplyFontSize = useCallback(
    createHandleApplyFontSize(selectionParams, toast),
    [dispatch, selectionManager, toast]
  )

  const handleTypeChange = useCallback(
    createHandleTypeChange(selectionParams, handleSelectionChange),
    [dispatch, selectionManager, handleSelectionChange]
  )

  const handleToggleImageSelection = useCallback(
    createHandleToggleImageSelection(selectedImageIds, setSelectedImageIds),
    [selectedImageIds]
  )

  const handleContentChange = useCallback(
    createHandleContentChange(
      {
        container,
        dispatch,
        nodeRefs,
        lastEnterTime,
        onToggleImageSelection: handleToggleImageSelection,
      },
      contentUpdateTimers
    ),
    [container, dispatch, handleToggleImageSelection]
  )

  const handleKeyDown = useCallback(
    createHandleKeyDown({
      container,
      dispatch,
      nodeRefs,
      lastEnterTime,
      onToggleImageSelection: handleToggleImageSelection,
    }),
    [container, dispatch, nodeRefs, lastEnterTime, handleToggleImageSelection]
  )

  const handleClickWithModifier = useCallback(
    createHandleClickWithModifier({
      container,
      dispatch,
      nodeRefs,
      lastEnterTime,
      onToggleImageSelection: handleToggleImageSelection,
    }),
    [container, handleToggleImageSelection]
  )

  const handleNodeClick = useCallback(
    createHandleNodeClick({ container, dispatch }),
    [container, dispatch]
  )

  const handleDeleteNode = useCallback(
    createHandleDeleteNode({ container, dispatch, toast }),
    [container, dispatch, toast]
  )

  const handleAddBlock = useCallback(
    createHandleAddBlock({ dispatch, nodeRefs }),
    [dispatch, nodeRefs]
  )

  const handleCreateNested = useCallback(
    createHandleCreateNested({ container, dispatch, toast }),
    [container, dispatch, toast]
  )

  const handleChangeBlockType = useCallback(
    createHandleChangeBlockType({ dispatch, nodeRefs }),
    [dispatch, nodeRefs]
  )

  const handleInsertImageFromCommand = useCallback(
    createHandleInsertImageFromCommand({ dispatch, nodeRefs }, fileInputRef),
    [dispatch, fileInputRef]
  )

  const handleCreateList = useCallback(
    createHandleCreateList(nodeOperationParams),
    [container, dispatch, toast, editorContentRef]
  )

  const handleCreateListFromCommand = useCallback(
    createHandleCreateListFromCommand({ dispatch, toast, nodeRefs }),
    [dispatch, toast, nodeRefs]
  )

  const handleCreateLink = useCallback(
    createHandleCreateLink(nodeOperationParams),
    [container, dispatch, toast, editorContentRef]
  )

  const handleCreateTable = useCallback(
    createHandleCreateTable(nodeOperationParams, tableInsertionTargetId),
    [container, dispatch, toast, editorContentRef, tableInsertionTargetId]
  )

  const handleCreateTableFromCommand = useCallback(
    (nodeId: string) => {
      // Store the node ID for later use when table is created
      setTableInsertionTargetId(nodeId)
      dispatch(EditorActions.setActiveNode(nodeId))
      // Open the table dialog
      setTableDialogOpen(true)
    },
    [dispatch]
  )

  const handleImportMarkdownTable = useCallback(
    (table: any) => {
      const timestamp = Date.now()

      // Wrap table in a container for consistent handling
      const tableWrapper: ContainerNode = {
        id: `table-wrapper-${timestamp}`,
        type: "container",
        children: [table],
        attributes: {},
      }

      // Determine where to insert the table
      let targetNode = null
      let targetPosition: "after" | "before" = "after"

      if (tableInsertionTargetId) {
        // If we have a target node (from command menu), insert after it
        targetNode = container.children.find(
          (n) => n.id === tableInsertionTargetId
        )
        targetPosition = "after"
      }

      if (!targetNode) {
        // Fallback: insert at the end
        targetNode = container.children[container.children.length - 1]
        targetPosition = "after"
      }

      if (targetNode) {
        dispatch(
          EditorActions.insertNode(tableWrapper, targetNode.id, targetPosition)
        )
      } else {
        // If no nodes exist, replace the container
        dispatch(
          EditorActions.replaceContainer({
            ...container,
            children: [tableWrapper],
          })
        )
      }

      toast({
        title: tToasts("tableImported"),
        description: tToasts("tableImportedDesc"),
      })

      // Smooth scroll to the newly created table
      setTimeout(() => {
        const editorContent = editorContentRef.current
        if (editorContent) {
          const tableElement = editorContent.querySelector(
            `[data-node-id="${tableWrapper.id}"]`
          )
          if (tableElement) {
            tableElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
              inline: "nearest",
            })
          }
        }
      }, 150)
    },
    [container, dispatch, toast, editorContentRef, tableInsertionTargetId, tToasts]
  )

  const handleCopyHtml = useCallback(
    () =>
      createHandleCopyHtml({ toast }, enhanceSpaces, setCopiedHtml)(container),
    [container, enhanceSpaces, toast]
  )

  const handleCopyJson = useCallback(
    () => createHandleCopyJson({ toast }, setCopiedJson)(container),
    [container, toast]
  )

  const handleImageDragStart = useCallback(
    createHandleImageDragStart(setDraggingNodeId),
    []
  )

  const handleBlockDragStart = useCallback(
    createHandleBlockDragStart(setDraggingNodeId),
    []
  )

  const handleDragEnter = useCallback(createHandleDragEnter(), [])

  const handleDragOver = useCallback(
    createHandleDragOver({
      container,
      dispatch,
      draggingNodeId,
      setDraggingNodeId,
      setDragOverNodeId,
      setDropPosition,
    }),
    [container, draggingNodeId]
  )

  const handleDragLeave = useCallback(
    createHandleDragLeave(setDragOverNodeId, setDropPosition),
    []
  )

  const handleDrop = useCallback(
    createHandleDrop(dragDropParams, dropPosition),
    [container, dispatch, toast, draggingNodeId, dropPosition, onUploadImage]
  )

  const handleFileChange = useCallback(
    createHandleFileChange(fileUploadParams),
    [container, dispatch, activeNodeId, toast, onUploadImage]
  )

  const handleMultipleFilesChange = useCallback(
    createHandleMultipleFilesChange(fileUploadParams),
    [container, dispatch, activeNodeId, toast, onUploadImage]
  )

  const handleImageUploadClick = useCallback(
    createHandleImageUploadClick(fileInputRef),
    []
  )

  const handleMultipleImagesUploadClick = useCallback(
    createHandleMultipleImagesUploadClick(multipleFileInputRef),
    []
  )

  const handleVideoUploadClick = useCallback(
    createHandleImageUploadClick(videoInputRef),
    []
  )

  const handleVideoFileChange = useCallback(
    createHandleFileChange(videoUploadParams),
    [container, dispatch, activeNodeId, toast, onUploadImage]
  )

  const handleFreeImageFileChange = useCallback(
    createHandleFreeImageFileChange(freeImageUploadParams),
    [container, dispatch, activeNodeId, toast, onUploadImage]
  )

  const handleFreeImageUploadClick = useCallback(
    createHandleFreeImageUploadClick(freeImageInputRef),
    []
  )

  const handleInsertComponentClick = useCallback(() => {
    setInsertComponentModalOpen(true)
  }, [])

  const handleInsertComponentSelect = useCallback(
    (componentId: string) => {
      if (componentId === "free-image") {
        handleFreeImageUploadClick()
      }
      // Future: handle other component types here
    },
    [handleFreeImageUploadClick]
  )

  const handleClearImageSelection = useCallback(
    createHandleClearImageSelection(setSelectedImageIds),
    []
  )

  const handleGroupSelectedImages = useCallback(
    createHandleGroupSelectedImages(
      { container, dispatch, toast },
      selectedImageIds,
      handleClearImageSelection
    ),
    [container, dispatch, toast, selectedImageIds, handleClearImageSelection]
  )

  // Check if selected images are in same flex container
  const flexInfo = React.useMemo(() => {
    if (selectedImageIds.size < 2) {
      return { inSameFlex: false, flexParentId: null }
    }
    return checkImagesInSameFlex(
      { container, dispatch, toast },
      selectedImageIds
    )
  }, [container, selectedImageIds, dispatch, toast])

  const handleReverseImagesInFlex = useCallback(
    createHandleReverseImagesInFlex(
      { container, dispatch, toast },
      selectedImageIds,
      flexInfo.flexParentId || ""
    ),
    [container, dispatch, toast, selectedImageIds, flexInfo.flexParentId]
  )

  const handleExtractFromFlex = useCallback(
    createHandleExtractFromFlex(
      { container, dispatch, toast },
      selectedImageIds,
      flexInfo.flexParentId || "",
      handleClearImageSelection
    ),
    [
      container,
      dispatch,
      toast,
      selectedImageIds,
      flexInfo.flexParentId,
      handleClearImageSelection,
    ]
  )

  const handleFlexContainerDragOver = useCallback(
    createHandleFlexContainerDragOver({
      container,
      dispatch,
      toast,
      draggingNodeId,
      setDragOverFlexId,
      setFlexDropPosition,
    }),
    [container, dispatch, toast, draggingNodeId]
  )

  const handleFlexContainerDragLeave = useCallback(
    createHandleFlexContainerDragLeave(setDragOverFlexId, setFlexDropPosition),
    []
  )

  const handleFlexContainerDrop = useCallback(
    createHandleFlexContainerDrop({
      container,
      dispatch,
      toast,
      draggingNodeId,
      setDragOverFlexId,
      setFlexDropPosition,
    }),
    [container, dispatch, toast, draggingNodeId]
  )

  // Selection change listener
  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange)
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange)
    }
  }, [handleSelectionChange])

  // Focus on current node when it changes
  useEffect(() => {
    if (!activeNodeId) return

    const activeId = activeNodeId
    let focusTimer: NodeJS.Timeout

    const attemptFocus = (retries = 0) => {
      const element = nodeRefs.current.get(activeId)

      if (element && document.activeElement !== element) {
        element.focus()
      } else if (!element && retries < 20) { // Increased retries
        focusTimer = setTimeout(() => attemptFocus(retries + 1), 50)
      } else if (!element) {
        // Only warn if we really expected it to be there
        console.warn(
          "⚠️ [Focus Failed] Element not found:",
          activeId
        )
      }
    }

    attemptFocus()

    return () => {
      clearTimeout(focusTimer)
    }
  }, [activeNodeId])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      contentUpdateTimers.current.forEach((timer) => clearTimeout(timer))
      contentUpdateTimers.current.clear()
    }
  }, [])

  // Handle paste events for images/videos
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const activeElement = document.activeElement
      const isInEditor = Array.from(nodeRefs.current.values()).some(
        (el) => el === activeElement || el.contains(activeElement)
      )

      if (!isInEditor || readOnly) return

      const items = e.clipboardData?.items
      if (!items) return

      // Check if any item is an image or video file
      const mediaFiles: File[] = []
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (
          item.kind === "file" &&
          (item.type.startsWith("image/") || item.type.startsWith("video/"))
        ) {
          const file = item.getAsFile()
          if (file) {
            mediaFiles.push(file)
          }
        }
      }

      if (mediaFiles.length === 0) return

      // Prevent default paste behavior
      e.preventDefault()

      // Upload the files
      setIsUploading(true)

      try {
        const uploadPromises = mediaFiles.map(async (file) => {
          if (onUploadImage) {
            return await onUploadImage(file)
          } else {
            const { uploadImage } = await import("./utils/image-upload")
            const result = await uploadImage(file)
            if (!result.success || !result.url) {
              throw new Error(result.error || "Upload failed")
            }
            return result.url
          }
        })

        const mediaUrls = await Promise.all(uploadPromises)

        // Create media nodes
        const timestamp = Date.now()
        const mediaNodes: TextNode[] = mediaUrls.map((url, index) => {
          const file = mediaFiles[index]
          const isVideo = file.type.startsWith("video/")

          return {
            id: `${isVideo ? "video" : "img"}-${timestamp}-${index}`,
            type: isVideo ? "video" : "img",
            content: "",
            attributes: {
              src: url,
              alt: file.name,
            },
          }
        })

        // Insert media nodes after current active node
        const targetId =
          activeNodeId || container.children[container.children.length - 1]?.id

        if (mediaFiles.length === 1) {
          // Single media file - insert directly
          if (targetId) {
            dispatch(EditorActions.insertNode(mediaNodes[0], targetId, "after"))
          }
        } else {
          // Multiple media files - create flex container
          const flexContainer: ContainerNode = {
            id: `flex-container-${timestamp}`,
            type: "container",
            children: mediaNodes,
            attributes: {
              layoutType: "flex",
              gap: "4",
              flexWrap: "wrap",
            },
          }

          if (targetId) {
            dispatch(EditorActions.insertNode(flexContainer, targetId, "after"))
          }
        }

        const videoCount = mediaFiles.filter((f) =>
          f.type.startsWith("video/")
        ).length
        const imageCount = mediaFiles.filter((f) =>
          f.type.startsWith("image/")
        ).length
        let description = ""
        if (videoCount > 0 && imageCount > 0) {
          description = tToasts("pasteMixed", {
            imageCount,
            videoCount,
          })
        } else if (videoCount > 0) {
          description = tToasts("pasteVideos", { count: videoCount })
        } else {
          description = tToasts("pasteImages", { count: imageCount })
        }

        toast({
          title: tToasts("mediaPasted"),
          description,
        })
      } catch (error) {
        toast({
          variant: "destructive",
          title: tToasts("pasteFailed"),
          description:
            error instanceof Error
              ? error.message
              : tToasts("unexpectedError"),
        })
      } finally {
        setIsUploading(false)
      }
    }

    document.addEventListener("paste", handlePaste)
    return () => {
      document.removeEventListener("paste", handlePaste)
    }
  }, [
    readOnly,
    activeNodeId,
    container,
    dispatch,
    toast,
    onUploadImage,
    setIsUploading,
    tToasts,
  ])

  // Handle global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey

      const activeElement = document.activeElement
      const isInEditor = Array.from(nodeRefs.current.values()).some(
        (el) => el === activeElement || el.contains(activeElement)
      )

      // Ctrl+A / Cmd+A - Select all content in current block only
      if (isCtrlOrCmd && e.key === "a" && isInEditor) {
        e.preventDefault()

        const selection = window.getSelection()
        if (!selection) return

        const currentBlock = activeElement as HTMLElement
        if (currentBlock && currentBlock.isContentEditable) {
          const range = document.createRange()
          range.selectNodeContents(currentBlock)
          selection.removeAllRanges()
          selection.addRange(range)
        }
      }

      // Ctrl+B / Cmd+B - Toggle Bold
      if (isCtrlOrCmd && e.key === "b" && isInEditor) {
        e.preventDefault()
        const selection = window.getSelection()
        if (selection && !selection.isCollapsed) {
          handleFormat("bold")
        }
      }

      // Ctrl+I / Cmd+I - Toggle Italic
      if (isCtrlOrCmd && e.key === "i" && isInEditor) {
        e.preventDefault()
        const selection = window.getSelection()
        if (selection && !selection.isCollapsed) {
          handleFormat("italic")
        }
      }

      // Ctrl+U / Cmd+U - Toggle Underline
      if (isCtrlOrCmd && e.key === "u" && isInEditor) {
        e.preventDefault()
        const selection = window.getSelection()
        if (selection && !selection.isCollapsed) {
          handleFormat("underline")
        }
      }

      // Ctrl+Shift+S / Cmd+Shift+S - Toggle Strikethrough
      if (isCtrlOrCmd && e.shiftKey && e.key === "S" && isInEditor) {
        e.preventDefault()
        const selection = window.getSelection()
        if (selection && !selection.isCollapsed) {
          handleFormat("strikethrough")
        }
      }

      // Ctrl+E / Cmd+E - Toggle Code
      if (isCtrlOrCmd && e.key === "e" && isInEditor) {
        e.preventDefault()
        const selection = window.getSelection()
        if (selection && !selection.isCollapsed) {
          handleFormat("code")
        }
      }

      // Ctrl+Z / Cmd+Z - Undo
      if (isCtrlOrCmd && e.key === "z" && !e.shiftKey) {
        if (
          !isInEditor &&
          (activeElement?.tagName === "INPUT" ||
            activeElement?.tagName === "TEXTAREA")
        ) {
          return
        }
        e.preventDefault()
        if (historyIndex > 0) {
          dispatch(EditorActions.undo())
        }
      }

      // Ctrl+Y / Cmd+Y or Ctrl+Shift+Z - Redo
      if (
        (isCtrlOrCmd && e.key === "y") ||
        (isCtrlOrCmd && e.shiftKey && e.key === "z")
      ) {
        if (
          !isInEditor &&
          (activeElement?.tagName === "INPUT" ||
            activeElement?.tagName === "TEXTAREA")
        ) {
          return
        }
        e.preventDefault()
        if (historyIndex < historyLength - 1) {
          dispatch(EditorActions.redo())
        }
      }

      // Arrow Up/Down - Navigate between blocks
      if (
        (e.key === "ArrowUp" || e.key === "ArrowDown") &&
        isInEditor &&
        activeNodeId
      ) {
        const currentElement = activeElement as HTMLElement
        const currentNodeId =
          currentElement?.getAttribute("data-node-id") || activeNodeId

        // Find the current node and its siblings
        const result = findNodeInTree(currentNodeId, container)
        if (!result) return

        const { siblings } = result
        const currentIndex = siblings.findIndex((n) => n.id === currentNodeId)
        if (currentIndex === -1) return

        // ArrowUp: Navigate to previous block
        if (e.key === "ArrowUp" && currentIndex > 0) {
          e.preventDefault()
          const prevNode = siblings[currentIndex - 1]
          dispatch(EditorActions.setActiveNode(prevNode.id))

          // Focus and place cursor at the end of the previous node
          setTimeout(() => {
            const prevElement = nodeRefs.current.get(prevNode.id)
            if (prevElement) {
              prevElement.focus()
              const range = document.createRange()
              const sel = window.getSelection()

              // Place cursor at the end
              const lastChild =
                prevElement.childNodes[prevElement.childNodes.length - 1]
              if (lastChild?.nodeType === Node.TEXT_NODE) {
                range.setStart(lastChild, lastChild.textContent?.length || 0)
              } else if (lastChild) {
                range.setStartAfter(lastChild)
              } else {
                range.selectNodeContents(prevElement)
              }
              range.collapse(true)
              sel?.removeAllRanges()
              sel?.addRange(range)
            }
          }, 10)
        }

        // ArrowDown: Navigate to next block
        if (e.key === "ArrowDown" && currentIndex < siblings.length - 1) {
          e.preventDefault()
          const nextNode = siblings[currentIndex + 1]
          dispatch(EditorActions.setActiveNode(nextNode.id))

          // Focus and place cursor at the end of the next node
          setTimeout(() => {
            const nextElement = nodeRefs.current.get(nextNode.id)
            if (nextElement) {
              nextElement.focus()
              const range = document.createRange()
              const sel = window.getSelection()

              // Place cursor at the end
              const lastChild =
                nextElement.childNodes[nextElement.childNodes.length - 1]
              if (lastChild?.nodeType === Node.TEXT_NODE) {
                range.setStart(lastChild, lastChild.textContent?.length || 0)
              } else if (lastChild) {
                range.setStartAfter(lastChild)
              } else {
                range.selectNodeContents(nextElement)
              }
              range.collapse(true)
              sel?.removeAllRanges()
              sel?.addRange(range)
            }
          }, 10)
        }
      }
    }

    document.addEventListener("keydown", handleGlobalKeyDown)
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown)
    }
  }, [
    historyIndex,
    historyLength,
    activeNodeId,
    dispatch,
    toast,
    handleFormat,
    container,
  ])

  console.log("Editor re-rendered")
  return (
    <div className="bg-background flex flex-1 flex-col transition-colors duration-300">
      {/* Editor with integrated toolbar */}
      <div className="mx-auto flex w-full flex-1 flex-col">
        <QuickModeToggle
          readOnly={readOnly}
          onReadOnlyChange={setReadOnly}
          notionBased={notionBased}
          onNotionBasedChange={onNotionBasedChange}
        />
        {/* Toolbar - always shown now with read-only toggle */}
        {/* Toolbar removed as per user request */}
        <div className="relative flex flex-1 flex-col gap-3 rounded-none transition-all duration-300">
          {/* Table Dialog */}
          <TableDialog
            open={tableDialogOpen}
            onOpenChange={(open) => {
              setTableDialogOpen(open)
              // Clear the target ID when dialog closes
              if (!open) {
                setTableInsertionTargetId(undefined)
              }
            }}
            onCreateTable={handleCreateTable}
            onImportMarkdown={handleImportMarkdownTable}
          />

          {/* Insert Components Modal */}
          <InsertComponentsModal
            open={insertComponentModalOpen}
            onOpenChange={setInsertComponentModalOpen}
            onSelect={handleInsertComponentSelect}
          />

          {/* Hidden file inputs for image and video uploads */}
          {!readOnly && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                ref={multipleFileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleMultipleFilesChange}
                className="hidden"
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoFileChange}
                className="hidden"
              />
              <input
                ref={freeImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleFreeImageFileChange}
                className="hidden"
              />
            </>
          )}

          {/* Editor Content */}
          <CardContent
            className={`mx-auto flex w-full flex-1 flex-col px-0 transition-all duration-300`}
          >
            <div ref={editorContentRef} className="h-full">
              <>
                {/* Cover Image - Only in Notion mode for non-virtualized */}
                {notionBased && (
                  <CoverImage
                    onUploadImage={onUploadImage}
                    readOnly={readOnly}
                  />
                )}

                <div
                  data-editor-content
                  className={`${notionBased && coverImage
                    ? "pt-[280px] lg:pt-[420px]"
                    : notionBased
                      ? "pt-[30px]"
                      : "pt-4"
                    } relative px-10 transition-all duration-300`}
                >
                  {container.children.map((node, index) => {
                    const isText = isTextNode(node)
                    const textNode = isText ? (node as TextNode) : null

                    // Skip free-positioned images - they'll be rendered separately
                    if (
                      textNode &&
                      textNode.type === "img" &&
                      textNode.attributes?.isFreePositioned
                    ) {
                      return null
                    }

                    // Use stable key based only on node.id to prevent unnecessary remounts
                    // Previously included children.length which caused remounts on every edit
                    const nodeKey = node.id

                    const isFirstBlock = index === 0
                    const isSecondBlock = index === 1

                    return (
                      <div className="mx-auto w-full max-w-6xl" key={nodeKey}>
                        {/* Add block button before first block */}
                        {!readOnly && isFirstBlock && (
                          <AddBlockButton
                            onAdd={() => handleAddBlock(node.id, "before")}
                            position="before"
                          />
                        )}

                        <div
                          onDragEnter={(e) => handleDragEnter(e, node.id)}
                          onDragOver={(e) => handleDragOver(e, node.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, node.id)}
                          className={`relative transition-all ${dragOverNodeId === node.id &&
                            dropPosition === "before" &&
                            draggingNodeId !== node.id
                            ? "before:bg-primary/30 before:absolute before:inset-x-0 before:-top-1 before:z-10 before:h-1 before:rounded-full"
                            : ""
                            } ${dragOverNodeId === node.id &&
                              dropPosition === "after" &&
                              draggingNodeId !== node.id
                              ? "after:bg-primary/30 after:absolute after:inset-x-0 after:-bottom-1 after:z-10 after:h-1 after:rounded-full"
                              : ""
                            } ${dragOverNodeId === node.id &&
                              dropPosition === "left" &&
                              draggingNodeId !== node.id
                              ? "before:absolute before:inset-y-0 before:-left-1 before:z-10 before:w-1 before:rounded-full before:bg-blue-500/50"
                              : ""
                            } ${dragOverNodeId === node.id &&
                              dropPosition === "right" &&
                              draggingNodeId !== node.id
                              ? "after:absolute after:inset-y-0 after:-right-1 after:z-10 after:w-1 after:rounded-full after:bg-blue-500/50"
                              : ""
                            } `}
                        >
                          <Block
                            nodeId={node.id}
                            isActive={activeNodeId === node.id}
                            isFirstBlock={isFirstBlock}
                            notionBased={notionBased}
                            hasCoverImage={!!coverImage}
                            onUploadCoverImage={onUploadImage}
                            nodeRef={(el) => {
                              if (el) {
                                const elementNodeId =
                                  el.getAttribute("data-node-id")
                                if (elementNodeId) {
                                  nodeRefs.current.set(elementNodeId, el)
                                }

                                if (textNode && elementNodeId === node.id) {
                                  const isCurrentlyFocused =
                                    document.activeElement === el
                                  const selection = window.getSelection()

                                  const hasActiveSelection =
                                    selection &&
                                    selection.rangeCount > 0 &&
                                    !selection.isCollapsed

                                  let selectionInThisElement = false
                                  if (
                                    hasActiveSelection &&
                                    selection.rangeCount > 0
                                  ) {
                                    const range = selection.getRangeAt(0)
                                    selectionInThisElement = el.contains(
                                      range.commonAncestorContainer
                                    )
                                  }

                                  // Check if node has inline children
                                  const nodeHasChildren =
                                    textNode &&
                                    Array.isArray(textNode.children) &&
                                    textNode.children.length > 0

                                  if (
                                    !isCurrentlyFocused &&
                                    !nodeHasChildren &&
                                    !hasActiveSelection &&
                                    !selectionInThisElement
                                  ) {
                                    const displayContent =
                                      textNode.content || ""
                                    const currentContent = el.textContent || ""

                                    if (currentContent !== displayContent) {
                                      el.textContent = displayContent
                                    }
                                  }
                                }
                              } else {
                                nodeRefs.current.delete(node.id)
                              }
                            }}
                            onInput={(element) =>
                              handleContentChange(node.id, element)
                            }
                            onKeyDown={(e) => handleKeyDown(e, node.id)}
                            onClick={() => handleNodeClick(node.id)}
                            onDelete={(nodeId?: string) =>
                              handleDeleteNode(nodeId || node.id)
                            }
                            onCreateNested={handleCreateNested}
                            readOnly={readOnly}
                            onImageDragStart={handleImageDragStart}
                            onBlockDragStart={handleBlockDragStart}
                            onChangeBlockType={handleChangeBlockType}
                            onInsertImage={handleInsertImageFromCommand}
                            onCreateList={handleCreateListFromCommand}
                            onCreateTable={handleCreateTableFromCommand}
                            onUploadImage={onUploadImage}
                            selectedImageIds={selectedImageIds}
                            onToggleImageSelection={handleToggleImageSelection}
                            onClickWithModifier={handleClickWithModifier}
                            onFlexContainerDragOver={
                              handleFlexContainerDragOver
                            }
                            onFlexContainerDragLeave={
                              handleFlexContainerDragLeave
                            }
                            onFlexContainerDrop={handleFlexContainerDrop}
                            dragOverFlexId={dragOverFlexId}
                            flexDropPosition={flexDropPosition}
                            onSetDragOverNodeId={setDragOverNodeId}
                            onSetDropPosition={setDropPosition}
                            draggingNodeId={draggingNodeId}
                            onSetDraggingNodeId={setDraggingNodeId}
                          />
                        </div>

                        {/* Add block button after each block */}
                        {!readOnly && (
                          <AddBlockButton
                            onAdd={() => handleAddBlock(node.id, "after")}
                            position="after"
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            </div>
          </CardContent>

          {/* Free-positioned images - rendered absolutely */}
          {container.children
            .filter((node) => {
              const textNode = isTextNode(node) ? (node as TextNode) : null
              return (
                textNode &&
                textNode.type === "img" &&
                textNode.attributes?.isFreePositioned
              )
            })
            .map((node) => (
              <FreeImageBlock
                key={node.id}
                node={node as TextNode}
                isActive={activeNodeId === node.id}
                onClick={() => handleNodeClick(node.id)}
                onDelete={
                  readOnly ? undefined : () => handleDeleteNode(node.id)
                }
                readOnly={readOnly}
              />
            ))}
        </div>
      </div>

      {/* Selection Toolbar - Floats above selected text (Notion-style) */}
      {/* LinkPopover and CustomClassPopover are now integrated directly into SelectionToolbar */}
      {!readOnly && (
        <SelectionToolbar
          selection={currentSelection}
          selectedColor={selectedColor}
          editorRef={editorContentRef}
          onFormat={handleFormat}
          onTypeChange={(type) => handleTypeChange(type as TextNode["type"])}
          onColorSelect={handleApplyColor}
          onFontSizeSelect={handleApplyFontSize}
        />
      )}

      {/* Group Images Button - Floats when multiple images selected */}
      {!readOnly && (
        <GroupImagesButton
          selectedCount={selectedImageIds.size}
          inSameFlex={flexInfo.inSameFlex}
          onGroup={handleGroupSelectedImages}
          onReverse={
            flexInfo.inSameFlex ? handleReverseImagesInFlex : undefined
          }
          onExtract={flexInfo.inSameFlex ? handleExtractFromFlex : undefined}
          onClear={handleClearImageSelection}
        />
      )}

      {/* Floating Export Button */}
      {!readOnly && (
        <ExportFloatingButton
          container={container}
          onCopyHtml={handleCopyHtml}
          onCopyJson={handleCopyJson}
          copiedHtml={copiedHtml}
          copiedJson={copiedJson}
          enhanceSpaces={enhanceSpaces}
          onEnhanceSpacesChange={setEnhanceSpaces}
        />
      )}

      {/* Template Switcher Button - Bottom Left */}
      {!readOnly && (
        <TemplateSwitcherButton
          currentState={
            {
              activeNodeId,
              historyIndex,
              history: [container],
              currentSelection,
              coverImage,
            } as any
          }
          onTemplateChange={(newState) => {
            dispatch({ type: "SET_STATE", payload: { state: newState } })
          }}
        />
      )}
    </div>
  )
}
