// A line of chips that never clips one (STYLE.md § Tag chips): the chips
// that fit whole, then a +N chip for the rest. Hovering +N, or pressing it,
// opens a paper popover with every chip, wrapped; the pointer can move into
// it, and the chips there act as they do on the line. Esc, a click
// elsewhere, a scroll, or leaving both closes it. The track row's tags and
// the now-playing block's share it.

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type SyntheticEvent } from 'react'
import { createPortal } from 'react-dom'

import styles from './overflow-chips.module.css'
import { fit_count } from './overflow-chips-logic.ts'
import { place_tip, TIP_DELAY_MS } from './tooltip-logic.ts'

export interface Chip { key: string, content: ReactNode }

// The pointer may cross the gap between +N and the popover this long
// before the popover goes.
const LEAVE_GRACE_MS = 150

// Events from the portalled popover still bubble through React to the row
// or the bar around +N; they stop here.
const contain = (event: SyntheticEvent): void => { event.stopPropagation() }

export const OverflowChips = ({ chips, className, chip_class, more_class, label, focusable = false }: {
  chips: readonly Chip[]
  // The line's own look (gap, margin) and its chips', where it sits.
  className: string | undefined
  chip_class: string | undefined
  more_class?: string | undefined
  // Names what the chips are, for the popover: `Tags`.
  label: string
  // A row's controls stay out of the tab order; the player bar's are in it.
  focusable?: boolean
}) => {
  const line = useRef<HTMLSpanElement>(null)
  const more = useRef<HTMLSpanElement>(null)
  const popover = useRef<HTMLDivElement>(null)
  const [shown, set_shown] = useState(chips.length)
  // Open by hover goes when the pointer leaves; open by press stays.
  const [open, set_open] = useState<'hover' | 'pressed' | null>(null)
  const [position, set_position] = useState<{ left: number, top: number } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  // The chips' identity: a new set is measured again, a re-render is not.
  const keys = chips.map(({ key }) => key).join('\n')

  // Every chip stays in the line, the folded ones out of the flow and
  // unseen, so their widths can be read whenever the line's width changes.
  useLayoutEffect(() => {
    const node = line.current
    if (node === null) return
    const measure = (): void => {
      const items = [...node.querySelectorAll<HTMLElement>(':scope > [data-chip]')]
      const gap = Number.parseFloat(getComputedStyle(node).columnGap) || 0
      const next = fit_count({
        widths: items.map((item) => item.offsetWidth),
        gap,
        available: node.clientWidth,
        more_width: more.current?.offsetWidth ?? 0
      })
      set_shown(next)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => { observer.disconnect() }
  }, [keys])

  const hidden = Math.max(0, chips.length - shown)
  const close = (): void => {
    clearTimeout(timer.current)
    set_open(null)
  }

  // Placed as a tip is: under +N, or above it in the bottom quarter.
  useLayoutEffect(() => {
    if (open === null || more.current === null || popover.current === null) {
      set_position(null)
      return
    }
    const anchor = more.current.getBoundingClientRect()
    const { width, height } = popover.current.getBoundingClientRect()
    const { left, top } = place_tip({ anchor, tip: { width, height }, viewport: { width: window.innerWidth, height: window.innerHeight } })
    set_position({ left, top })
  }, [open, keys])

  useEffect(() => {
    if (open === null) return
    const outside = (event: MouseEvent): void => {
      const target = event.target as Node
      if (popover.current?.contains(target) !== true && more.current?.contains(target) !== true) close()
    }
    const escape = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      close()
    }
    const scrolled = (event: Event): void => { if (popover.current?.contains(event.target as Node) !== true) close() }
    window.addEventListener('mousedown', outside)
    window.addEventListener('keydown', escape, true)
    window.addEventListener('scroll', scrolled, true)
    window.addEventListener('blur', close)
    return () => {
      window.removeEventListener('mousedown', outside)
      window.removeEventListener('keydown', escape, true)
      window.removeEventListener('scroll', scrolled, true)
      window.removeEventListener('blur', close)
    }
  }, [open])

  // Nothing left to disclose (a tag removed, the line widened): it closes.
  useEffect(() => { if (hidden === 0) close() }, [hidden])
  useEffect(() => () => { clearTimeout(timer.current) }, [])

  const enter = (): void => {
    clearTimeout(timer.current)
    if (open === null) timer.current = setTimeout(() => { set_open('hover') }, TIP_DELAY_MS)
  }
  const leave = (): void => {
    clearTimeout(timer.current)
    if (open !== 'pressed') timer.current = setTimeout(() => { set_open(null) }, LEAVE_GRACE_MS)
  }

  return (
    <span ref={line} className={[styles.line, className].join(' ')}>
      {chips.map(({ key, content }, index) => (
        <span key={key} data-chip='' className={index < shown ? chip_class : [chip_class, styles.folded].join(' ')}>
          {content}
        </span>
      ))}
      <span
        ref={more}
        className={[chip_class, styles.more, more_class, hidden === 0 ? styles.folded : undefined].join(' ')}
        // Wide enough for +N at its widest, so the fit never flips on a digit.
        style={{ minWidth: `calc(${String(chips.length).length + 1}ch + 14px)` }}
      >
        <button
          type='button'
          data-variant='glyph'
          tabIndex={focusable && hidden > 0 ? 0 : -1}
          aria-label={`${hidden} more ${label.toLowerCase()}, show all ${chips.length}`}
          aria-expanded={open !== null}
          aria-haspopup='dialog'
          data-testid='chips-more'
          onMouseEnter={enter}
          onMouseLeave={leave}
          onClick={(event) => {
            event.stopPropagation()
            clearTimeout(timer.current)
            set_open(open === 'pressed' ? null : 'pressed')
          }}
          onDoubleClick={contain}
        >
          +{hidden}
        </button>
      </span>
      {open !== null && createPortal(
        <div
          ref={popover}
          className={styles.popover}
          role='dialog'
          aria-label={label}
          data-testid='chips-popover'
          style={position === null ? { visibility: 'hidden' } : position}
          onMouseEnter={() => { clearTimeout(timer.current) }}
          onMouseLeave={leave}
          onClick={(event) => {
            event.stopPropagation()
            // A chip acted on (a filter, a removal) is done with the popover.
            if (event.target instanceof Element && event.target.closest('button') !== null) close()
          }}
          onDoubleClick={contain}
          onMouseDown={contain}
          onContextMenu={contain}
        >
          <span className={styles.label}>{label} · {chips.length}</span>
          <span className={styles.all}>
            {chips.map(({ key, content }) => <span key={key} className={styles.chip}>{content}</span>)}
          </span>
        </div>,
        document.body
      )}
    </span>
  )
}
