// The one tooltip layer (STYLE.md § Tooltips), mounted once in the shell.
// Any element carrying data-tip (set through tip(), tooltip-logic.ts) gets a
// small paper tip with its label and, when a key also reaches it, the key:
// on hover after a short wait (none when a tip was just up), and at once on
// keyboard focus. A press, a key, a scroll, leaving the window, or the
// control leaving the page hides it. The tip is visual only; the control's
// aria-label stays its name.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import styles from './tooltip.module.css'
import { hotkey_text, place_tip, show_delay, TIP_WARM_MS } from './tooltip-logic.ts'
import { list_commands } from '#renderer/components/track/list-commands.ts'
import type { HotkeyAction } from '#renderer/hooks/hotkeys.ts'

interface Shown { anchor: HTMLElement, label: string, keys: string | null }

const tipped = (target: EventTarget | null): HTMLElement | null =>
  target instanceof Element ? target.closest<HTMLElement>('[data-tip]') : null

const read = (anchor: HTMLElement): Shown => {
  const hotkey = anchor.dataset.tipHotkey as HotkeyAction | undefined
  return {
    anchor,
    label: anchor.dataset.tip ?? '',
    keys: hotkey === undefined ? null : hotkey_text(hotkey, list_commands() !== null)
  }
}

export const TooltipLayer = () => {
  const [shown, set_shown] = useState<Shown | null>(null)
  const [visible, set_visible] = useState(false)
  const tip = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // The control under the pointer, the one whose tip is up, and the one
    // a press dismissed, which stays quiet until the pointer leaves it.
    let hovered: HTMLElement | null = null
    let showing: HTMLElement | null = null
    let pressed: HTMLElement | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    let warm_until = 0

    const observer = new MutationObserver(() => {
      if (showing === null) return
      if (!showing.isConnected || showing.dataset.tip === undefined) hide({ warm: false })
      else set_shown(read(showing))
    })

    const show = (anchor: HTMLElement): void => {
      clearTimeout(timer)
      if (!anchor.isConnected || anchor.dataset.tip === undefined || anchor.dataset.tip === '') return
      showing = anchor
      set_shown(read(anchor))
      set_visible(true)
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-tip', 'data-tip-hotkey'] })
    }

    const hide = ({ warm }: { warm: boolean }): void => {
      clearTimeout(timer)
      if (showing === null) return
      if (warm) warm_until = performance.now() + TIP_WARM_MS
      showing = null
      observer.disconnect()
      set_visible(false)
    }

    const on_pointerover = (event: PointerEvent): void => {
      const anchor = tipped(event.target)
      if (anchor === hovered) return
      const was_showing = showing !== null
      hide({ warm: true })
      hovered = anchor
      pressed = null
      if (anchor === null) return
      const delay = was_showing ? 0 : show_delay({ now: performance.now(), warm_until })
      if (delay === 0) show(anchor)
      else timer = setTimeout(() => { if (hovered === anchor && pressed !== anchor) show(anchor) }, delay)
    }
    const on_pointerout = (event: PointerEvent): void => {
      if (event.relatedTarget !== null) return
      hovered = null
      hide({ warm: true })
    }
    const on_pointerdown = (): void => {
      pressed = hovered
      hide({ warm: false })
    }
    const on_focusin = (event: FocusEvent): void => {
      const anchor = tipped(event.target)
      if (anchor !== null && event.target instanceof Element && event.target.matches(':focus-visible')) show(anchor)
    }
    const on_focusout = (event: FocusEvent): void => {
      if (showing !== null && showing !== hovered && event.target instanceof Node && showing.contains(event.target)) hide({ warm: false })
    }
    const dismiss = (): void => { hide({ warm: false }) }
    const on_blur = (): void => {
      hovered = null
      hide({ warm: false })
    }

    document.addEventListener('pointerover', on_pointerover)
    document.addEventListener('pointerout', on_pointerout)
    document.addEventListener('pointerdown', on_pointerdown, true)
    document.addEventListener('focusin', on_focusin)
    document.addEventListener('focusout', on_focusout)
    document.addEventListener('keydown', dismiss, true)
    document.addEventListener('scroll', dismiss, true)
    window.addEventListener('blur', on_blur)
    return () => {
      clearTimeout(timer)
      observer.disconnect()
      document.removeEventListener('pointerover', on_pointerover)
      document.removeEventListener('pointerout', on_pointerout)
      document.removeEventListener('pointerdown', on_pointerdown, true)
      document.removeEventListener('focusin', on_focusin)
      document.removeEventListener('focusout', on_focusout)
      document.removeEventListener('keydown', dismiss, true)
      document.removeEventListener('scroll', dismiss, true)
      window.removeEventListener('blur', on_blur)
    }
  }, [])

  // Placed once the label has rendered, so its size is known.
  useLayoutEffect(() => {
    const element = tip.current
    if (shown === null || element === null || !visible) return
    const anchor = shown.anchor.getBoundingClientRect()
    const { left, top } = place_tip({
      anchor: { left: anchor.left, top: anchor.top, width: anchor.width, height: anchor.height },
      tip: { width: element.offsetWidth, height: element.offsetHeight },
      viewport: { width: window.innerWidth, height: window.innerHeight }
    })
    element.style.transform = `translate(${left}px, ${top}px)`
  }, [shown, visible])

  return (
    <div ref={tip} className={styles.tip} data-visible={visible} data-testid='tooltip' aria-hidden='true'>
      {shown?.label}
      {shown?.keys != null && <kbd className={styles.key}>{shown.keys}</kbd>}
    </div>
  )
}
