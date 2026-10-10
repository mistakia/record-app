// The commands the player bar's now-playing block answers, registered while
// the bar is shown, so f and . reach the playing track off a track list.

export interface NowPlayingCommands {
  adopt: () => void
  open_menu: () => void
}

let active: NowPlayingCommands | null = null

export const register_now_playing_commands = (commands: NowPlayingCommands): (() => void) => {
  active = commands
  return () => { if (active === commands) active = null }
}

export const now_playing_commands = (): NowPlayingCommands | null => active
