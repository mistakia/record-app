// The commands the shown list answers, registered while it is mounted, so
// a hotkey reaches the list without knowing which page holds it. A list
// declares the list actions it answers; a list key outside them falls
// through to the player and app keys (hotkeys.ts), so `f` on a list that
// adopts nothing still adopts the playing track.

import type { HotkeyAction } from '#renderer/hooks/hotkeys.ts'

export interface ListCommands {
  actions: ReadonlySet<HotkeyAction>
  // What a key does on this list where HOTKEYS' label (the track list's) does not say.
  labels?: Partial<Record<HotkeyAction, string>>
  move: (input: { by: number, extend: boolean }) => void
  move_to: (input: { edge: 'first' | 'last', extend: boolean }) => void
  toggle_selection: () => void
  // Enter on the cursor row.
  activate: () => void
  play_next?: () => void
  add_to_queue?: () => void
  tag?: () => void
  adopt?: () => void
  rename_labels?: () => void
  delete_labels?: () => void
  open_menu: () => void
  toggle_inspector: () => void
  // Esc, one layer at a time; false when there was nothing to close.
  escape: () => boolean
  focus: () => void
}

let active: ListCommands | null = null

export const register_list_commands = (commands: ListCommands): (() => void) => {
  active = commands
  return () => { if (active === commands) active = null }
}

export const list_commands = (): ListCommands | null => active
