export type {
  NodeType,
  NodeAttributes,
  BaseNode,
  TextNode,
  ContainerNode,
  StructuralNode,
  EditorNode,
  EditorState,
  SelectionInfo,
  InlineText,
  BlockLine,
  CoverImage,
} from "./types"

export {
  isContainerNode,
  isStructuralNode,
  isTextNode,
  hasInlineChildren,
  getNodeTextContent,
} from "./types"

// ============================================================================
// Actions
// ============================================================================
export type {
  UpdateNodeAction,
  UpdateAttributesAction,
  UpdateContentAction,
  DeleteNodeAction,
  InsertNodeAction,
  MoveNodeAction,
  DuplicateNodeAction,
  ReplaceContainerAction,
  ResetAction,
  BatchAction,
  EditorAction,
} from "./lib/reducer/actions"

export { EditorActions } from "./lib/reducer/actions"

// ============================================================================
// Reducer
// ============================================================================
export { editorReducer, createInitialState } from "./lib/reducer/editor-reducer"

// ============================================================================
// Zustand Store and Hooks
// ============================================================================
export {
  EditorProvider,
  useEditorState,
  useEditorDispatch,
  useBlockNode,
  useIsNodeActive,
  useActiveNodeId,
  useContainerChildrenIds,
  useContainer,
  useSelectionManager,
  useSelection,
} from "./store/editor-store"

export type { EditorProviderProps } from "./store/editor-store"

// ============================================================================
// Utilities
// ============================================================================
export {
  findNodeById,
  findParentById,
  updateNodeById,
  deleteNodeById,
  insertNode,
  moveNode,
  cloneNode,
  traverseTree,
  validateTree,
} from "./utils/tree-operations"

export type { InsertPosition } from "./utils/tree-operations"

export {
  splitTextAtSelection,
  convertToInlineFormat,
  applyFormatting,
  removeFormatting,
  mergeAdjacentTextNodes,
  getFormattingAtPosition,
} from "./utils/inline-formatting"

export {
  serializeToHtml,
  serializeToHtmlFragment,
  serializeToHtmlWithClass,
} from "./utils/serialize-to-html"

export {
  parseMarkdownTable,
  isMarkdownTable,
} from "./utils/markdown-table-parser"

export {
  setupDragAutoScroll,
  useDragAutoScroll,
} from "./utils/drag-auto-scroll"

export type { AutoScrollConfig } from "./utils/drag-auto-scroll"

// ============================================================================
// Tailwind Classes Utilities
// ============================================================================
export {
  tailwindClasses,
  popularClasses,
  searchTailwindClasses,
  getAllClasses,
} from "./tailwind-classes"

export type { TailwindClassGroup } from "./tailwind-classes"

// ============================================================================
// Demo Content
// ============================================================================
export { createDemoContent } from "./demo-content"
export { createEmptyContent } from "./empty-content"

export { Editor } from "./editor"
