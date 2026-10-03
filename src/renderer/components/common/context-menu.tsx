// A context menu at the pointer. It closes on a choice, Escape, a click
// elsewhere, or a scroll.

import { useEffect, useRef } from 'react'

import styles from './context-menu.module.css'

export interface MenuItem {
  label: string
  on_select: () => void
  disabled?: boolean
}

export const ContextMenu = ({ x, y, items, on_close }: { x: number, y: number, items: MenuItem[], on_close: () => void }) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.querySelector('button')?.focus()
    const close_outside = (event: MouseEvent) => {
      if (ref.current !== null && !ref.current.contains(event.target as Node)) on_close()
    }
    const close_on_escape = (event: KeyboardEvent) => { if (event.key === 'Escape') on_close() }
    window.addEventListener('mousedown', close_outside)
    window.addEventListener('keydown', close_on_escape)
    window.addEventListener('scroll', on_close, true)
    window.addEventListener('blur', on_close)
    return () => {
      window.removeEventListener('mousedown', close_outside)
      window.removeEventListener('keydown', close_on_escape)
      window.removeEventListener('scroll', on_close, true)
      window.removeEventListener('blur', on_close)
    }
  }, [on_close])

  // Kept inside the window near the right and bottom edges.
  const left = Math.min(x, window.innerWidth - 220)
  const top = Math.min(y, window.innerHeight - items.length * 30 - 16)
  return (
    <div ref={ref} className={styles.menu} role='menu' style={{ left, top }} data-testid='context-menu'>
      {items.map((item) => (
        <button
          key={item.label}
          type='button'
          role='menuitem'
          disabled={item.disabled === true}
          onClick={() => {
            on_close()
            item.on_select()
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
