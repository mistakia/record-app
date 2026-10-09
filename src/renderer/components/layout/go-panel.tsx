// The g lead's panel (STYLE.md § Keyboard Model): while it is up, the next
// key goes to a page, or 1 to 9 to a library the sidebar numbers. The keys
// themselves are handled in use-hotkeys.ts; this only shows them.

import styles from './go-panel.module.css'
import { GO_KEYS } from '#renderer/hooks/hotkeys.ts'
import { use_app_selector } from '#renderer/store/index.ts'

export const GoPanel = () => {
  const open = use_app_selector((state) => state.ui.lead_open)
  if (!open) return null
  return (
    <div className={styles.panel} role='dialog' aria-label='Go to' data-testid='go-panel'>
      <p className={styles.title}>g then</p>
      <dl className={styles.keys}>
        {GO_KEYS.map(({ key, label }) => (
          <div key={key} className={styles.row}><dt><kbd>{key}</kbd></dt><dd>{label}</dd></div>
        ))}
        <div className={styles.row}><dt><kbd>1</kbd>–<kbd>9</kbd></dt><dd>A library, by its number in the sidebar</dd></div>
        <div className={styles.row}><dt><kbd>Esc</kbd></dt><dd>Stay here</dd></div>
      </dl>
    </div>
  )
}
