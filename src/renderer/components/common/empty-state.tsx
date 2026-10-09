// An empty state that teaches (STYLE.md § Empty states): a display-face
// headline, one line of what to do, and the action that resolves it.

import type { ReactNode } from 'react'

import styles from './empty-state.module.css'

export const EmptyState = ({ headline, detail, action, testid }: { headline: string, detail: string, action?: ReactNode, testid?: string }) => (
  <div className={styles.empty} data-testid={testid}>
    <p className={styles.headline}>{headline}</p>
    <p className={styles.detail}>{detail}</p>
    {action !== undefined && <div className={styles.action}>{action}</div>}
  </div>
)
