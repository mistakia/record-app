// The HOTKEYS table, as the ? overlay and Settings › Shortcuts both show it,
// so neither can drift from the bindings: grouped by where a key is live,
// with the keys after g as their own group. `list_first` puts the track
// list's keys first, for the overlay over a page that shows one.

import styles from './shortcut-table.module.css'
import { GO_KEYS, HOTKEYS, type Hotkey, type HotkeyScope } from '#renderer/hooks/hotkeys.ts'

const GROUPS: Record<HotkeyScope, string> = { list: 'In a track list', app: 'Everywhere' }

const Keys = ({ keys }: { keys: string }) => (
  <dt>{keys.split(' or ').map((key, index) => <span key={key}>{index > 0 && <span className={styles.or}> or </span>}<kbd>{key}</kbd></span>)}</dt>
)

const Group = ({ title, rows }: { title: string, rows: ReadonlyArray<Pick<Hotkey, 'keys' | 'label'>> }) => (
  <section className={styles.group}>
    <h3 className={styles.title}>{title}</h3>
    <dl className={styles.table}>
      {rows.map(({ keys, label }) => (
        <div key={label} className={styles.row}><Keys keys={keys} /><dd>{label}</dd></div>
      ))}
    </dl>
  </section>
)

export const ShortcutTable = ({ list_first = false }: { list_first?: boolean }) => {
  const order: HotkeyScope[] = list_first ? ['list', 'app'] : ['app', 'list']
  return (
    <div className={styles.groups} data-testid='shortcut-table'>
      {order.map((scope) => <Group key={scope} title={GROUPS[scope]} rows={HOTKEYS.filter((hotkey) => hotkey.scope === scope)} />)}
      <Group title='After g' rows={[...GO_KEYS.map(({ key, label }) => ({ keys: key, label })), { keys: '1–9', label: 'A library, by its number in the sidebar' }]} />
    </div>
  )
}
