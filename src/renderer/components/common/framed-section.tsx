// Base's tui-section (STYLE.md § Framed section): a hairline frame with its
// title seated on the top stroke, and controls on the stroke beside it. A
// foldable section folds to one rule line with its count, and remembers.

import { useId, type ReactNode } from 'react'

import styles from './framed-section.module.css'
import { use_view_pref } from '#renderer/prefs/view-prefs.ts'

export const FramedSection = ({ title, children, controls, fold_id, default_open = true, count, testid, width = 'form' }: {
  title: string
  children: ReactNode
  // Border-hosted controls: [+], [x], a count.
  controls?: ReactNode | undefined
  // Makes the section foldable, its fold state kept under this id.
  fold_id?: string | undefined
  default_open?: boolean
  count?: number | undefined
  testid?: string | undefined
  width?: 'form' | 'full'
}) => {
  const body_id = useId()
  const [open, set_open] = use_view_pref(`fold:${fold_id ?? ''}`, default_open)
  const is_open = fold_id === undefined || open
  const title_node = fold_id === undefined
    ? <span className={styles.title}>{title}</span>
    : (
      <button type='button' className={styles.toggle} aria-expanded={is_open} aria-controls={body_id} onClick={() => { set_open(!is_open) }}>
        <span className={styles.chevron} aria-hidden='true'>▶</span>
        {title}
        {count !== undefined && <span className={styles.count}>{count}</span>}
      </button>
      )

  if (!is_open) {
    return (
      <section className={`${styles.folded} ${width === 'full' ? styles.full : ''}`} data-testid={testid}>
        {title_node}
        <span className={styles.rule} aria-hidden='true' />
      </section>
    )
  }
  return (
    <section className={`${styles.frame} ${width === 'full' ? styles.full : ''}`} data-testid={testid}>
      <header className={styles.stroke}>
        {title_node}
        {fold_id === undefined && count !== undefined && <span className={styles.count}>{count}</span>}
        {controls !== undefined && <span className={styles.controls}>{controls}</span>}
      </header>
      <div id={body_id} className={styles.body}>{children}</div>
    </section>
  )
}
