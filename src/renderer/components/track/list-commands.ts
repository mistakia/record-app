// The commands the shown track list answers, registered while it is
// mounted, so a hotkey reaches the list without knowing which page holds it.

export interface ListCommands {
  move: (input: { by: number, extend: boolean }) => void
  move_to: (input: { edge: 'first' | 'last', extend: boolean }) => void
  toggle_selection: () => void
  play: () => void
  play_next: () => void
  add_to_queue: () => void
  tag: () => void
  adopt: () => void
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
