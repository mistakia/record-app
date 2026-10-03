// The keyboard shortcuts, as a pure lookup so they can be tested. Keys typed
// into a field or while a dialog is open are never shortcuts.

export type HotkeyAction = 'toggle_playback' | 'next_track' | 'previous_track' | 'focus_search'

export interface KeyPress {
  key: string
  meta: boolean
  ctrl: boolean
  alt: boolean
  shift: boolean
  in_field: boolean
  dialog_open: boolean
}

export const HOTKEYS: Array<{ keys: string, action: HotkeyAction, label: string }> = [
  { keys: 'Space', action: 'toggle_playback', label: 'Play or pause' },
  { keys: 'Cmd+Right', action: 'next_track', label: 'Next track' },
  { keys: 'Cmd+Left', action: 'previous_track', label: 'Previous track' },
  { keys: 'Cmd+F or /', action: 'focus_search', label: 'Search tracks' }
]

export const resolve_hotkey = (press: KeyPress): HotkeyAction | null => {
  if (press.in_field || press.dialog_open || press.alt) return null
  const command = press.meta || press.ctrl
  if (press.key === ' ' && !command && !press.shift) return 'toggle_playback'
  if (command && press.key === 'ArrowRight') return 'next_track'
  if (command && press.key === 'ArrowLeft') return 'previous_track'
  if ((command && press.key.toLowerCase() === 'f') || (!command && press.key === '/')) return 'focus_search'
  return null
}
