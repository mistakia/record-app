// The keyboard model (STYLE.md § Keyboard Model) as one table: each row is
// a binding, its keys as the ? overlay and Settings show them, where it is
// live, and the key presses it answers. resolve_hotkey reads the same table,
// so the shown keys cannot drift from the bindings. Navigation sits behind
// the g lead (GO_KEYS), one key after it. Keys typed into a field, or while
// a dialog or menu is open, are never shortcuts; Escape is the one key that
// always reaches the app.

export type HotkeyAction =
  | 'cursor_down' | 'cursor_up' | 'cursor_first' | 'cursor_last'
  | 'extend_down' | 'extend_up' | 'extend_first' | 'extend_last' | 'toggle_selection'
  | 'play_cursor' | 'play_next' | 'add_to_queue' | 'tag' | 'adopt' | 'toggle_inspector' | 'open_menu'
  | 'adopt_playing' | 'open_playing_menu'
  | 'focus_search' | 'escape'
  | 'toggle_playback' | 'previous_track' | 'next_track' | 'seek_back' | 'seek_forward'
  | 'volume_down' | 'volume_up' | 'toggle_mute' | 'cycle_repeat' | 'toggle_shuffle' | 'toggle_queue'
  | 'previous_section' | 'next_section' | 'back' | 'forward' | 'go_settings' | 'import_files' | 'lead' | 'show_help' | 'show_shortcuts'

export interface KeyPress {
  key: string
  meta: boolean
  ctrl: boolean
  alt: boolean
  shift: boolean
  in_field: boolean
  dialog_open: boolean
  menu_open?: boolean
  // A track list is mounted, so the list's keys are live.
  list_shown: boolean
}

// One key press a binding answers. Letters match either case; shift 'any'
// is for keys a layout types with Shift, such as ?.
interface Combo {
  key: string
  command?: boolean
  shift?: boolean | 'any'
}

// Where a binding is live: 'list' keys only while a track list is mounted
// (it registers its commands, list-commands.ts), 'player' keys only while
// none is, where the same keys act on the playing track, and 'app' keys
// everywhere.
export type HotkeyScope = 'list' | 'player' | 'app'

export interface Hotkey {
  keys: string
  label: string
  action: HotkeyAction
  scope: HotkeyScope
  combos: Combo[]
}

const k = (key: string, modifiers: Omit<Combo, 'key'> = {}): Combo => ({ key, ...modifiers })

