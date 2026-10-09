// The HOTKEYS table, as the ? overlay and Settings › Shortcuts both show it,
// so neither can drift from the bindings.

import styles from './shortcut-table.module.css'
import { HOTKEYS } from '#renderer/hooks/hotkeys.ts'

export const ShortcutTable = () => (
  <dl className={styles.table} data-testid='shortcut-table'>
    {HOTKEYS.map(({ keys, label }) => (
      <div key={label} className={styles.row}>
        <dt>{keys.split(' or ').map((key, index) => <span key={key}>{index > 0 && <span className={styles.or}> or </span>}<kbd>{key}</kbd></span>)}</dt>
        <dd>{label}</dd>
      </div>
    ))}
  </dl>
)
