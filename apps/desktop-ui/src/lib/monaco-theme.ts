/**
 * Shared Monaco themes for every editor tool (JSON, SQL, YAML, GraphQL, snippets…).
 *
 * Stock `vs-dark` paints a flat `#1e1e1e` neutral-grey canvas that clashes with
 * the app's graphite blue-black surfaces. These themes inherit vs-dark/vs for
 * syntax colours but make the editor chrome (background, gutter, minimap)
 * transparent, so the surrounding panel's own surface shows through and the
 * editor reads as part of the app rather than a bolted-on grey box.
 */
import type { Monaco } from '@monaco-editor/react'

export const MDT_DARK = 'mdt-dark'
export const MDT_LIGHT = 'mdt-light'

const TRANSPARENT = '#00000000'

// Defined once per Monaco instance; defineTheme is global, re-running is wasteful.
let defined = false

export function defineMdtThemes(monaco: Monaco): void {
  if (defined) return
  defined = true

  monaco.editor.defineTheme(MDT_DARK, {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': TRANSPARENT,
      'editorGutter.background': TRANSPARENT,
      'minimap.background': TRANSPARENT,
      'editorLineNumber.foreground': '#5b6172',
      'editorLineNumber.activeForeground': '#aab0c0',
      'editor.lineHighlightBackground': '#ffffff0a',
      'editor.lineHighlightBorder': TRANSPARENT,
      'editor.selectionBackground': '#6d7cf53d',
      'editor.inactiveSelectionBackground': '#6d7cf522',
      'editorIndentGuide.background1': '#ffffff12',
      'editorIndentGuide.activeBackground1': '#ffffff2a',
      'editorBracketMatch.background': '#6d7cf526',
      'editorBracketMatch.border': '#6d7cf580',
      'scrollbarSlider.background': '#ffffff14',
      'scrollbarSlider.hoverBackground': '#ffffff26',
      'scrollbarSlider.activeBackground': '#ffffff33',
      'editorWidget.background': '#141620',
      'editorWidget.border': '#ffffff14',
      'editorCursor.foreground': '#8a95f7',
    },
  })

  monaco.editor.defineTheme(MDT_LIGHT, {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': TRANSPARENT,
      'editorGutter.background': TRANSPARENT,
      'minimap.background': TRANSPARENT,
      'editorLineNumber.foreground': '#9aa0ad',
      'editorLineNumber.activeForeground': '#4b5162',
      'editor.lineHighlightBackground': '#0000000a',
      'editor.lineHighlightBorder': TRANSPARENT,
      'editor.selectionBackground': '#6d7cf533',
      'editorIndentGuide.background1': '#00000012',
      'editorIndentGuide.activeBackground1': '#00000026',
      'editorBracketMatch.background': '#6d7cf51f',
      'editorBracketMatch.border': '#6d7cf580',
      'scrollbarSlider.background': '#00000014',
      'scrollbarSlider.hoverBackground': '#00000026',
      'editorCursor.foreground': '#4f56e6',
    },
  })
}

/** Pick the MDT theme for the current resolved next-themes value (dark-default). */
export function mdtThemeName(resolvedTheme: string | undefined): string {
  return resolvedTheme === 'light' ? MDT_LIGHT : MDT_DARK
}
