// The HOTKEYS table, as the ? overlay and Settings › Shortcuts both show it,
// so neither can drift from the bindings: grouped by where a key is live,
// with the keys after g as their own group. Given the mounted list, the
// overlay shows its keys first, only the ones it answers and under its own
// labels, and the playing track's keys only where no list key takes them.

import styles from './shortcut-table.module.css'
import { GO_KEYS, HOTKEYS, is_live, type Hotkey, type HotkeyScope } from '#renderer/hooks/hotkeys.ts'
import type { ListCommands } from '#renderer/components/track/list-commands.ts'

const GROUPS: Record<HotkeyScope, string> = { list: 'In a list', player: 'On the playing track', app: 'Everywhere' }

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

export const ShortcutTable = ({ list = null }: { list?: Pick<ListCommands, 'actions' | 'labels'> | null }) => {
  const order: HotkeyScope[] = list === null ? ['app', 'player', 'list'] : ['list', 'app', 'player']
  const rows = (scope: HotkeyScope) => HOTKEYS
    .filter((hotkey) => hotkey.scope === scope && (list === null || is_live(hotkey, list.actions)))
    .map((hotkey) => ({ keys: hotkey.keys, label: list?.labels?.[hotkey.action] ?? hotkey.label }))
  return (
    <div className={styles.groups} data-testid='shortcut-table'>
      {order.map((scope) => <Group key={scope} title={GROUPS[scope]} rows={rows(scope)} />)}
      <Group title='After g' rows={[...GO_KEYS.map(({ key, label }) => ({ keys: key, label })), { keys: '1–9', label: 'A library, by its number in the sidebar' }]} />
    </div>
  )
}
