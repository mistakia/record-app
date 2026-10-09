// A modal dialog on the native <dialog> element, which traps focus and
// closes on Escape (STYLE.md § Dialogs): the title seated on the frame's top
// stroke with an [x] notch, a 15px body, buttons right-aligned. Closing
// hands focus back to the track list.

import { useEffect, useRef, type ReactNode } from 'react'

import styles from './dialog.module.css'
import { list_commands } from '#renderer/components/track/list-commands.ts'

export const Dialog = ({ open, title, on_close, children, wide = false }: {
  open: boolean
  title: string
  on_close: () => void
  children: ReactNode
  wide?: boolean
}) => {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog === null) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) {
      dialog.close()
      list_commands()?.focus()
    }
  }, [open])

  // Unmounted while open, as when its owner goes away.
  useEffect(() => () => { list_commands()?.focus() }, [])

  return (
    <dialog
      ref={ref}
      className={wide ? `${styles.dialog} ${styles.wide}` : styles.dialog}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault()
        on_close()
      }}
    >
      {open && (
        <>
          <header className={styles.stroke}>
            <h2 className={styles.title}>{title}</h2>
            <button type='button' className={styles.close} aria-label='Close' onClick={on_close}>[x]</button>
          </header>
          <div className={styles.body}>{children}</div>
        </>
      )}
    </dialog>
  )
}
