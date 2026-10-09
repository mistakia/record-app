// Base's "show X" strip (STYLE.md § Progressive Disclosure): grouped
// secondary detail behind a full-width hairline strip, closed by default.

import { useId, useState, type ReactNode } from 'react'

import styles from './show-strip.module.css'

export const ShowStrip = ({ label, children, testid }: { label: string, children: ReactNode, testid?: string }) => {
  const [open, set_open] = useState(false)
  const body_id = useId()
  return (
    <div className={styles.strip_wrap} data-testid={testid}>
      <button type='button' className={styles.strip} aria-expanded={open} aria-controls={body_id} onClick={() => { set_open(!open) }}>
        <span className={styles.chevron} aria-hidden='true'>▶</span>
        {open ? 'hide' : 'show'} {label}
      </button>
      {open && <div id={body_id} className={styles.body}>{children}</div>}
    </div>
  )
}
