import type { ReactNode } from 'react'

import styles from './dialog.module.css'

// A dialog's buttons, right-aligned (STYLE.md § Dialogs).
export const DialogActions = ({ children }: { children: ReactNode }) => <div className={styles.actions}>{children}</div>
