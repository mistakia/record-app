// A modal dialog on the native <dialog> element, which traps focus and
// closes on Escape.

import { useEffect, useRef, type ReactNode } from 'react'

import styles from './dialog.module.css'

export const Dialog = ({ open, title, on_close, children }: {
  open: boolean
  title: string
  on_close: () => void
  children: ReactNode
}) => {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog === null) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault()
        on_close()
      }}
    >
      {open && (
        <>
          <h2 className={styles.title}>{title}</h2>
          {children}
        </>
      )}
    </dialog>
  )
}
