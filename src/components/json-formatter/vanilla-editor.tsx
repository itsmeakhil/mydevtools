'use client'

import { useEffect, useRef } from 'react'
import { JSONEditor, JSONEditorPropsOptional } from 'vanilla-jsoneditor'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import 'vanilla-jsoneditor/themes/jse-theme-dark.css'

interface VanillaEditorProps extends JSONEditorPropsOptional {
  className?: string
}

export function VanillaEditor({ className = '', ...props }: VanillaEditorProps) {
  const refContainer = useRef<HTMLDivElement>(null)
  const refEditor = useRef<JSONEditor | null>(null)
  const { theme, systemTheme } = useTheme()

  const currentTheme = theme === 'system' ? systemTheme : theme

  useEffect(() => {
    // create editor
    if (refContainer.current && !refEditor.current) {
      refEditor.current = new JSONEditor({
        target: refContainer.current,
        props,
      })
    }

    return () => {
      // destroy editor
      if (refEditor.current) {
        refEditor.current.destroy()
        refEditor.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        'jse-app-theme h-full w-full',
        currentTheme === 'dark' && 'jse-theme-dark',
        className
      )}
    />
  )
}
