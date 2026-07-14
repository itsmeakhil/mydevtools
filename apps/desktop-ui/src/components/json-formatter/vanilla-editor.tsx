'use client'

import { useEffect, useRef, useState } from 'react'
import type { JSONEditorPropsOptional } from 'vanilla-jsoneditor'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import 'vanilla-jsoneditor/themes/jse-theme-dark.css'

export type VanillaEditorInstance = ReturnType<typeof import('vanilla-jsoneditor').JSONEditor>

interface VanillaEditorProps extends JSONEditorPropsOptional {
  className?: string
  onEditorReady?: (editor: VanillaEditorInstance | null) => void
}

export function VanillaEditor({ className = '', onEditorReady, ...props }: VanillaEditorProps) {
  const refContainer = useRef<HTMLDivElement>(null)
  const refEditor = useRef<ReturnType<typeof import('vanilla-jsoneditor').JSONEditor> | null>(null)
  const propsRef = useRef(props)
  propsRef.current = props
  const onEditorReadyRef = useRef(onEditorReady)
  onEditorReadyRef.current = onEditorReady
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDarkTheme = mounted && resolvedTheme === 'dark'

  useEffect(() => {
    let disposed = false
    // vanilla-jsoneditor is ~485KB; load it on mount so the tool page paints without it.
    void import('vanilla-jsoneditor').then(({ JSONEditor }) => {
      if (disposed || !refContainer.current || refEditor.current) return
      refEditor.current = JSONEditor({
        target: refContainer.current,
        props: propsRef.current,
      })
      onEditorReadyRef.current?.(refEditor.current)
    })

    return () => {
      // destroy editor
      disposed = true
      if (refEditor.current) {
        refEditor.current.destroy()
        refEditor.current = null
        onEditorReadyRef.current?.(null)
      }
    }
  }, [])

  // update props
  useEffect(() => {
    if (refEditor.current) {
      refEditor.current.updateProps(props)
    }
  }, [props])

  return (
    <div
      ref={refContainer}
      className={cn(
        'jse-app-theme h-full w-full bg-card text-foreground',
        isDarkTheme && 'jse-theme-dark',
        className
      )}
    />
  )
}
