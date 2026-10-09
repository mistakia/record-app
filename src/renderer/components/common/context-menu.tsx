// The paper context menu (STYLE.md § Dialogs, context menu, toasts): at the
// pointer or a row, flipped at the window edges, keyboard-reachable with the
// arrows, each item with its shortcut. It closes on a choice, Escape, a
// click elsewhere, a scroll, or the window losing focus, and hands focus
// back to the track list.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import styles from './context-menu.module.css'
import { list_commands } from '#renderer/components/track/list-commands.ts'

export interface MenuItem {
  label: string
  on_select: () => void
  disabled?: boolean
  // Right-aligned in tertiary: the key that does the same.
  shortcut?: string
  // A checkable item, as in the column menu.
  checked?: boolean
}

const EDGE_MARGIN = 8

export const ContextMenu = ({ x, y, items, on_close }: { x: number, y: number, items: MenuItem[], on_close: () => void }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [position, set_position] = useState({ left: x, top: y })
  // Callers pass a fresh closure each render; the listeners stay put.
  const close_ref = useRef(on_close)
  close_ref.current = on_close

  // Flipped to the other side of the point when it would cross an edge.
  useLayoutEffect(() => {
    const menu = ref.current
    if (menu === null) return
    const { width, height } = menu.getBoundingClientRect()
    const left = x + width + EDGE_MARGIN > window.innerWidth ? Math.max(EDGE_MARGIN, x - width) : x
    const top = y + height + EDGE_MARGIN > window.innerHeight ? Math.max(EDGE_MARGIN, y - height) : y
    set_position({ left, top })
  }, [x, y, items.length])

  useEffect(() => {
    const menu = ref.current
    const on_close = () => { close_ref.current() }
    menu?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
    const close_outside = (event: MouseEvent) => {
      if (menu !== null && !menu.contains(event.target as Node)) on_close()
    }
    const on_keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        on_close()
        return
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'j' && event.key !== 'k') return
      event.preventDefault()
      event.stopPropagation()
      const buttons = [...(menu?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
      const at = buttons.indexOf(document.activeElement as HTMLButtonElement)
      const by = event.key === 'ArrowDown' || event.key === 'j' ? 1 : -1
      buttons[(at + by + buttons.length) % buttons.length]?.focus()
    }
    window.addEventListener('mousedown', close_outside)
    window.addEventListener('keydown', on_keydown, true)
    window.addEventListener('scroll', on_close, true)
    window.addEventListener('blur', on_close)
    return () => {
      window.removeEventListener('mousedown', close_outside)
      window.removeEventListener('keydown', on_keydown, true)
      window.removeEventListener('scroll', on_close, true)
      window.removeEventListener('blur', on_close)
      // Back to the list, unless the chosen item moved focus somewhere of its
      // own, as the inline tag adder does.
      if (document.activeElement === null || document.activeElement === document.body) list_commands()?.focus()
    }
  }, [])

  return (
    <div ref={ref} className={styles.menu} role='menu' style={position} data-testid='context-menu'>
      {items.map((item) => (
        <button
          key={item.label}
          type='button'
          role={item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
          aria-keyshortcuts={item.shortcut}
          aria-checked={item.checked}
          disabled={item.disabled === true}
          onClick={() => {
            on_close()
            item.on_select()
          }}
        >
          {item.checked !== undefined && <span className={styles.check} aria-hidden='true'>{item.checked ? '✓' : ''}</span>}
          <span className={styles.label}>{item.label}</span>
          {item.shortcut !== undefined && <kbd className={styles.shortcut} aria-hidden='true'>{item.shortcut}</kbd>}
        </button>
      ))}
    </div>
  )
}
