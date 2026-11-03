import { useCallback } from 'react'

/**
 * Pointer-tracked specular highlight for `.glass-sheen` surfaces: writes the
 * pointer position to --mx/--my, which the ::after radial gradient follows.
 * Spread the result onto the element: `<div className="glass-sheen" {...sheen}>`.
 */
export function useGlassSheen<T extends HTMLElement>() {
  const onPointerMove = useCallback((e: React.PointerEvent<T>) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }, [])
  return { onPointerMove }
}
