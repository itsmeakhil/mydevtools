"use client"

import { useEffect, useRef } from "react"
import { Crepe } from "@milkdown/crepe"

import "@milkdown/crepe/theme/common/style.css"
import "@milkdown/crepe/theme/nord.css"
import "./crepe-theme.css"

export interface NoteMarkdownEditorProps {
    /** Initial markdown. The editor is uncontrolled after mount — change the
     *  `key` (e.g. on note switch) to load different content. */
    defaultValue?: string
    readOnly?: boolean
    placeholder?: string
    /** Fires (debounced by the editor's own listener) with the full markdown
     *  document on every change. */
    onChange?: (markdown: string) => void
    /** Upload a pasted/dropped/selected image and return its URL. */
    onUploadImage?: (file: File) => Promise<string>
}

/**
 * Markdown editor for Notes, built on Milkdown Crepe. Stores and emits plain
 * markdown (what gets saved to `Note.content`).
 *
 * MUST be loaded with `dynamic(..., { ssr: false })` — Crepe/ProseMirror are
 * DOM-only. (NotesPage already loads NotionEditor that way, so this is covered.)
 */
export function NoteMarkdownEditor({
    defaultValue = "",
    readOnly = false,
    placeholder = "Write something, or press '/' for commands…",
    onChange,
    onUploadImage,
}: NoteMarkdownEditorProps) {
    const rootRef = useRef<HTMLDivElement>(null)
    // Keep the latest callbacks reachable without re-creating the editor.
    const onChangeRef = useRef(onChange)
    const onUploadRef = useRef(onUploadImage)
    useEffect(() => {
        onChangeRef.current = onChange
        onUploadRef.current = onUploadImage
    })

    useEffect(() => {
        const root = rootRef.current
        if (!root) return

        let destroyed = false
        let crepe: Crepe | null = null

        const upload = async (file: File): Promise<string> => {
            if (!onUploadRef.current) return ""
            return onUploadRef.current(file)
        }

        crepe = new Crepe({
            root,
            defaultValue,
            featureConfigs: {
                [Crepe.Feature.Placeholder]: { text: placeholder },
                // Slash menu's Advanced group: drop the "Image" entry but keep
                // Code / Table / Math (empty objects retain their defaults).
                // (Paste/drop image insertion via ImageBlock still works.)
                [Crepe.Feature.BlockEdit]: {
                    advancedGroup: {
                        image: null,
                        codeBlock: {},
                        table: {},
                        math: {},
                    },
                },
                [Crepe.Feature.ImageBlock]: {
                    onUpload: upload,
                    blockOnUpload: upload,
                    inlineOnUpload: upload,
                },
            },
        })

        crepe.on((api) => {
            api.markdownUpdated((_ctx, markdown) => {
                onChangeRef.current?.(markdown)
            })
        })

        crepe
            .create()
            .then(() => {
                if (destroyed) {
                    void crepe?.destroy()
                    return
                }
                crepe?.setReadonly(readOnly)
            })
            .catch((err) => {
                console.error("[NoteMarkdownEditor] failed to create editor", err)
            })

        return () => {
            destroyed = true
            void crepe?.destroy()
            crepe = null
        }
        // Create the editor exactly once per mount, capturing the initial
        // `defaultValue`. Loading different content (note switch, template apply)
        // is done by changing the React `key` so the component fully remounts —
        // this avoids destroying/recreating the editor (and losing the cursor)
        // every time the parent's saved content updates mid-edit.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return <div ref={rootRef} className="note-markdown-editor" />
}

export default NoteMarkdownEditor
