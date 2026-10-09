import { useEffect, type RefObject } from 'react'

// STYLE.md § Window: the inspector closes itself when the page column falls
// under 720px, so the list is never squeezed beside it.
const MIN_PAGE_COLUMN = 720

export const use_inspector_fit = ({ body, open, close }: { body: RefObject<HTMLElement | null>, open: boolean, close: () => void }): void => {
  useEffect(() => {
    const element = body.current
    if (!open || element === null) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined && entry.contentRect.width < MIN_PAGE_COLUMN) close()
    })
    observer.observe(element)
    return () => { observer.disconnect() }
  })
}