export const HOTKEYS: readonly Hotkey[] = [
  { keys: 'j or ↓', label: 'Move the cursor down', action: 'cursor_down', scope: 'list', combos: [k('j'), k('ArrowDown')] },
  { keys: 'k or ↑', label: 'Move the cursor up', action: 'cursor_up', scope: 'list', combos: [k('k'), k('ArrowUp')] },
  { keys: 'Home', label: 'First row', action: 'cursor_first', scope: 'list', combos: [k('Home')] },
  { keys: 'End', label: 'Last row', action: 'cursor_last', scope: 'list', combos: [k('End')] },
  { keys: 'Shift+j or Shift+↓', label: 'Extend the selection down', action: 'extend_down', scope: 'list', combos: [k('j', { shift: true }), k('ArrowDown', { shift: true })] },
  { keys: 'Shift+k or Shift+↑', label: 'Extend the selection up', action: 'extend_up', scope: 'list', combos: [k('k', { shift: true }), k('ArrowUp', { shift: true })] },
  { keys: 'Shift+Home', label: 'Extend the selection to the first row', action: 'extend_first', scope: 'list', combos: [k('Home', { shift: true })] },
  { keys: 'Shift+End', label: 'Extend the selection to the last row', action: 'extend_last', scope: 'list', combos: [k('End', { shift: true })] },
  { keys: 'x', label: 'Toggle the row in the selection', action: 'toggle_selection', scope: 'list', combos: [k('x')] },
  { keys: 'Enter', label: 'Play from the cursor; the list continues after the queue', action: 'play_cursor', scope: 'list', combos: [k('Enter')] },
  { keys: 'n', label: 'Play next', action: 'play_next', scope: 'list', combos: [k('n')] },
  { keys: 'q', label: 'Add to the end of the queue', action: 'add_to_queue', scope: 'list', combos: [k('q')] },
  { keys: 't', label: 'Tag the row or the selection', action: 'tag', scope: 'list', combos: [k('t')] },
  { keys: 'f', label: 'Adopt into your library', action: 'adopt', scope: 'list', combos: [k('f')] },
  { keys: 'i', label: 'Show or hide the details pane', action: 'toggle_inspector', scope: 'list', combos: [k('i')] },
  { keys: '. or Shift+F10', label: 'Open the row menu', action: 'open_menu', scope: 'list', combos: [k('.'), k('F10', { shift: true })] },
  { keys: 'f', label: 'Adopt the playing track into your library', action: 'adopt_playing', scope: 'player', combos: [k('f')] },
  { keys: '. or Shift+F10', label: 'Open the playing track’s menu', action: 'open_playing_menu', scope: 'player', combos: [k('.'), k('F10', { shift: true })] },
  { keys: '/ or Cmd+F', label: 'Search', action: 'focus_search', scope: 'app', combos: [k('/'), k('f', { command: true })] },
  { keys: 'Esc', label: 'Close the menu, then clear the search, the selection, the pane', action: 'escape', scope: 'app', combos: [k('Escape')] },
  { keys: 'Space', label: 'Play or pause', action: 'toggle_playback', scope: 'app', combos: [k(' ')] },
  { keys: 'Cmd+←', label: 'Previous track', action: 'previous_track', scope: 'app', combos: [k('ArrowLeft', { command: true })] },
  { keys: 'Cmd+→', label: 'Next track', action: 'next_track', scope: 'app', combos: [k('ArrowRight', { command: true })] },
  { keys: 'Shift+←', label: 'Seek back 5 seconds', action: 'seek_back', scope: 'app', combos: [k('ArrowLeft', { shift: true })] },
  { keys: 'Shift+→', label: 'Seek forward 5 seconds', action: 'seek_forward', scope: 'app', combos: [k('ArrowRight', { shift: true })] },
  { keys: '-', label: 'Volume down', action: 'volume_down', scope: 'app', combos: [k('-')] },
  { keys: '=', label: 'Volume up', action: 'volume_up', scope: 'app', combos: [k('='), k('+', { shift: 'any' })] },
  { keys: 'm', label: 'Mute or unmute', action: 'toggle_mute', scope: 'app', combos: [k('m')] },
  { keys: 'r', label: 'Cycle repeat: off, all, one', action: 'cycle_repeat', scope: 'app', combos: [k('r')] },
  { keys: 's', label: 'Shuffle on or off', action: 'toggle_shuffle', scope: 'app', combos: [k('s')] },
  { keys: 'Shift+Q', label: 'Show or hide the queue', action: 'toggle_queue', scope: 'app', combos: [k('q', { shift: true })] },
  { keys: '[', label: 'Previous section, on a page with a section index', action: 'previous_section', scope: 'app', combos: [k('[')] },
  { keys: ']', label: 'Next section, on a page with a section index', action: 'next_section', scope: 'app', combos: [k(']')] },
  { keys: 'Cmd+[', label: 'Back', action: 'back', scope: 'app', combos: [k('[', { command: true })] },
  { keys: 'Cmd+]', label: 'Forward', action: 'forward', scope: 'app', combos: [k(']', { command: true })] },
  { keys: 'g', label: 'Go to a page or a library: the next key says where', action: 'lead', scope: 'app', combos: [k('g')] },
  { keys: 'Cmd+,', label: 'Settings', action: 'go_settings', scope: 'app', combos: [k(',', { command: true })] },
  { keys: 'Cmd+O', label: 'Import files', action: 'import_files', scope: 'app', combos: [k('o', { command: true })] },
  { keys: 'Cmd+?', label: 'Help for this page', action: 'show_help', scope: 'app', combos: [k('?', { command: true, shift: 'any' }), k('/', { command: true, shift: true })] },
  { keys: '?', label: 'Show these shortcuts', action: 'show_shortcuts', scope: 'app', combos: [k('?', { shift: 'any' })] }
]

// The keys after g (STYLE.md § Keyboard Model): a page, or 1 to 9 for the
// sidebar's libraries in the order it lists them.
export type GoTarget = 'tracks' | 'listens' | 'library' | 'libraries' | 'import' | 'identity' | 'settings'

export const GO_KEYS: ReadonlyArray<{ key: string, label: string, target: GoTarget }> = [
  { key: 't', label: 'All tracks', target: 'tracks' },
  { key: 'r', label: 'Recently played', target: 'listens' },
  { key: 'l', label: 'My library', target: 'library' },
  { key: 'b', label: 'Libraries', target: 'libraries' },
  { key: 'i', label: 'Import', target: 'import' },
  { key: 'a', label: 'Identity', target: 'identity' },
  { key: ',', label: 'Settings', target: 'settings' }
]

export const MAX_JUMP_LABELS = 9

// The key after g: a page, a sidebar library by its 0-based place, or null,
// which closes the panel and does nothing.
export const resolve_go = (key: string): GoTarget | { library: number } | null => {
  const page = GO_KEYS.find((entry) => entry.key === key.toLowerCase())
  if (page !== undefined) return page.target
  const digit = /^[1-9]$/.test(key) ? Number(key) : 0
  return digit >= 1 && digit <= MAX_JUMP_LABELS ? { library: digit - 1 } : null
}

const LETTER = /^[a-z]$/i

const matches = (combo: Combo, press: KeyPress): boolean => {
  const command = press.meta || press.ctrl
  if ((combo.command ?? false) !== command) return false
  if (combo.shift !== 'any' && (combo.shift ?? false) !== press.shift) return false
  return LETTER.test(combo.key) ? press.key.toLowerCase() === combo.key : press.key === combo.key
}

// A text field, where keys are typing: no shortcut but Esc is live there,
// and nothing takes focus away from it.
export const is_field = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

export const resolve_hotkey = (press: KeyPress): HotkeyAction | null => {
  if (press.key === 'Escape') return press.dialog_open || press.menu_open === true ? null : 'escape'
  if (press.in_field || press.dialog_open || press.menu_open === true || press.alt) return null
  return HOTKEYS.find(({ scope, combos }) => (scope === 'app' || (scope === 'list') === press.list_shown) && combos.some((combo) => matches(combo, press)))?.action ?? null
}
