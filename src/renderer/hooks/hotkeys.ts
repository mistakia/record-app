// The keyboard model (STYLE.md § Keyboard Model) as one table: each row is
// a binding, its keys as the ? overlay and Settings show them, and the key
// presses it answers. resolve_hotkey reads the same table, so the shown
// keys cannot drift from the bindings. Keys typed into a field, or while a
// dialog or menu is open, are never shortcuts; Escape is the one key that
// always reaches the app.

export type HotkeyAction =
  | 'cursor_down' | 'cursor_up' | 'cursor_first' | 'cursor_last'
  | 'extend_down' | 'extend_up' | 'extend_first' | 'extend_last' | 'toggle_selection'
  | 'play_cursor' | 'play_next' | 'add_to_queue' | 'tag' | 'adopt' | 'toggle_inspector' | 'open_menu'
  | 'focus_search' | 'escape'
  | 'toggle_playback' | 'previous_track' | 'next_track' | 'seek_back' | 'seek_forward'
  | 'volume_down' | 'volume_up' | 'cycle_repeat' | 'toggle_shuffle' | 'toggle_queue'
  | 'back' | 'forward' | 'go_home' | 'go_library' | 'go_identity' | 'go_settings' | 'import_files' | 'show_shortcuts'

export interface KeyPress {
  key: string
  meta: boolean
  ctrl: boolean
  alt: boolean
  shift: boolean
  in_field: boolean
  dialog_open: boolean
  menu_open?: boolean
}

// One key press a binding answers. Letters match either case; shift 'any'
// is for keys a layout types with Shift, such as ?.
interface Combo {
  key: string
  command?: boolean
  shift?: boolean | 'any'
}

export interface Hotkey {
  keys: string
  label: string
  action: HotkeyAction
  combos: Combo[]
}

const k = (key: string, modifiers: Omit<Combo, 'key'> = {}): Combo => ({ key, ...modifiers })

export const HOTKEYS: readonly Hotkey[] = [
  { keys: 'j or ↓', label: 'Move the cursor down', action: 'cursor_down', combos: [k('j'), k('ArrowDown')] },
  { keys: 'k or ↑', label: 'Move the cursor up', action: 'cursor_up', combos: [k('k'), k('ArrowUp')] },
  { keys: 'Home', label: 'First row', action: 'cursor_first', combos: [k('Home')] },
  { keys: 'End', label: 'Last row', action: 'cursor_last', combos: [k('End')] },
  { keys: 'Shift+j or Shift+↓', label: 'Extend the selection down', action: 'extend_down', combos: [k('j', { shift: true }), k('ArrowDown', { shift: true })] },
  { keys: 'Shift+k or Shift+↑', label: 'Extend the selection up', action: 'extend_up', combos: [k('k', { shift: true }), k('ArrowUp', { shift: true })] },
  { keys: 'Shift+Home', label: 'Extend the selection to the first row', action: 'extend_first', combos: [k('Home', { shift: true })] },
  { keys: 'Shift+End', label: 'Extend the selection to the last row', action: 'extend_last', combos: [k('End', { shift: true })] },
  { keys: 'x', label: 'Toggle the row in the selection', action: 'toggle_selection', combos: [k('x')] },
  { keys: 'Enter', label: 'Play from the cursor; the list continues after the queue', action: 'play_cursor', combos: [k('Enter')] },
  { keys: 'n', label: 'Play next', action: 'play_next', combos: [k('n')] },
  { keys: 'q', label: 'Add to the end of the queue', action: 'add_to_queue', combos: [k('q')] },
  { keys: 't', label: 'Tag the row or the selection', action: 'tag', combos: [k('t')] },
  { keys: 'f', label: 'Adopt into your library', action: 'adopt', combos: [k('f')] },
  { keys: 'i', label: 'Show or hide the details pane', action: 'toggle_inspector', combos: [k('i')] },
  { keys: '. or Shift+F10', label: 'Open the row menu', action: 'open_menu', combos: [k('.'), k('F10', { shift: true })] },
  { keys: '/ or Cmd+F', label: 'Search', action: 'focus_search', combos: [k('/'), k('f', { command: true })] },
  { keys: 'Esc', label: 'Close the menu, then clear the search, the selection, the pane', action: 'escape', combos: [k('Escape')] },
  { keys: 'Space', label: 'Play or pause', action: 'toggle_playback', combos: [k(' ')] },
  { keys: 'Cmd+←', label: 'Previous track', action: 'previous_track', combos: [k('ArrowLeft', { command: true })] },
  { keys: 'Cmd+→', label: 'Next track', action: 'next_track', combos: [k('ArrowRight', { command: true })] },
  { keys: 'Shift+←', label: 'Seek back 5 seconds', action: 'seek_back', combos: [k('ArrowLeft', { shift: true })] },
  { keys: 'Shift+→', label: 'Seek forward 5 seconds', action: 'seek_forward', combos: [k('ArrowRight', { shift: true })] },
  { keys: '-', label: 'Volume down', action: 'volume_down', combos: [k('-')] },
  { keys: '=', label: 'Volume up', action: 'volume_up', combos: [k('='), k('+', { shift: 'any' })] },
  { keys: 'r', label: 'Cycle repeat: off, all, one', action: 'cycle_repeat', combos: [k('r')] },
  { keys: 's', label: 'Shuffle on or off', action: 'toggle_shuffle', combos: [k('s')] },
  { keys: 'Shift+Q', label: 'Show or hide the queue', action: 'toggle_queue', combos: [k('q', { shift: true })] },
  { keys: 'Cmd+[', label: 'Back', action: 'back', combos: [k('[', { command: true })] },
  { keys: 'Cmd+]', label: 'Forward', action: 'forward', combos: [k(']', { command: true })] },
  { keys: 'h', label: 'All tracks', action: 'go_home', combos: [k('h')] },
  { keys: 'l', label: 'My library', action: 'go_library', combos: [k('l')] },
  { keys: 'a', label: 'Identity', action: 'go_identity', combos: [k('a')] },
  { keys: ', or Cmd+,', label: 'Settings', action: 'go_settings', combos: [k(','), k(',', { command: true })] },
  { keys: 'Cmd+O', label: 'Import files', action: 'import_files', combos: [k('o', { command: true })] },
  { keys: '?', label: 'Show these shortcuts', action: 'show_shortcuts', combos: [k('?', { shift: 'any' })] }
]

const LETTER = /^[a-z]$/i

const matches = (combo: Combo, press: KeyPress): boolean => {
  const command = press.meta || press.ctrl
  if ((combo.command ?? false) !== command) return false
  if (combo.shift !== 'any' && (combo.shift ?? false) !== press.shift) return false
  return LETTER.test(combo.key) ? press.key.toLowerCase() === combo.key : press.key === combo.key
}

export const resolve_hotkey = (press: KeyPress): HotkeyAction | null => {
  if (press.key === 'Escape') return press.dialog_open || press.menu_open === true ? null : 'escape'
  if (press.in_field || press.dialog_open || press.menu_open === true || press.alt) return null
  return HOTKEYS.find(({ combos }) => combos.some((combo) => matches(combo, press)))?.action ?? null
}
